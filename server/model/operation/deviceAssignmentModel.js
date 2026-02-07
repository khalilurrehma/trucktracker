// server/model/operation/deviceAssignmentModel.js
import pool from "../../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);
import {
  assignGeofenceToDevice,
  unassignGeofenceFromDevice,
  fetchCalcData,
  fetchGeofenceDevices,
  fetchDevicePositions,
  createFlespiCalculator,
  assignCalculatorToDevice,
  deleteFlespiCalculator
} from "../../services/flespiApis.js";
import { getCalculatorTemplatesByType } from "../calculatorTemplates.js";
import {
  saveCalculatorAssignments,
  getCalculatorIdsByDeviceZone,
  deleteCalculatorAssignmentsByDeviceZone
} from "../calculatorAssignments.js";
import {
  loadCalculatorTemplateConfig,
  sanitizeCalculatorConfig
} from "../../utils/calculatorTemplates.js";

const vehicleCalculatorNames = [
  "CALC_LOAD_PAD",
  "CALC_DUMP_AREA",
  "CALC_QUEUE_AREA",
  "CALC_TRIP_L2D",
  "CALC_TRIP_D2L",
  "CALC_TRIP_CYCLE",
  "DAILY_VEHICLE_REPORT"
];

const loaderCalculatorNames = [
  "CALC_LOADERS_PAD"
];
const sharedOperationCalcTypes = new Set([
  "DAILY_VEHICLE_REPORT",
]);

const filterTemplatesByName = (templates, allowedNames) => {
  if (!Array.isArray(templates)) return [];
  if (!Array.isArray(allowedNames) || allowedNames.length === 0) return templates;
  const allowed = new Set(allowedNames);
  return templates.filter((template) => allowed.has(template?.name));
};

const isLoaderCategory = (category) => {
  if (!category) return false;
  return String(category).toLowerCase().includes("loader");
};


export const createDeviceAssignment = async ({ device_id, operation_id, zone_id }) => {
  const sql = `
    INSERT INTO device_assignments (device_id, operation_id, zone_id, created_at, updated_at)
    VALUES (?, ?, ?, NOW(), NOW())
  `;
  const effectiveZoneId = Number(zone_id ?? operation_id);
  const values = [Number(device_id), Number(operation_id), effectiveZoneId];

  try {
    const [device] = await dbQuery(
      "SELECT flespiId, traccarId, name, category FROM new_settings_devices WHERE id = ?",
      [device_id]
    );
    const [operation] = await dbQuery(
      "SELECT name FROM operations WHERE id = ?",
      [operation_id]
    );
    const [zone] = await dbQuery(
      "SELECT flespi_geofence_id, name FROM zones WHERE id = ?",
      [effectiveZoneId]
    );
    const [operationGeofence] = await dbQuery(
      "SELECT flespi_geofence_id, name FROM operations WHERE id = ?",
      [effectiveZoneId]
    );

    if (!device) throw new Error(`Device ${device_id} not found`);
    if (!zone && !operationGeofence) throw new Error(`Zone ${effectiveZoneId} not found`);

    const flespiId = device.flespiId;
    const geofenceId = zone?.flespi_geofence_id || operationGeofence?.flespi_geofence_id;

    const result = await dbQuery(sql, values);
    const newAssignment = { id: result.insertId, device_id, operation_id, zone_id: effectiveZoneId };

    console.log("Device Assignment Created:", newAssignment);

    if (flespiId && geofenceId) {
      console.log(`Assigning Flespi Geofence ${geofenceId} -> Device ${flespiId}`);
      await assignGeofenceToDevice(flespiId, geofenceId);
      console.log(`Assigned geofence ${geofenceId} to device ${device.name} (${flespiId})`);
    } else {
      console.warn(`Missing flespiId or geofenceId for device ${device_id} / zone ${effectiveZoneId}`);
    }

    // Assign ALL operation zone geofences to the device so geofence() works for calcs
    if (flespiId) {
      const opZones = await dbQuery(
        "SELECT flespi_geofence_id FROM zones WHERE operationId = ?",
        [operation_id]
      );
      const opZoneGeofences = opZones
        .map((z) => z.flespi_geofence_id)
        .filter(Boolean);
      const uniqueGeofences = Array.from(new Set(opZoneGeofences));
      for (const geoId of uniqueGeofences) {
        try {
          console.log(`Assigning operation zone geofence ${geoId} -> Device ${flespiId}`);
          await assignGeofenceToDevice(flespiId, geoId);
        } catch (err) {
          console.warn(
            `Failed to assign zone geofence ${geoId} to device ${flespiId}:`,
            err.response?.data || err.message
          );
        }
      }
    }

    const templates = await getCalculatorTemplatesByType("DEVICE");
    console.log(`DEVICE templates found: ${templates.length} (device ${device_id})`);
    const assignments = [];
    const operationName = operation?.name || "operation";
    const zoneName = zone?.name || operationGeofence?.name || operationName || "zone";
    const isLoader = isLoaderCategory(device?.category);
    let isFirstVehicle = false;

    if (!isLoader) {
      const [vehicleCountRow] = await dbQuery(
        `
          SELECT COUNT(*) AS vehicleCount
          FROM device_assignments da
          JOIN new_settings_devices d ON da.device_id = d.id
          WHERE da.operation_id = ?
            AND d.id <> ?
            AND (d.category IS NULL OR LOWER(d.category) NOT LIKE '%loader%')
        `,
        [operation_id, device_id]
      );
      isFirstVehicle = Number(vehicleCountRow?.vehicleCount || 0) === 0;
    }

    const allowedNames = isLoader
      ? [...loaderCalculatorNames]
      : [...vehicleCalculatorNames];

    const filteredTemplates = filterTemplatesByName(templates, allowedNames);

    for (const template of filteredTemplates) {
      try {
        const config = await loadCalculatorTemplateConfig(template.file_path);
        const cleanedConfig = sanitizeCalculatorConfig(config);
        const templateLabel = template?.name || `template-${template?.id || "unknown"}`;
        const calcName = `DEVICE-${device.name}-${operationName}-${zoneName}-${templateLabel}`.slice(0, 200);
        cleanedConfig.name = calcName;
        const calc = await createFlespiCalculator(cleanedConfig);
        await assignCalculatorToDevice(flespiId, calc.id);
        assignments.push({
          calc_id: calc.id,
          calc_type: template?.name || null,
          device_id,
          device_flespi_id: flespiId,
          operation_id,
          zone_id: effectiveZoneId,
        });
      } catch (err) {
        console.error(`Error creating/assigning calculator for DEVICE (${template?.name || "template"}):`, err.message);
      }
    }

    if (assignments.length > 0) {
      await saveCalculatorAssignments(assignments);
      console.log(`DEVICE calculators created/assigned: ${assignments.length} (device ${device_id})`);
    }

    // Reuse selected operation-level calculators (create once per operation, assign to each device).
    if (flespiId) {
      const opSharedCalcs = await dbQuery(
        `
          SELECT DISTINCT calc_id, calc_type
          FROM calculator_assignments
          WHERE operation_id = ?
            AND device_flespi_id IS NULL
        `,
        [operation_id]
      );

      const toAssignShared = opSharedCalcs.filter((row) =>
        sharedOperationCalcTypes.has(row?.calc_type)
      );

      const sharedAssignmentsToSave = [];

      for (const row of toAssignShared) {
        try {
          await assignCalculatorToDevice(flespiId, row.calc_id);
          sharedAssignmentsToSave.push({
            calc_id: row.calc_id,
            calc_type: row.calc_type || null,
            device_id,
            device_flespi_id: flespiId,
            operation_id,
            zone_id: effectiveZoneId,
          });
          console.log(
            `Assigned shared operation calc ${row.calc_id} (${row.calc_type}) -> device ${flespiId}`
          );
        } catch (err) {
          console.warn(
            `Failed to assign shared operation calc ${row.calc_id} to device ${flespiId}:`,
            err.response?.data || err.message
          );
        }
      }

      if (sharedAssignmentsToSave.length > 0) {
        await saveCalculatorAssignments(sharedAssignmentsToSave);
      }
    }

    return newAssignment;
  } catch (err) {
    console.error("Error in createDeviceAssignment:", err.message);
    throw err;
  }
};
// Get all assignments
export const getAllAssignments = async () => {
  const sql = `
    SELECT 
      da.*, 
      d.name AS device_name,
      d.flespiId AS flespi_device_id,  
      z.name AS zone_name, 
      o.name AS operation_name
    FROM device_assignments da
    LEFT JOIN new_settings_devices d ON da.device_id = d.id
    LEFT JOIN zones z ON da.zone_id = z.id
    LEFT JOIN operations o ON da.operation_id = o.id
    ORDER BY da.created_at DESC
  `;
  return await dbQuery(sql);
};


// ✅ Get assignment by ID
export const getAssignmentById = async (id) => {
  const sql = `
    SELECT * FROM device_assignments WHERE id = ?
  `;
  const [result] = await dbQuery(sql, [id]);
  return result || null;
};


// ✅ Mark assignment completed
export const markAssignmentCompleted = async (id) => {
  const sql = `
    UPDATE device_assignments
    SET completed_at = NOW(), updated_at = NOW()
    WHERE id = ?
  `;
  const result = await dbQuery(sql, [id]);
  return result.affectedRows > 0;
};

// ✅ Delete assignment
export const deleteDeviceAssignment = async (device_id, zone_id) => {
  try {
    const [device] = await dbQuery(
      "SELECT flespiId, name FROM new_settings_devices WHERE id = ?",
      [device_id]
    );
    const [zone] = await dbQuery(
      "SELECT flespi_geofence_id, name FROM zones WHERE id = ?",
      [zone_id]
    );
    const [operationGeofence] = await dbQuery(
      "SELECT flespi_geofence_id, name FROM operations WHERE id = ?",
      [zone_id]
    );

    const sql = `
      DELETE FROM device_assignments
      WHERE device_id = ? AND zone_id = ?
    `;
    const result = await dbQuery(sql, [device_id, zone_id]);

    const geofenceId = zone?.flespi_geofence_id || operationGeofence?.flespi_geofence_id;
    if (device?.flespiId && geofenceId) {
      console.log(`Unassigning geofence ${geofenceId} from device ${device.flespiId}`);
      await unassignGeofenceFromDevice(device.flespiId, geofenceId);
      console.log(`Unassigned geofence ${geofenceId} from device ${device.name}`);
    } else {
      console.warn("Missing Flespi ID or geofence ID, skipping Flespi unassignment.");
    }

    const calcIds = await getCalculatorIdsByDeviceZone(device_id, zone_id);
    for (const calcId of calcIds) {
      try {
        await deleteFlespiCalculator(calcId);
      } catch (err) {
        console.error(`Error deleting calculator ${calcId}:`, err.message);
      }
    }
    await deleteCalculatorAssignmentsByDeviceZone(device_id, zone_id);

    return result.affectedRows > 0;
  } catch (err) {
    console.error("DB error deleting assignment:", err.message);
    throw err;
  }
};

export const getOperationCalculatorData = async (calcId, deviceId) => {
  try {
    if (!calcId || !deviceId) {
      console.warn(`Skipping calc fetch: missing calcId/deviceId (calcId=${calcId}, deviceId=${deviceId})`);
      return null;
    }
    const data = await fetchCalcData(calcId, deviceId);
    return data;
  } catch (err) {
    console.error("Model error in getOperationCalculatorData:", err.message);
    throw err;
  }
};


export const getPositions = async (deviceIds) => {
  try {
    const data = await fetchDevicePositions(deviceIds);
    return data;
  } catch (err) {
    console.error("❌ Model error in getPositions:", err.message);
    throw err;
  }
};
export const getDevicesByGeofence = async (geofenceId) => {
  try {
    const data = await fetchGeofenceDevices(geofenceId);
    return data;
  } catch (err) {
    console.error("❌ Model error in getDevicesByGeofence:", err.message);
    throw err;
  }
};
export const getDevicesByOperation = async (operationId) => {
  try {
    if (!operationId) throw new Error("Missing operationId");

    // 1. Fetch assigned devices
    const sql = `
      SELECT 
        da.*, 
        d.name AS device_name,
        d.category AS category,
        d.flespiId AS flespi_device_id,
      z.name AS zone_name, 
      o.name AS operation_name
    FROM device_assignments da
    LEFT JOIN new_settings_devices d ON da.device_id = d.id
    LEFT JOIN zones z ON da.zone_id = z.id
    LEFT JOIN operations o ON da.operation_id = o.id
    WHERE da.operation_id = ?
    ORDER BY da.created_at DESC
  `;

    const devices = await dbQuery(sql, [operationId]);

    // If no devices, return empty
    if (!devices || devices.length === 0) {
      return [];
    }
    const deviceIds = devices
      .map((d) => d.flespiId || d.flespi_device_id)
      .filter((id) => !!id);

    console.log("Device IDs:", deviceIds);

    // 3. Fetch positions
    let positions = [];

    if (deviceIds.length > 0) {
      const posData = await fetchDevicePositions(deviceIds);
      positions = posData || [];
    }

    console.log("Positions:", positions);

    // 4. Merge positions into device objects
    const positionsById = new Map(
      positions
        .filter((p) => p && p.flespiDeviceId != null)
        .map((p) => [String(p.flespiDeviceId), p])
    );

    const devicesWithPositions = devices.map((d) => {
      const flespiId = d.flespiId || d.flespi_device_id;
      const key = flespiId != null ? String(flespiId) : null;
      const pos = key ? positionsById.get(key) : null;

      return {
        ...d,
        lat: pos?.latitude ?? null,
        lon: pos?.longitude ?? null,
      };
    });

    // 5. Final response
    return devicesWithPositions;

  } catch (err) {
    console.error("❌ Model error in getDevicesByOperation:", err.message);
    throw err;
  }
};


















