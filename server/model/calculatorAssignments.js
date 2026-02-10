import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const saveCalculatorAssignments = async (assignments) => {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return null;
  }

  const sql = `
    INSERT INTO calculator_assignments
    (calc_id, calc_type, device_id, device_flespi_id, operation_id, zone_id, geofence_flespi_id)
    VALUES ?
  `;

  const values = assignments.map((assignment) => [
    assignment.calc_id,
    assignment.calc_type ?? null,
    assignment.device_id ?? null,
    assignment.device_flespi_id ?? null,
    assignment.operation_id ?? null,
    assignment.zone_id ?? null,
    assignment.geofence_flespi_id ?? null,
  ]);

  return dbQuery(sql, [values]);
};

export const deleteCalculatorAssignmentsByDeviceId = async (deviceId) => {
  const sql = `
    DELETE FROM calculator_assignments
    WHERE device_id = ?
  `;
  return dbQuery(sql, [deviceId]);
};

export const deleteCalculatorAssignmentsByDeviceFlespiId = async (
  deviceFlespiId
) => {
  const sql = `
    DELETE FROM calculator_assignments
    WHERE device_flespi_id = ?
  `;
  return dbQuery(sql, [deviceFlespiId]);
};

export const deleteCalculatorAssignmentsByOperationId = async (operationId) => {
  const sql = `
    DELETE FROM calculator_assignments
    WHERE operation_id = ?
  `;
  return dbQuery(sql, [operationId]);
};

export const deleteCalculatorAssignmentsByZoneId = async (zoneId) => {
  const sql = `
    DELETE FROM calculator_assignments
    WHERE zone_id = ?
  `;
  return dbQuery(sql, [zoneId]);
};

export const deleteCalculatorAssignmentsByDeviceZone = async (deviceId, zoneId) => {
  const sql = `
    DELETE FROM calculator_assignments
    WHERE device_id = ? AND zone_id = ?
  `;
  return dbQuery(sql, [deviceId, zoneId]);
};

export const deleteCalculatorAssignmentsByGeofenceId = async (geofenceId) => {
  const sql = `
    DELETE FROM calculator_assignments
    WHERE geofence_flespi_id = ?
  `;
  return dbQuery(sql, [geofenceId]);
};

export const getCalculatorIdsByDeviceId = async (deviceId) => {
  const sql = `
    SELECT DISTINCT calc_id
    FROM calculator_assignments
    WHERE device_id = ?
  `;
  const rows = await dbQuery(sql, [deviceId]);
  return rows.map((row) => row.calc_id);
};

export const getCalculatorIdsByDeviceFlespiId = async (deviceFlespiId) => {
  const sql = `
    SELECT DISTINCT calc_id
    FROM calculator_assignments
    WHERE device_flespi_id = ?
  `;
  const rows = await dbQuery(sql, [deviceFlespiId]);
  return rows.map((row) => row.calc_id);
};

export const getCalculatorIdsByZoneId = async (zoneId) => {
  const sql = `
    SELECT DISTINCT calc_id
    FROM calculator_assignments
    WHERE zone_id = ?
  `;
  const rows = await dbQuery(sql, [zoneId]);
  return rows.map((row) => row.calc_id);
};

export const getCalculatorIdsByDeviceZone = async (deviceId, zoneId) => {
  const sql = `
    SELECT DISTINCT calc_id
    FROM calculator_assignments
    WHERE device_id = ? AND zone_id = ?
  `;
  const rows = await dbQuery(sql, [deviceId, zoneId]);
  return rows.map((row) => row.calc_id);
};

export const getCalculatorIdsByOperationId = async (operationId) => {
  const sql = `
    SELECT DISTINCT calc_id
    FROM calculator_assignments
    WHERE operation_id = ?
  `;
  const rows = await dbQuery(sql, [operationId]);
  return rows.map((row) => row.calc_id);
};

export const getAssignedCalculatorIdsByOperationId = async (operationId) => {
  const sql = `
    SELECT DISTINCT calc_id
    FROM calculator_assignments
    WHERE operation_id = ?
      AND device_flespi_id IS NOT NULL
  `;
  const rows = await dbQuery(sql, [operationId]);
  return rows.map((row) => row.calc_id);
};

export const getAssignedCalculatorsByOperationId = async (operationId) => {
  const sql = `
    SELECT DISTINCT calc_id, calc_type
    FROM calculator_assignments
    WHERE operation_id = ?
      AND device_flespi_id IS NOT NULL
  `;
  const rows = await dbQuery(sql, [operationId]);
  return rows.map((row) => ({
    calc_id: Number(row.calc_id),
    calc_type: row.calc_type || null,
  }));
};

export const getCalculatorTypesByCalcIds = async (calcIds = []) => {
  const normalizedCalcIds = Array.from(
    new Set(
      (Array.isArray(calcIds) ? calcIds : [calcIds])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    )
  );

  if (normalizedCalcIds.length === 0) {
    return [];
  }

  const placeholders = normalizedCalcIds.map(() => "?").join(",");
  const sql = `
    SELECT calc_id, calc_type
    FROM calculator_assignments
    WHERE calc_id IN (${placeholders})
      AND calc_type IS NOT NULL
    GROUP BY calc_id, calc_type
  `;
  const rows = await dbQuery(sql, normalizedCalcIds);
  return rows.map((row) => ({
    calc_id: Number(row.calc_id),
    calc_type: row.calc_type || null,
  }));
};

export const getCalculatorIdsByGeofenceId = async (geofenceId) => {
  const sql = `
    SELECT DISTINCT calc_id
    FROM calculator_assignments
    WHERE geofence_flespi_id = ?
  `;
  const rows = await dbQuery(sql, [geofenceId]);
  return rows.map((row) => row.calc_id);
};

export const getAllCalculatorIds = async () => {
  const sql = `
    SELECT DISTINCT calc_id
    FROM calculator_assignments
  `;
  const rows = await dbQuery(sql);
  return rows.map((row) => row.calc_id);
};
