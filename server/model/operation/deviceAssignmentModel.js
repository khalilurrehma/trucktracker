// server/model/operation/deviceAssignmentModel.js
import pool from "../../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);
import {
  assignGeofenceToDevice,
  unassignGeofenceFromDevice,
  fetchCalcData 
} from "../../services/flespiApis.js";


export const createDeviceAssignment = async ({ device_id, operation_id, zone_id }) => {
  const sql = `
    INSERT INTO device_assignments (device_id, operation_id, zone_id, created_at, updated_at)
    VALUES (?, ?, ?, NOW(), NOW())
  `;
  const values = [Number(device_id), Number(operation_id), Number(zone_id)];

  try {
    const [device] = await dbQuery(
      "SELECT flespiId, traccarId, name FROM new_settings_devices WHERE id = ?",
      [device_id]
    );
    const [zone] = await dbQuery(
      "SELECT flespi_geofence_id, name FROM zones WHERE id = ?",
      [zone_id]
    );

    if (!device) throw new Error(`Device ${device_id} not found`);
    if (!zone) throw new Error(`Zone ${zone_id} not found`);

    const flespiId = device.flespiId;
    const geofenceId = zone.flespi_geofence_id;

    const result = await dbQuery(sql, values);
    const newAssignment = { id: result.insertId, device_id, operation_id, zone_id };

    console.log("📦 Device Assignment Created:", newAssignment);

    // ✅ Corrected order of arguments
    if (flespiId && geofenceId) {
      console.log(`🌍 Assigning Flespi Geofence ${geofenceId} → Device ${flespiId}`);
      await assignGeofenceToDevice(flespiId, geofenceId);
      console.log(`✅ Assigned geofence ${geofenceId} to device ${device.name} (${flespiId})`);
    } else {
      console.warn(`⚠️ Missing flespiId or geofenceId for device ${device_id} / zone ${zone_id}`);
    }

    return newAssignment;
  } catch (err) {
    console.error("❌ Error in createDeviceAssignment:", err.message);
    throw err;
  }
};

// ✅ Get all assignments
export const getAllAssignments = async () => {
  const sql = `
    SELECT da.*, d.name AS device_name, z.name AS zone_name, o.name AS operation_name
    FROM device_assignments da
    LEFT JOIN devices d ON da.device_id = d.id
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
    // 1️⃣ Get the Flespi identifiers before deleting the record
    const [device] = await dbQuery(
      "SELECT flespiId, name FROM new_settings_devices WHERE id = ?",
      [device_id]
    );
    const [zone] = await dbQuery(
      "SELECT flespi_geofence_id, name FROM zones WHERE id = ?",
      [zone_id]
    );

    // 2️⃣ Delete DB record
    const sql = `
      DELETE FROM device_assignments
      WHERE device_id = ? AND zone_id = ?
    `;
    const result = await dbQuery(sql, [device_id, zone_id]);

    // 3️⃣ Unassign geofence from Flespi (only if both exist)
    if (device?.flespiId && zone?.flespi_geofence_id) {
      console.log(`🗑 Unassigning geofence ${zone.flespi_geofence_id} ← device ${device.flespiId}`);
      await unassignGeofenceFromDevice(device.flespiId, zone.flespi_geofence_id);
      console.log(`✅ Unassigned geofence ${zone.flespi_geofence_id} from device ${device.name}`);
    } else {
      console.warn("⚠️ Missing Flespi ID or geofence ID, skipping Flespi unassignment.");
    }

    return result.affectedRows > 0;
  } catch (err) {
    console.error("❌ DB error deleting assignment:", err.message);
    throw err;
  }
};

export const getOperationCalculatorData = async (calcId, deviceId) => {
  try {
    const data = await fetchCalcData(calcId, deviceId);
    return data;
  } catch (err) {
    console.error("❌ Model error in getOperationCalculatorData:", err.message);
    throw err;
  }
};