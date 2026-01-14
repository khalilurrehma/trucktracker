import pool from "../../config/dbConfig.js";
import util from "util";

const dbQuery = util.promisify(pool.query).bind(pool);

const toDbValue = (value) => {
  if (value === undefined) return null;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
};

export const getLayersByOperationId = async (operationId) => {
  const sql = "SELECT * FROM operation_layers WHERE operation_id = ? ORDER BY id ASC";
  return dbQuery(sql, [operationId]);
};

export const createOperationLayer = async (operationId, layer) => {
  const sql = `
    INSERT INTO operation_layers (operation_id, name, type, visible, opacity, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [
    operationId,
    layer.name,
    layer.type,
    Number(layer.visible ?? 1),
    Number(layer.opacity ?? 1),
    toDbValue(layer.data ?? null),
  ];
  const result = await dbQuery(sql, values);
  return result.insertId;
};

export const updateOperationLayer = async (operationId, layerId, updates) => {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.type !== undefined) {
    fields.push("type = ?");
    values.push(updates.type);
  }
  if (updates.visible !== undefined) {
    fields.push("visible = ?");
    values.push(Number(updates.visible));
  }
  if (updates.opacity !== undefined) {
    fields.push("opacity = ?");
    values.push(Number(updates.opacity));
  }
  if (updates.data !== undefined) {
    fields.push("data = ?");
    values.push(toDbValue(updates.data));
  }

  if (!fields.length) return 0;

  const sql = `
    UPDATE operation_layers
    SET ${fields.join(", ")}
    WHERE id = ? AND operation_id = ?
  `;
  values.push(layerId, operationId);
  const result = await dbQuery(sql, values);
  return result.affectedRows;
};

export const deleteOperationLayer = async (operationId, layerId) => {
  const sql = "DELETE FROM operation_layers WHERE id = ? AND operation_id = ?";
  const result = await dbQuery(sql, [layerId, operationId]);
  return result.affectedRows;
};
