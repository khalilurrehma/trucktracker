import pool from "../../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

import {
  createFlespiGeofence,
  updateFlespiGeofence,
  deleteFlespiGeofence,
  createFlespiCalculator,
  assignCalculatorToGeofence
} from "../../services/flespiApis.js";

// Utility: convert GeoJSON geometry to Flespi format
function toFlespiGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type && geometry.coordinates) {
    return {
      type: "polygon",
      path: geometry.coordinates[0].map(([lon, lat]) => ({ lat, lon })),
    };
  }
  return geometry;
}

// ======================================================
// CREATE ZONE → also create Flespi geofence
// ======================================================
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
    // 1️⃣ Save zone in DB
    const results = await dbQuery(sql, values);
    const zoneId = results.insertId;

    // 2️⃣ Prepare Flespi geometry
    const flespiGeometry = toFlespiGeometry(geometry);

    // 3️⃣ Create Flespi geofence
    const geofence = await createFlespiGeofence([
      {
        name: `${zoneType}-${name}`,
        priority: 100,
        enabled: true,
        geometry: flespiGeometry,
        metadata: {
          zone_id: zoneId,
          operation_id: operationId,
          zone_type: zoneType,
          color:
            zoneType === "QUEUE_AREA"
              ? "#e67e22"
              : zoneType === "DUMP_AREA"
              ? "#c0392b"
              : zoneType === "LOAD_PAD"
              ? "#27ae60"
              : "#3498db",
          area_ha,
          max_speed: zone_max_speed_kmh || 0,
        },
      },
    ]);

    const geofenceId = geofence[0]?.id;
   // 4️⃣ Fetch all calculator templates from DB
    const templates = await dbQuery("SELECT * FROM calculator_templates");

    // 5️⃣ Filter templates that match this zoneType
    const matchingTemplates = templates.filter(t => t.type === zoneType);
    if (!matchingTemplates.length) {
      console.warn(`⚠️ No calculator templates found for zoneType ${zoneType}`);
    }

    // 6️⃣ Create and assign calculators for this geofence
    for (const tpl of matchingTemplates) {
      try {
        const config = JSON.parse(tpl.config_json);
        const calc = await createFlespiCalculator(config);
        await assignCalculatorToGeofence(calc.id, geofenceId);
        console.log(`✅ Assigned calculator "${tpl.name}" (ID ${calc.id}) to geofence ${geofenceId}`);
      } catch (err) {
        console.error(`❌ Failed to create/assign calculator "${tpl.name}":`, err.message);
      }
    }
    // 4️⃣ Save geofence ID into zone
    await dbQuery(
      "UPDATE zones SET flespi_geofence_id = ? WHERE id = ?",
      [geofenceId, zoneId]
    );

    return { id: zoneId, flespi_geofence_id: geofenceId, ...zone };
  } catch (err) {
    console.error("❌ Error creating zone or geofence:", err.message);
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
  } = zone;

  const sql = `
    UPDATE zones
    SET name = ?, zoneType = ?, geometry = ?, area_sqm = ?, area_ha = ?,
        ideal_queue_duration_m = ?, max_vehicles_count = ?, dump_area_max_duration_min = ?, 
        load_pad_max_duration_min = ?, zone_max_speed_kmh = ?, 
        zone_bank_volume_m3 = ?, zone_bank_swell_factor = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const values = [
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
    id,
  ];

  try {
    const results = await dbQuery(sql, values);
    if (results.affectedRows === 0) return { message: "Zone not found" };

    // Get Flespi geofence ID
    const [zoneRow] = await dbQuery(
      "SELECT flespi_geofence_id FROM zones WHERE id = ?",
      [id]
    );
    const geofenceId = zoneRow?.flespi_geofence_id;

    if (geofenceId) {
      await updateFlespiGeofence(geofenceId.toString(), {
        name: `${zoneType}-${name}`,
        geometry: toFlespiGeometry(geometry),
        metadata: {
          zone_type: zoneType,
          area_ha,
          max_speed: zone_max_speed_kmh || 0,
          updated: true,
        },
      });
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

// ======================================================
// DELETE ZONE → also delete Flespi geofence
// ======================================================
export const deleteZone = async (id) => {
  try {
    // ✅ 1) Delete device assignments for this zone
    await dbQuery(
      "DELETE FROM device_assignments WHERE zone_id = ?",
      [id]
    );

    // ✅ 2) Get Flespi geofence ID before deleting
    const [zoneRow] = await dbQuery(
      "SELECT flespi_geofence_id FROM zones WHERE id = ?",
      [id]
    );
    const geofenceId = zoneRow?.flespi_geofence_id;

    // ✅ 3) Delete zone from DB
    const results = await dbQuery("DELETE FROM zones WHERE id = ?", [id]);
    if (results.affectedRows === 0) return null;

    // ✅ 4) Delete from Flespi if exists
    if (geofenceId) {
      await deleteFlespiGeofence(geofenceId.toString());
    }

    return true;

  } catch (err) {
    console.error("❌ Error deleting zone & device assignments:", err.message);
    throw err;
  }
};
