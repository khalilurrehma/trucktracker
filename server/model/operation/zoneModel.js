import pool from "../../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

import {
  createFlespiGeofence,
  updateFlespiGeofence,
  deleteFlespiGeofence,
  deleteFlespiCalculator,
  createFlespiCalculator,
  assignCalculatorToGeofence,
  assignCalculatorToDevice
} from "../../services/flespiApis.js";
import {
  deleteCalculatorAssignmentsByGeofenceId,
  deleteCalculatorAssignmentsByZoneId,
  getCalculatorIdsByGeofenceId,
  getCalculatorIdsByZoneId,
  saveCalculatorAssignments,
} from "../calculatorAssignments.js";
import { getCalculatorTemplatesByType } from "../calculatorTemplates.js";
import { loadCalculatorTemplateConfig, sanitizeCalculatorConfig } from "../../utils/calculatorTemplates.js";

const zoneCalculatorNameMap = {
  LOAD_PAD: ["CALC_LOAD_PAD", "CALC_LOADERS_PAD"],
  DUMP_AREA: ["CALC_DUMP_AREA"],
  QUEUE_AREA: ["CALC_QUEUE_AREA"],
  ZONE_AREA: ["CALC_TRIP_CYCLE", "ZONE_CALCULATOR"],
};

const filterTemplatesByName = (templates, allowedNames) => {
  if (!Array.isArray(templates)) return [];
  if (!Array.isArray(allowedNames) || allowedNames.length === 0) return templates;
  const allowed = new Set(allowedNames);
  return templates.filter((template) => allowed.has(template?.name));
};

// Utility: convert GeoJSON geometry to Flespi format
function toFlespiGeometry(geometry) {
  if (!geometry) return null;

  const geo = typeof geometry === "string" ? JSON.parse(geometry) : geometry;

  if (
    geo.type &&
    geo.type.toLowerCase() === "circle" &&
    Array.isArray(geo.coordinates) &&
    geo.coordinates.length >= 2 &&
    geo.radius !== undefined
  ) {
    const [lon, lat] = geo.coordinates;
    return {
      type: "circle",
      center: { lat: parseFloat(lat), lon: parseFloat(lon) },
      radius: parseFloat(geo.radius),
    };
  }

  // Already a Flespi polygon shape
  if (geo.path) return geo;

  if (
    geo.type &&
    geo.coordinates &&
    Array.isArray(geo.coordinates) &&
    Array.isArray(geo.coordinates[0])
  ) {
    return {
      type: "polygon",
      path: geo.coordinates[0].map(([lon, lat]) => ({ lat, lon })),
    };
  }

  // Unknown geometry format; return as-is to avoid crashing
  return geo;
}

// ======================================================
// CREATE ZONE → also create Flespi geofence
// ======================================================
const deleteCalculatorsByIds = async (calcIds) => {
  const uniqueIds = Array.from(new Set(calcIds)).filter((id) => id != null);
  for (const calcId of uniqueIds) {
    try {
      await deleteFlespiCalculator(calcId);
    } catch (err) {
      console.error(`Error deleting calculator ${calcId}:`, err.message);
    }
  }
};

const assignCalculatorsToOperationDevices = async ({ operationId, assignments }) => {
  if (!Array.isArray(assignments) || assignments.length === 0) return;

  const devices = await dbQuery(
    `
      SELECT DISTINCT da.device_id, d.flespiId AS device_flespi_id
      FROM device_assignments da
      JOIN new_settings_devices d ON d.id = da.device_id
      WHERE da.operation_id = ?
        AND d.flespiId IS NOT NULL
    `,
    [operationId]
  );

  if (!devices || devices.length === 0) return;

  const existingRows = await dbQuery(
    `
      SELECT calc_id, device_flespi_id
      FROM calculator_assignments
      WHERE operation_id = ?
        AND device_flespi_id IS NOT NULL
    `,
    [operationId]
  );
  const existing = new Set(
    (existingRows || []).map(
      (row) => `${Number(row.calc_id)}:${Number(row.device_flespi_id)}`
    )
  );

  const rowsToSave = [];
  for (const assignment of assignments) {
    for (const device of devices) {
      const calcId = Number(assignment.calc_id);
      const deviceFlespiId = Number(device.device_flespi_id);
      if (!Number.isFinite(calcId) || !Number.isFinite(deviceFlespiId)) continue;

      const key = `${calcId}:${deviceFlespiId}`;
      if (existing.has(key)) continue;

      try {
        await assignCalculatorToDevice(deviceFlespiId, calcId);
        rowsToSave.push({
          calc_id: calcId,
          calc_type: assignment.calc_type || null,
          device_id: device.device_id,
          device_flespi_id: deviceFlespiId,
          operation_id: operationId,
          zone_id: assignment.zone_id ?? null,
          geofence_flespi_id: assignment.geofence_flespi_id ?? null,
        });
        existing.add(key);
      } catch (err) {
        console.warn(
          `Failed to assign calculator ${calcId} to device ${deviceFlespiId}:`,
          err.response?.data || err.message
        );
      }
    }
  }

  if (rowsToSave.length > 0) {
    await saveCalculatorAssignments(rowsToSave);
  }
};

export const createZone = async (zone) => {
  const {
    operationId,
    name,
    zoneType,
    geometry,
    area_sqm,
    area_ha,
    ideal_queue_duration_m,
    max_vehicles_count,
    dump_area_max_duration_min,
    load_pad_max_duration_min,
    zone_max_speed_kmh,
    zone_bank_volume_m3,
    zone_bank_swell_factor,
    load_pad_type,
    material_type,
    dump_area_type,
    queue_type,
  } = zone;

  const sql = `
    INSERT INTO zones
    (operationId, name, zoneType, geometry, area_sqm, area_ha,
     ideal_queue_duration_m, max_vehicles_count, dump_area_max_duration_min, load_pad_max_duration_min,
     zone_max_speed_kmh, zone_bank_volume_m3, zone_bank_swell_factor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    operationId,
    name,
    zoneType,
    JSON.stringify(geometry),
    area_sqm,
    area_ha,
    zoneType === "QUEUE_AREA" ? ideal_queue_duration_m : null,
    zoneType === "QUEUE_AREA" ? max_vehicles_count : null,
    zoneType === "DUMP_AREA" ? dump_area_max_duration_min : null,
    zoneType === "LOAD_PAD" ? load_pad_max_duration_min : null,
    zoneType === "ZONE_AREA" ? zone_max_speed_kmh : null,
    zoneType === "ZONE_AREA" ? zone_bank_volume_m3 : null,
    zoneType === "ZONE_AREA" ? zone_bank_swell_factor : null,
  ];

  try {
    const results = await dbQuery(sql, values);
    const zoneId = results.insertId;
    const [opRow] = await dbQuery("SELECT name FROM operations WHERE id = ?", [operationId]);
    const operationName = opRow?.name || `operation-${operationId}`;

    const flespiGeometry = toFlespiGeometry(geometry);

    let metadata = {
      op_id: operationId,
      zone_type: zoneType,
      area_ha,
      color:
        zoneType === "QUEUE_AREA"
          ? "#a855f7"
          : zoneType === "DUMP_AREA"
            ? "#3b82f6"
            : zoneType === "LOAD_PAD"
              ? "#ef4444"
              : "#facc15",
    };

    if (zoneType === "QUEUE_AREA") {
      metadata = {
        ...metadata,
        ideal_queue_duration_m,
        max_vehicles_count,
        queue_type: queue_type ?? null,
      };
    }

    if (zoneType === "DUMP_AREA") {
      metadata = {
        ...metadata,
        dump_area_max_duration_min,
        dump_area_type: dump_area_type ?? null,
      };
    }

    if (zoneType === "LOAD_PAD") {
      metadata = {
        ...metadata,
        load_pad_max_duration_min,
        load_pad_type: load_pad_type ?? null,
        material_type: material_type ?? null,
      };
    }

    if (zoneType === "ZONE_AREA") {
      metadata = {
        ...metadata,
        zone_max_speed_kmh,
        zone_bank_volume_m3,
        zone_bank_swell_factor,
      };
    }

    const geofence = await createFlespiGeofence([
      {
        name: `${name} - ${operationName} - LIQ`,
        priority: zoneType === "ZONE_AREA" ? 10 : 5,
        enabled: true,
        geometry: flespiGeometry,
        metadata,
      },
    ]);

    const geofenceId = geofence[0]?.id;
    const templates = await getCalculatorTemplatesByType(zoneType);
    const filteredTemplates = filterTemplatesByName(
      templates,
      zoneCalculatorNameMap[zoneType]
    );
    const assignmentsToSave = [];

    for (const template of filteredTemplates) {
      try {
        const config = await loadCalculatorTemplateConfig(template.file_path);
        const cleanedConfig = sanitizeCalculatorConfig(config);
        const templateLabel = template?.name || `template-${template?.id || "unknown"}`;
        const calcName = `${templateLabel} - ${name} - ${operationName} - LIQ`.slice(0, 200);
        cleanedConfig.name = calcName;
        const calc = await createFlespiCalculator(cleanedConfig);
        await assignCalculatorToGeofence(calc.id, geofenceId);
        assignmentsToSave.push({
          calc_id: calc.id,
          calc_type: template?.name || null,
          operation_id: operationId,
          zone_id: zoneId,
          geofence_flespi_id: geofenceId,
        });
      } catch (err) {
        console.error(`Error creating/assigning calculator for ${zoneType} (${template?.name || 'template'}):`, err.message);
      }
    }

    if (assignmentsToSave.length > 0) {
      await saveCalculatorAssignments(assignmentsToSave);
      await assignCalculatorsToOperationDevices({
        operationId,
        assignments: assignmentsToSave,
      });
    }

    await dbQuery(
      "UPDATE zones SET flespi_geofence_id = ? WHERE id = ?",
      [geofenceId, zoneId]
    );

    return { id: zoneId, flespi_geofence_id: geofenceId, ...zone };
  } catch (err) {
    console.error("Error creating zone or geofence:", err.message);
    throw err;
  }
};

// ======================================================
// UPDATE ZONE → also update Flespi geofence
// ======================================================
export const updateZone = async (id, zone) => {
  const {
    name,
    zoneType,
    geometry,
    area_sqm,
    area_ha,

    ideal_queue_duration_m,
    max_vehicles_count,

    dump_area_max_duration_min,
    load_pad_max_duration_min,

    zone_max_speed_kmh,
    zone_bank_volume_m3,
    zone_bank_swell_factor,
    load_pad_type,
    material_type,
    dump_area_type,
    queue_type,
  } = zone;

  /* ---------------------------------------------
      1) UPDATE SQL — Only store values allowed for 
         the zoneType (others become NULL)
  --------------------------------------------- */
  const sql = `
    UPDATE zones
    SET 
      name = ?, 
      zoneType = ?, 
      geometry = ?, 
      area_sqm = ?, 
      area_ha = ?,

      ideal_queue_duration_m = ?, 
      max_vehicles_count = ?, 
      dump_area_max_duration_min = ?, 
      load_pad_max_duration_min = ?, 

      zone_max_speed_kmh = ?, 
      zone_bank_volume_m3 = ?, 
      zone_bank_swell_factor = ?
    WHERE id = ?
  `;

  const values = [
    name,
    zoneType,
    JSON.stringify(geometry),
    area_sqm,
    area_ha,

    // QUEUE AREA
    zoneType === "QUEUE_AREA" ? ideal_queue_duration_m : null,
    zoneType === "QUEUE_AREA" ? max_vehicles_count : null,

    // DUMP AREA
    zoneType === "DUMP_AREA" ? dump_area_max_duration_min : null,

    // LOADING AREA
    zoneType === "LOAD_PAD" ? load_pad_max_duration_min : null,

    // ZONE AREA
    zoneType === "ZONE_AREA" ? zone_max_speed_kmh : null,
    zoneType === "ZONE_AREA" ? zone_bank_volume_m3 : null,
    zoneType === "ZONE_AREA" ? zone_bank_swell_factor : null,

    id,
  ];

  try {
    /* ---------------------------------------------
        2) Update SQL
    --------------------------------------------- */
    const results = await dbQuery(sql, values);
    if (results.affectedRows === 0) return { message: "Zone not found" };

    /* ---------------------------------------------
        3) Get geofence ID
    --------------------------------------------- */
    const [zoneRow] = await dbQuery(
      "SELECT flespi_geofence_id, operationId FROM zones WHERE id = ?",
      [id]
    );

    const geofenceId = zoneRow?.flespi_geofence_id;
    if (geofenceId) {
      const zoneCalcIds = await getCalculatorIdsByZoneId(id);
      const zoneGeofenceCalcIds = await getCalculatorIdsByGeofenceId(geofenceId);
      await deleteCalculatorsByIds([...zoneCalcIds, ...zoneGeofenceCalcIds]);
      await deleteCalculatorAssignmentsByZoneId(id);
      await deleteCalculatorAssignmentsByGeofenceId(geofenceId);
    }

    if (geofenceId) {
      /* ---------------------------------------------
          Build metadata EXACTLY like createZone()
      --------------------------------------------- */

      const metadata = {
        zone_type: zoneType,
        area_ha,
        color:
          zoneType === "QUEUE_AREA"
            ? "#a855f7"
            : zoneType === "DUMP_AREA"
              ? "#3b82f6"
              : zoneType === "LOAD_PAD"
                ? "#ef4444"
                : "#facc15",

        updated: true,
      };

      // Add QUEUE metadata
      if (zoneType === "QUEUE_AREA") {
        metadata.ideal_queue_duration_m = ideal_queue_duration_m;
        metadata.max_vehicles_count = max_vehicles_count;
        metadata.queue_type = queue_type ?? null;
      }

      // ADD LOADPAD metadata
      if (zoneType === "LOAD_PAD") {
        metadata.load_pad_max_duration_min = load_pad_max_duration_min;
        metadata.load_pad_type = load_pad_type ?? null;
        metadata.material_type = material_type ?? null;
      }

      // ADD DUMP metadata
      if (zoneType === "DUMP_AREA") {
        metadata.dump_area_max_duration_min = dump_area_max_duration_min;
        metadata.dump_area_type = dump_area_type ?? null;
      }

      // ADD ZONE AREA metadata
      if (zoneType === "ZONE_AREA") {
        metadata.zone_max_speed_kmh = zone_max_speed_kmh;
        metadata.zone_bank_volume_m3 = zone_bank_volume_m3;
        metadata.zone_bank_swell_factor = zone_bank_swell_factor;
      }

      /* ---------------------------------------------
          4) Update Flespi Geofence
      --------------------------------------------- */
      const [opRow] = await dbQuery(
        "SELECT name FROM operations WHERE id = ?",
        [zoneRow?.operationId]
      );
      const operationName = opRow?.name || `operation-${zoneRow?.operationId || "unknown"}`;
      await updateFlespiGeofence(geofenceId.toString(), {
        name: `${name} - ${operationName} - LIQ`,
        geometry: toFlespiGeometry(geometry),
        metadata,
      });
      const templates = await getCalculatorTemplatesByType(zoneType);
      const filteredTemplates = filterTemplatesByName(
        templates,
        zoneCalculatorNameMap[zoneType]
      );
      const assignmentsToSave = [];

      for (const template of filteredTemplates) {
        try {
          const config = await loadCalculatorTemplateConfig(template.file_path);
          const cleanedConfig = sanitizeCalculatorConfig(config);
          const templateLabel = template?.name || `template-${template?.id || "unknown"}`;
          const calcName = `${templateLabel} - ${name} - ${operationName} - LIQ`.slice(0, 200);
          cleanedConfig.name = calcName;
          const calc = await createFlespiCalculator(cleanedConfig);
          await assignCalculatorToGeofence(calc.id, geofenceId);
          assignmentsToSave.push({
            calc_id: calc.id,
            calc_type: template?.name || null,
            operation_id: zoneRow?.operationId,
            zone_id: id,
            geofence_flespi_id: geofenceId,
          });
        } catch (err) {
          console.error(`Error creating/assigning calculator for ${zoneType} (${template?.name || 'template'}):`, err.message);
        }
      }

      if (assignmentsToSave.length > 0) {
        await saveCalculatorAssignments(assignmentsToSave);
        await assignCalculatorsToOperationDevices({
          operationId: zoneRow?.operationId,
          assignments: assignmentsToSave,
        });
      }
    }

    return { id, ...zone };
  } catch (err) {
    console.error("❌ Error updating zone or geofence:", err.message);
    throw err;
  }
};


// ======================================================
// GET ALL ZONES
// ======================================================
export const getAllZones = async () => {
  try {
    const sql = `
      SELECT 
        z.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'device_id', da.device_id,
            'completed_at', da.completed_at,
            'assigned_at', da.assigned_at
          )
        ) AS devices
      FROM zones z
      LEFT JOIN device_assignments da ON z.id = da.zone_id
      GROUP BY z.id
    `;

    const results = await dbQuery(sql);

    // Clean up empty device arrays
    const zones = results.map((z) => ({
      ...z,
      devices: z.devices ? JSON.parse(z.devices) : [],
    }));

    return zones;
  } catch (err) {
    console.error("❌ Error fetching zones with devices:", err.message);
    throw err;
  }
};


// ======================================================
// GET ZONE BY ID
// ======================================================
export const getZoneById = async (id) => {
  try {
    const results = await dbQuery("SELECT * FROM zones WHERE id = ?", [id]);
    return results.length > 0 ? results[0] : null;
  } catch (err) {
    console.error("Error fetching zone:", err.message);
    throw err;
  }
};
export const getZonesByOperationId = async (operationId) => {
  try {
    const results = await dbQuery(
      "SELECT * FROM zones WHERE operationId = ?",
      [operationId]
    );

    return results; // always return array
  } catch (err) {
    console.error("Error fetching zones by operationId:", err.message);
    throw err;
  }
};
// ======================================================
// DELETE ZONE → also delete Flespi geofence
// ======================================================
export const deleteZone = async (id) => {
  try {
// Delete device assignments for this zone
    await dbQuery(
      "DELETE FROM device_assignments WHERE zone_id = ?",
      [id]
    );

// Get Flespi geofence ID before deleting
    const [zoneRow] = await dbQuery(
      "SELECT flespi_geofence_id FROM zones WHERE id = ?",
      [id]
    );
    const geofenceId = zoneRow?.flespi_geofence_id;

    const zoneCalcIds = await getCalculatorIdsByZoneId(id);
    const zoneGeofenceCalcIds = geofenceId
      ? await getCalculatorIdsByGeofenceId(geofenceId)
      : [];
    await deleteCalculatorsByIds([...zoneCalcIds, ...zoneGeofenceCalcIds]);

    await deleteCalculatorAssignmentsByZoneId(id);
    if (geofenceId) {
      await deleteCalculatorAssignmentsByGeofenceId(geofenceId);
    }

// Delete zone from DB
    const results = await dbQuery("DELETE FROM zones WHERE id = ?", [id]);
    if (results.affectedRows === 0) return null;

// Delete from Flespi if exists
    if (geofenceId) {
      await deleteFlespiGeofence(geofenceId.toString());
    }

    return true;

  } catch (err) {
    console.error("❌ Error deleting zone & device assignments:", err.message);
    throw err;
  }
};
