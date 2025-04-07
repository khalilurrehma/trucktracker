import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export async function createGroup(data) {
  const sql = `
        INSERT INTO settings_groups (
          traccarId,
          flespiId,
          name,
          attributes,
          groupId,
          userId,
          created_role,
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;

  const values = [
    data.traccar.id,
    data.flespi.id,
    data.traccar.name,
    JSON.stringify(data.traccar.attributes),
    data.traccar.groupId,
    data.userId,
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

export async function getAllGroups() {
  const sql =
    "SELECT id, name, traccarId, flespiId, attributes, groupId, userId, created_role, created_by FROM settings_groups";

  try {
    const result = await dbQuery(sql);

    if (result.length > 0) {
      const groups = result.map((group) => {
        group.attributes = JSON.parse(group.attributes);
        return group;
      });

      return groups;
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
}

export async function getGroupById(groupId) {
  const sql =
    "SELECT id, name, traccarId, flespiId, attributes, groupId, userId, created_role, created_by FROM settings_groups";
  const values = [parseInt(groupId)];

  try {
    const result = await dbQuery(sql, values);

    if (result.length > 0) {
      const group = result[0];
      group.attributes = JSON.parse(group.attributes);

      return group;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}
export async function getGroupByTraccarId(traccarId) {
  const sql =
    "SELECT id, name, traccarId, flespiId, attributes, groupId, userId, created_role, created_by FROM settings_groups WHERE traccarId = ?";
  const values = [parseInt(traccarId)];

  try {
    const result = await dbQuery(sql, values);

    if (result.length > 0) {
      const group = result[0];
      group.attributes = JSON.parse(group.attributes);

      return group;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

export async function getGroupsByUserId(userId) {
  const sql =
    "SELECT id, name, traccarId, flespiId, attributes, groupId, userId, created_role, created_by FROM settings_groups WHERE userId = ?";
  const values = [userId];

  try {
    const result = await dbQuery(sql, values);

    if (result.length > 0) {
      const groups = result.map((group) => {
        group.attributes = JSON.parse(group.attributes);
        return group;
      });

      return groups;
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
}

export async function updateGroupById(id, data) {
  const updateSql = `
          UPDATE settings_groups
          SET
            name = ?,
            attributes = ?,
            groupId = ?
          WHERE id = ?;
      `;

  const selectSql =
    "SELECT id, name, traccarId, flespiId, attributes, groupId, userId FROM settings_groups WHERE id = ?;";

  const updateValues = [
    data.traccar.name,
    JSON.stringify(data.traccar.attributes),
    data.traccar.groupId,
    id,
  ];

  try {
    await dbQuery(updateSql, updateValues);

    const result = await dbQuery(selectSql, [id]);

    if (result.length > 0) {
      const updatedRow = result[0];
      return updatedRow;
    } else {
      console.log("No rows found with id", id);
      return 0;
    }
  } catch (err) {
    throw err;
  }
}

export async function deleteGroupByUserId(userId) {
  const sql = `
          DELETE FROM settings_groups
          WHERE
              userId = ?;`;

  const values = [userId];

  try {
    const result = await dbQuery(sql, values);
    return result.affectedRows;
  } catch (err) {
    throw err;
  }
}

export async function softDeleteGroupById(id) {
  const sql = `
          DELETE FROM settings_groups
          WHERE
              id = ?;`;

  const values = [parseInt(id)];

  try {
    const result = await dbQuery(sql, values);
    return result.affectedRows;
  } catch (err) {
    throw err;
  }
}
