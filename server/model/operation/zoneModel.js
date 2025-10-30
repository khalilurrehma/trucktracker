import pool from "../../config/dbConfig.js"; 
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

// Create a new zone
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
    zone_bank_swell_factor
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
    zoneType === 'QUEUE_AREA' ? ideal_queue_duration_m : null,
    zoneType === 'QUEUE_AREA' ? max_vehicles_count : null,
    zoneType === 'DUMP_AREA' ? dump_area_max_duration_min : null,
    zoneType === 'LOAD_PAD' ? load_pad_max_duration_min : null,
    zoneType === 'ZONE_AREA' ? zone_max_speed_kmh : null,
    zoneType === 'ZONE_AREA' ? zone_bank_volume_m3 : null,
    zoneType === 'ZONE_AREA' ? zone_bank_swell_factor : null
  ];

  try {
    const results = await dbQuery(sql, values);
    return { id: results.insertId, ...zone };
  } catch (err) {
    console.error("Error creating zone:", err.message);
    throw err;
  }
};

// Update an existing zone
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
    zone_bank_swell_factor
  } = zone;

  const sql = `
    UPDATE zones
    SET name = ?, zoneType = ?, geometry = ?, area_sqm = ?, area_ha = ?,
    ideal_queue_duration_m = ?, max_vehicles_count = ?, dump_area_max_duration_min = ?, 
    load_pad_max_duration_min = ?, zone_max_speed_kmh = ?, zone_bank_volume_m3 = ?, zone_bank_swell_factor = ?
    WHERE id = ?
  `;

  const values = [
    name,
    zoneType,
    JSON.stringify(geometry),
    area_sqm,
    area_ha,
    zoneType === 'QUEUE_AREA' ? ideal_queue_duration_m : null,
    zoneType === 'QUEUE_AREA' ? max_vehicles_count : null,
    zoneType === 'DUMP_AREA' ? dump_area_max_duration_min : null,
    zoneType === 'LOAD_PAD' ? load_pad_max_duration_min : null,
    zoneType === 'ZONE_AREA' ? zone_max_speed_kmh : null,
    zoneType === 'ZONE_AREA' ? zone_bank_volume_m3 : null,
    zoneType === 'ZONE_AREA' ? zone_bank_swell_factor : null,
    id
  ];

  try {
    const results = await dbQuery(sql, values);
    if (results.affectedRows === 0) {
      return { message: "Zone not found" };
    }
    return { id, ...zone };
  } catch (err) {
    console.error("Error updating zone:", err.message);
    throw err;
  }
};

// Get all zones
export const getAllZones = async () => {
  const sql = "SELECT * FROM zones";
  try {
    const results = await dbQuery(sql);
    return results;
  } catch (err) {
    console.error("Error fetching zones:", err.message);
    throw err;
  }
};

// Get a single zone by ID
export const getZoneById = async (id) => {
  const sql = "SELECT * FROM zones WHERE id = ?";
  try {
    const results = await dbQuery(sql, [id]);
    if (results.length > 0) {
      return results[0];
    }
    return null;
  } catch (err) {
    console.error("Error fetching zone:", err.message);
    throw err;
  }
};

// Delete a zone by ID
export const deleteZone = async (id) => {
  const sql = "DELETE FROM zones WHERE id = ?";
  try {
    const results = await dbQuery(sql, [id]);
    if (results.affectedRows === 0) {
      return null;  // Zone not found
    }
    return true;  // Zone deleted successfully
  } catch (err) {
    console.error("Error deleting zone:", err.message);
    throw err;
  }
};
