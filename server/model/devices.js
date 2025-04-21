import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const getAllGroup = async () => {
  const sql = "SELECT * FROM settings_groups";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchAllDevices = async () => {
  const sql = "SELECT * FROM settings_devices";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const putDeviceShift = async (deviceId, body) => {
  const sql = `UPDATE settings_devices SET shift_id = ? WHERE id = ?`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, [body, deviceId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

// NEW DEVICES
export async function createDevice(data) {
  const sql = `
      INSERT INTO new_settings_devices (
        userId,
        password,
        traccarId,
        flespiId,
        name,
        device_type_id,
        uniqueId,
        groupId,
        phone,
        model,
        contact,
        category,
        expirationTime,
        disabled,
        attributes,
        traccar_status,
        traccar_lastUpdate,
        flespi_protocol_name,
        flespi_protocol_id,
        flespi_device_type_name,
        flespi_configuration,
        flespi_metadata,
        media_ttl,
        messages_ttl,
        created_role,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

  const values = [
    data.userId,
    data.password,
    data.traccar.id,
    data.flespi.id,
    data.traccar.name,
    data.flespi.device_type_id,
    data.traccar.uniqueId,
    data.traccar.groupId,
    data.traccar.phone,
    data.traccar.model,
    data.traccar.contact,
    data.traccar.category,
    data.traccar.expirationTime,
    data.traccar.disabled,
    JSON.stringify(data.traccar.attributes),
    data.traccar.status,
    data.traccar.lastUpdate,
    data.flespi.protocol_name,
    data.flespi.protocol_id,
    data.flespi.device_type_name,
    JSON.stringify(data.flespi.configuration),
    JSON.stringify(data.flespi.metadata),
    data.flespi.media_ttl,
    data.flespi.messages_ttl,
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

export async function getAllDevices() {
  const sql =
    "SELECT id, name, traccarId, flespiId, device_type_id, uniqueId, groupId, phone, model, contact, category, expirationTime, disabled, attributes, userId, traccar_status, traccar_lastUpdate, flespi_protocol_name, flespi_protocol_id, flespi_device_type_name, media_ttl, messages_ttl, created_role, created_by, shift_assigned FROM new_settings_devices";

  try {
    const result = await dbQuery(sql);

    if (result.length > 0) {
      const devices = result.map((device) => {
        device.attributes = JSON.parse(device.attributes);
        return device;
      });

      return devices;
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
}

export async function getDeviceById(deviceId) {
  const sql =
    "SELECT id, name, traccarId, flespiId, device_type_id , uniqueId, groupId, phone, model, contact, category, expirationTime, disabled, attributes, userId, traccar_status, traccar_lastUpdate, flespi_protocol_name, flespi_protocol_id, flespi_device_type_name, media_ttl, messages_ttl, created_by FROM new_settings_devices WHERE id = ?";
  const values = [deviceId];

  try {
    const result = await dbQuery(sql, values);

    if (result.length > 0) {
      const device = result[0];
      device.attributes = JSON.parse(device.attributes);

      return device;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

export async function getDeviceUserIdByFlespiId(flespId) {
  const sql = "SELECT userId FROM new_settings_devices WHERE flespiId =?";
  const values = [flespId];

  try {
    const result = await dbQuery(sql, values);
    if (result.length > 0) {
      return result[0].userId;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

export async function getDeviceByTraccarId(deviceId) {
  const sql =
    "SELECT id, name, traccarId, flespiId, device_type_id , uniqueId, groupId, phone, model, contact, category, expirationTime, disabled, attributes, userId, traccar_status, traccar_lastUpdate, flespi_protocol_name, flespi_protocol_id, flespi_device_type_name, media_ttl, messages_ttl, created_by FROM new_settings_devices WHERE traccarId = ?";
  const values = [deviceId];

  try {
    const result = await dbQuery(sql, values);

    if (result.length > 0) {
      const device = result[0];
      device.attributes = JSON.parse(device.attributes);

      return device;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

export async function getDevicesByUserId(userId) {
  const sql =
    "SELECT id, name, traccarId, flespiId, device_type_id , uniqueId, groupId, phone, model, contact, category, expirationTime, disabled, attributes, userId, traccar_status, traccar_lastUpdate, flespi_protocol_name, flespi_protocol_id, flespi_device_type_name, media_ttl, messages_ttl, created_by, shift_assigned FROM new_settings_devices WHERE userId = ?";
  const values = [userId];

  try {
    const result = await dbQuery(sql, values);

    if (result.length > 0) {
      const devices = result.map((device) => {
        device.attributes = JSON.parse(device.attributes);
        return device;
      });

      return devices;
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
}

export async function getDeviceNameByFlespId(flespiId) {
  const sql = "SELECT name FROM new_settings_devices WHERE flespiId = ?";
  const values = [flespiId];

  try {
    const result = await dbQuery(sql, values);
    return result[0]?.name;
  } catch (error) {
    throw error;
  }
}

export async function getDeviceByFlespiId(flespiId) {
  const sql = `SELECT * FROM new_settings_devices WHERE flespiId = ?`;

  const values = [flespiId];

  try {
    const result = await dbQuery(sql, values);
    if (result.length > 0) {
      const device = result[0];
      device.attributes = JSON.parse(device.attributes);
      return device;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

export async function subaccountDeviceCount(userId) {
  const sql =
    "SELECT COUNT(*) as deviceCount FROM new_settings_devices WHERE userId =?";
  const values = [userId];

  try {
    const result = await dbQuery(sql, values);
    return result[0].deviceCount;
  } catch (error) {
    throw error;
  }
}

export async function updateDeviceById(id, data) {
  let updateSql = `
    UPDATE new_settings_devices
    SET
      name = ?,
      device_type_id = ?,
      uniqueId = ?,
      groupId = ?,
      phone = ?,
      model = ?,
      contact = ?,
      category = ?,
      expirationTime = ?,
      disabled = ?,
      attributes = ?,
      traccar_status = ?,
      traccar_lastUpdate = ?,
      flespi_protocol_name = ?,
      flespi_protocol_id = ?,
      flespi_device_type_name = ?,
      flespi_configuration = ?,
      media_ttl = ?,
      messages_ttl = ?,
      flespi_metadata = ?
    WHERE id = ?;
  `;

  const selectSql = "SELECT * FROM new_settings_devices WHERE id = ?;";
  const values = [
    data.traccar.name,
    data.flespi.device_type_id,
    data.traccar.uniqueId,
    data.traccar.groupId,
    data.traccar.phone,
    data.traccar.model,
    data.traccar.contact,
    data.traccar.category,
    data.traccar.expirationTime,
    data.traccar.disabled,
    JSON.stringify(data.traccar.attributes),
    data.traccar.status,
    data.traccar.lastUpdate,
    data.flespi.protocol_name,
    data.flespi.protocol_id,
    data.flespi.device_type_name,
    JSON.stringify(data.flespi.configuration),
    data.flespi.media_ttl,
    data.flespi.messages_ttl,
    JSON.stringify(data.flespi.metadata),
    id,
  ];

  // Conditionally add password to the update statement
  if (
    data.password !== undefined &&
    data.password !== null &&
    data.password !== ""
  ) {
    updateSql = `
      UPDATE new_settings_devices
      SET
        password = ?,
        ${updateSql.substr(updateSql.indexOf("SET") + 4)};`;
    values.unshift(data.password);
  }

  try {
    await dbQuery(updateSql, values);
    const result = await dbQuery(selectSql, [id]);

    if (result.length > 0) {
      const updatedRow = result[0];
      updatedRow.flespi_configuration = JSON.parse(
        updatedRow.flespi_configuration
      );
      updatedRow.flespi_metadata = JSON.parse(updatedRow.flespi_metadata);
      return updatedRow;
    } else {
      console.log("No rows found with id", id);
      return null;
    }
  } catch (err) {
    throw err;
  }
}

export async function softDeleteDeviceById(id) {
  const sql = `
        DELETE FROM new_settings_devices WHERE id = ?;
    `;

  const values = [id];

  try {
    const result = await dbQuery(sql, values);
    return result.affectedRows;
  } catch (err) {
    throw err;
  }
}

export function getDevicesByIMEI(uniqueIds) {
  return new Promise((resolve, reject) => {
    if (uniqueIds.length === 0) {
      resolve([]);
      return;
    }

    const imeiQuery = "SELECT device_id, ident FROM devices WHERE ident IN (?)";
    db.query(imeiQuery, [uniqueIds], (error, devices) => {
      if (error) {
        console.error("Error:", error);
        reject(error);
      } else {
        resolve(devices);
      }
    });
  });
}

export const deviceShiftAssigned = async (deviceId, assign = false) => {
  const sql = `UPDATE new_settings_devices SET shift_assigned = ? WHERE id = ?`;
  const values = [assign ? true : false, deviceId];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`deviceShiftAssigned failed: ${error.message}`);
  }
};
