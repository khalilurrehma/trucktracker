import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export async function createGeofence(data) {
  const sql = `
        INSERT INTO settings_geofences (
          userId,
          traccarId,
          flespiId,
          name,
          flespiName,
          description,
          area,
          calendarId,
          attributes,
          created_role,
          created_by
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

  const values = [
    data.userId,
    data.traccar.id,
    data.flespi.id,
    data.traccar.name,
    data.flespi.name,
    data.traccar.description,
    JSON.stringify(data.traccar.area),
    data.traccar.calendarId,
    data.traccar.attributes ? JSON.stringify(data.traccar.attributes) : null,
    data.created_role,
    data.created_by,
  ];

  try {
    const result = await dbQuery(sql, values);
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

export async function getAllGeofences() {
  const sql =
    "SELECT id, traccarId, flespiId, userId, name, description, area, calendarId, attributes, created_role, created_at, created_by FROM settings_geofences";

  try {
    const result = await dbQuery(sql);

    if (result.length > 0) {
      const data = result.map((item) => {
        if (item.attributes) {
          item.attributes = JSON.parse(item.attributes);
        }
        return item;
      });

      return data;
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
}

export async function getGeofenceById(id) {
  const sql =
    "SELECT id, traccarId, flespiId, userId, name, flespiName, description, area, calendarId, attributes, created_role, created_at, created_by FROM settings_geofences WHERE id = ?";
  const values = [id];

  try {
    const result = await dbQuery(sql, values);

    if (result.length === 1) {
      const item = result[0];
      if (item.attributes) {
        item.attributes = JSON.parse(item.attributes);
      }
      return item;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

export async function getGeofencesByUserId(userId) {
  const sql =
    "SELECT id, traccarId, flespiId, userId, name, description, area, calendarId, attributes, created_role, created_at, created_by FROM settings_geofences WHERE userId = ?";
  const values = [userId];

  try {
    const result = await dbQuery(sql, values);

    if (result.length > 0) {
      const data = result.map((item) => {
        if (item.attributes) {
          item.attributes = JSON.parse(item.attributes);
        }
        return item;
      });

      return data;
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
}
export async function getGeofencesByTraccarId(traccarId) {
  const sql =
    "SELECT id, traccarId, flespiId, userId, name, flespiName, description, area, calendarId, attributes, created_role, created_at, created_by FROM settings_geofences WHERE traccarId = ?";
  const values = [traccarId];

  try {
    const result = await dbQuery(sql, values);

    if (result.length === 1) {
      const item = result[0];
      if (item.attributes) {
        item.attributes = JSON.parse(item.attributes);
      }
      return item;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

export async function updateGeofenceById(id, updatedData, flespi) {
  const sql = `
      UPDATE settings_geofences
      SET
      name = ?,
      flespiName = ?,
      description = ?,
      area = ?,
      calendarId = ?,
      attributes = ?
      WHERE id = ?;
    `;

  const values = [
    updatedData.name,
    flespi.name,
    updatedData.description,
    JSON.stringify(updatedData.area),
    updatedData.calendarId,
    JSON.stringify(updatedData.attributes),
    id,
  ];

  try {
    const result = await dbQuery(sql, values);
    if (result.affectedRows === 0) {
      throw new Error(`Geofence with ID ${id} not found.`);
    }

    const updatedresult = {
      id,
      traccar: { ...updatedData },
    };

    return updatedresult;
  } catch (err) {
    throw err;
  }
}

export async function deleteGeofenceByUserId(userId) {
  const sql = `
          DELETE FROM settings_geofences WHERE userId = ?;`;

  const values = [userId];

  try {
    const result = await dbQuery(sql, values);
    return result.affectedRows;
  } catch (err) {
    throw err;
  }
}
export async function softDeleteGeofenceById(id) {
  const sql = `
          DELETE FROM settings_geofences WHERE id = ?;`;

  const values = [id];

  try {
    const result = await dbQuery(sql, values);
    return result.affectedRows;
  } catch (err) {
    throw err;
  }
}

export const saveGeofenceType = async (body) => {
  const { name, userId } = body;

  const sql = `INSERT INTO geofences_types (name, userId) VALUES (?, ?)`;

  const values = [name, userId];

  try {
    const result = await dbQuery(sql, values);
    return result.insertId;
  } catch (err) {
    throw err;
  }
};

export const fetchGeofencesTypes = async () => {
  const sql = `SELECT * FROM geofences_types`;

  try {
    const result = await dbQuery(sql);
    return result;
  } catch (err) {
    throw err;
  }
};

export const fetchGeofencesTypesByUserId = async (id) => {
  const sql = `SELECT * FROM geofences_types WHERE userId = ?`;

  const values = [id];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (err) {
    throw err;
  }
};

export const fetchGeofenceTypeById = async (id) => {
  const sql = `SELECT * FROM geofences_types WHERE id = ?`;

  const values = [id];

  try {
    const result = await dbQuery(sql, values);
    return result[0];
  } catch (err) {
    throw err;
  }
};

export const modifyGeofenceTypeById = async (id, body) => {
  const { name } = body;

  const sql = `UPDATE geofences_types SET name = ? WHERE id = ?`;

  const values = [name, id];

  try {
    const result = await dbQuery(sql, values);
    return result.affectedRows;
  } catch (err) {
    throw err;
  }
};

export const removeGeofenceTypeById = async (id) => {
  const sql = `DELETE FROM geofences_types WHERE id = ?`;

  const values = [id];
  try {
    const result = await dbQuery(sql, values);
    return result.affectedRows;
  } catch (err) {
    throw err;
  }
};
