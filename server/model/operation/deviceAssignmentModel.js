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
  assignCalculatorToDevice,
  unassignCalculatorFromDevice
} from "../../services/flespiApis.js";
import {
  saveCalculatorAssignments,
} from "../calculatorAssignments.js";

const uniqueByCalcId = (rows = []) => {
  const map = new Map();
  for (const row of rows) {
    if (!row?.calc_id) continue;
    map.set(Number(row.calc_id), row);
  }
  return Array.from(map.values());
};


export const createDeviceAssignment = async ({ device_id, operation_id, zone_id }) => {
  const sql = `
    INSERT INTO device_assignments (device_id, operation_id, zone_id, created_at, updated_at)
    VALUES (?, ?, ?, NOW(), NOW())
  `;

  try {
    const opId = Number(operation_id);
    const requestedZoneId = Number(zone_id);
    const hasRequestedZone =
      Number.isFinite(requestedZoneId) && requestedZoneId > 0;

    const [device] = await dbQuery(
      "SELECT flespiId, traccarId, name, category FROM new_settings_devices WHERE id = ?",
      [device_id]
    );
    const operationZones = await dbQuery(
      `
        SELECT id, flespi_geofence_id, name
        FROM zones
        WHERE operationId = ?
        ORDER BY id ASC
      `,
      [opId]
    );

    if (!device) throw new Error(`Device ${device_id} not found`);
    if (!operationZones || operationZones.length === 0) {
      throw new Error(`No zones found for operation ${opId}`);
    }

    let zone = null;
    let effectiveZoneId = null;

    if (hasRequestedZone) {
      zone =
        operationZones.find((z) => Number(z.id) === requestedZoneId) || null;
      if (!zone) {
        zone = operationZones[0];
        effectiveZoneId = Number(zone.id);
        console.warn(
          `Requested zone ${requestedZoneId} not found in operation ${opId}; using zone ${effectiveZoneId}`
        );
      } else {
        effectiveZoneId = requestedZoneId;
      }
    } else {
      zone = operationZones[0];
      effectiveZoneId = Number(zone.id);
      console.warn(
        `No zone_id provided; using first zone ${effectiveZoneId} for operation ${opId}`
      );
    }

    const values = [Number(device_id), opId, effectiveZoneId];

    const flespiId = device.flespiId;
    const geofenceId = zone?.flespi_geofence_id || null;

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

    // Assign all operation/zone calculators created for this operation.
    if (flespiId) {
      const existingRows = await dbQuery(
        `
          SELECT DISTINCT calc_id
          FROM calculator_assignments
          WHERE operation_id = ?
            AND device_flespi_id = ?
        `,
        [operation_id, flespiId]
      );
      const existingCalcIds = new Set(
        (existingRows || []).map((row) => Number(row.calc_id))
      );

      const opScopeCalcsRaw = await dbQuery(
        `
          SELECT DISTINCT calc_id, calc_type
          FROM calculator_assignments
          WHERE operation_id = ?
            AND device_flespi_id IS NULL
        `,
        [operation_id]
      );
      const toAssignShared = uniqueByCalcId(opScopeCalcsRaw).filter(
        (row) => !existingCalcIds.has(Number(row.calc_id))
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
        console.log(
          `Existing operation/zone calculators assigned: ${sharedAssignmentsToSave.length} (device ${device_id})`
        );
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
    const [assignment] = await dbQuery(
      "SELECT operation_id, zone_id FROM device_assignments WHERE device_id = ? AND zone_id = ?",
      [device_id, zone_id]
    );
    if (!assignment) return false;

    const [device] = await dbQuery(
      "SELECT flespiId, name FROM new_settings_devices WHERE id = ?",
      [device_id]
    );
    const [zone] = await dbQuery(
      "SELECT flespi_geofence_id, name FROM zones WHERE id = ?",
      [zone_id]
    );

    const calcRowsForZone = await dbQuery(
      `SELECT DISTINCT calc_id
       FROM calculator_assignments
       WHERE device_id = ? AND zone_id = ?`,
      [device_id, zone_id]
    );
    const calcIdsForZone = (calcRowsForZone || [])
      .map((row) => Number(row.calc_id))
      .filter((id) => Number.isFinite(id));

    const sql = `
      DELETE FROM device_assignments
      WHERE device_id = ? AND zone_id = ?
    `;
    const result = await dbQuery(sql, [device_id, zone_id]);

    const geofenceId = zone?.flespi_geofence_id || null;
    if (device?.flespiId && geofenceId) {
      console.log(`Unassigning geofence ${geofenceId} from device ${device.flespiId}`);
      await unassignGeofenceFromDevice(device.flespiId, geofenceId);
      console.log(`Unassigned geofence ${geofenceId} from device ${device.name}`);
    } else {
      console.warn("Missing Flespi ID or geofence ID, skipping Flespi unassignment.");
    }

    await dbQuery(
      "DELETE FROM calculator_assignments WHERE device_id = ? AND zone_id = ?",
      [device_id, zone_id]
    );

    for (const calcId of calcIdsForZone) {
      const [stillAssigned] = await dbQuery(
        `SELECT id
         FROM calculator_assignments
         WHERE device_id = ? AND calc_id = ?
         LIMIT 1`,
        [device_id, calcId]
      );
      if (stillAssigned || !device?.flespiId) continue;
      try {
        await unassignCalculatorFromDevice(device.flespiId, calcId);
      } catch (err) {
        console.warn(
          `Failed to unassign calculator ${calcId} from device ${device.flespiId}:`,
          err.response?.data || err.message
        );
      }
    }

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


















