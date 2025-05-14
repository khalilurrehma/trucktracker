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
  const sql = `
  SELECT d.id, d.name, d.traccarId, d.flespiId, d.device_type_id, d.uniqueId, d.groupId,
         d.phone, d.model, d.contact, d.category, d.expirationTime, d.disabled,
         d.attributes, d.userId, d.traccar_status, d.traccar_lastUpdate,
         d.flespi_protocol_name, d.flespi_protocol_id, d.flespi_device_type_name,
         d.media_ttl, d.messages_ttl, d.created_role, d.created_by, d.shift_assigned,
         d.service_type, d.cost_by_km,
         st.name AS service_type_name
  FROM new_settings_devices d
  LEFT JOIN device_service_type st ON d.service_type = st.id
`;

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
  const sql = `
  SELECT d.id, d.name, d.traccarId, d.flespiId, d.device_type_id, d.uniqueId, d.groupId,
         d.phone, d.model, d.contact, d.category, d.expirationTime, d.disabled,
         d.attributes, d.userId, d.traccar_status, d.traccar_lastUpdate,
         d.flespi_protocol_name, d.flespi_protocol_id, d.flespi_device_type_name,
         d.media_ttl, d.messages_ttl, d.created_by,
         d.service_type, d.cost_by_km,
         st.name AS service_type_name
  FROM new_settings_devices d
  LEFT JOIN device_service_type st ON d.service_type = st.id
  WHERE d.id = ?
`;

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
  const sql = `
  SELECT d.id, d.name, d.traccarId, d.flespiId, d.device_type_id, d.uniqueId, d.groupId,
         d.phone, d.model, d.contact, d.category, d.expirationTime, d.disabled,
         d.attributes, d.userId, d.traccar_status, d.traccar_lastUpdate,
         d.flespi_protocol_name, d.flespi_protocol_id, d.flespi_device_type_name,
         d.media_ttl, d.messages_ttl, d.created_by,
         d.service_type, d.cost_by_km,
         st.name AS service_type_name
  FROM new_settings_devices d
  LEFT JOIN device_service_type st ON d.service_type = st.id
  WHERE d.flespiId = ?
`;

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
  const sql = `
  SELECT d.id, d.name, d.traccarId, d.flespiId, d.device_type_id, d.uniqueId, d.groupId,
         d.phone, d.model, d.contact, d.category, d.expirationTime, d.disabled,
         d.attributes, d.userId, d.traccar_status, d.traccar_lastUpdate,
         d.flespi_protocol_name, d.flespi_protocol_id, d.flespi_device_type_name,
         d.media_ttl, d.messages_ttl, d.created_by,
         d.service_type, d.cost_by_km,
         st.name AS service_type_name
  FROM new_settings_devices d
  LEFT JOIN device_service_type st ON d.service_type = st.id
  WHERE d.traccarId = ?
`;

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
  const sql = `
  SELECT d.id, d.name, d.traccarId, d.flespiId, d.device_type_id, d.uniqueId, d.groupId,
         d.phone, d.model, d.contact, d.category, d.expirationTime, d.disabled,
         d.attributes, d.userId, d.traccar_status, d.traccar_lastUpdate,
         d.flespi_protocol_name, d.flespi_protocol_id, d.flespi_device_type_name,
         d.media_ttl, d.messages_ttl, d.created_by, d.shift_assigned,
         d.service_type, d.cost_by_km,
         st.name AS service_type_name
  FROM new_settings_devices d
  LEFT JOIN device_service_type st ON d.service_type = st.id
  WHERE d.userId = ?
`;

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

export const getDevicesByIds = async (deviceIds) => {
  const sql = `SELECT id, name from new_settings_devices WHERE id IN (?)`;
  const values = [deviceIds];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`getDevicesByIds failed: ${error.message}`);
  }
};

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
      flespi_metadata = ?,
      cost_by_km = ?,
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
    parseInt(data.costByKm),
    // data.service_type,
    id,
  ];

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

export const saveNewServiceType = async (body) => {
  const { name, userId, icon_url } = body;

  const sql = `INSERT INTO device_service_type (name, user_id, icon_url) VALUE (?, ?, ?)`;

  const values = [name, userId, icon_url];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`saveNewServiceType failed: ${error.message}`);
  }
};

export const fetchAllServiceTypes = async () => {
  const sql = "SELECT * FROM device_service_type";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const serviceById = async (id) => {
  const sql = "SELECT * FROM device_service_type WHERE id = ?";
  const values = [id];

  return new Promise((resolve, reject) => {
    dbQuery(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]);
    });
  });
};

export const modifyServiceType = async (id, body) => {
  const { name, icon_url } = body;

  let sql = `UPDATE device_service_type SET name = ?`;
  const values = [name];

  if (icon_url) {
    sql += `, icon_url = ?`;
    values.push(icon_url);
  }

  sql += ` WHERE id = ?`;
  values.push(id);

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`modifyServiceType failed: ${error.message}`);
  }
};

export const removeServiceType = async (id) => {
  const sql = "DELETE FROM device_service_type WHERE id = ?";
  const values = [id];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`removeServiceType failed: ${error.message}`);
  }
};

export const saveNewSubService = async (body) => {
  const { name, user_id, service_type } = body;
  const sql = `INSERT INTO service_type_subservices (name, user_id, service_type) VALUES (?, ?, ?)`;
  const values = [name, user_id, service_type];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`saveNewSubService failed: ${error.message}`);
  }
};

export const fetchAllSubServices = async () => {
  const sql = `
        SELECT s.*, d.name AS service_type_name
        FROM service_type_subservices s
        JOIN device_service_type d ON s.service_type = d.id
    `;

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) reject(err);
      resolve(results);
    });
  });
};

export const getSubServiceById = async (id) => {
  const sql = `SELECT * FROM service_type_subservices WHERE id = ?`;
  const values = [id];

  return new Promise((resolve, reject) => {
    dbQuery(sql, values, (err, results) => {
      if (err) reject(err);
      resolve(results[0]);
    });
  });
};

export const modifySubService = async (id, body) => {
  const { name, service_type } = body;

  const sql = `UPDATE service_type_subservices SET name = ?, service_type = ? WHERE id = ?`;
  const values = [name, service_type, id];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`modifySubService failed: ${error.message}`);
  }
};

export const removeSubService = async (id) => {
  const sql = `DELETE FROM service_type_subservices WHERE id = ?`;
  const values = [id];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`removeSubService failed: ${error.message}`);
  }
};

export const existingCombination = async (deviceIds, serviceIds) => {
  const sql = `
    SELECT device_id, service_type_id
    FROM device_service_relations
    WHERE device_id IN (?) AND service_type_id IN (?);
  `;

  const values = [deviceIds, serviceIds];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`existingCombination failed: ${error.message}`);
  }
};

export const bulkServiceUpdate = async (newAssignments) => {
  const values = newAssignments.map((assign) => [
    assign.deviceId,
    assign.serviceId,
  ]);

  const sql = `
    INSERT IGNORE INTO device_service_relations (device_id, service_type_id)
    VALUES ?
  `;

  try {
    const result = await dbQuery(sql, [values]);
    return result;
  } catch (error) {
    throw new Error(`bulkServiceUpdate failed: ${error.message}`);
  }
};

export const getAssignedServicesByDeviceId = async (deviceId) => {
  const sql = `
      SELECT ds.device_id, ds.service_type_id, st.name AS service_name
      FROM device_service_relations ds
      LEFT JOIN device_service_type st ON ds.service_type_id = st.id
      WHERE ds.device_id = ?
    `;

  const values = [deviceId];
  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`getAssignedServicesByDeviceId failed: ${error.message}`);
  }
};

export const unassignServicesForDevice = async (deviceId, serviceIds) => {
  const sql = `
      DELETE FROM device_service_relations
      WHERE device_id = ? AND service_type_id IN (?)
    `;

  const values = [deviceId, serviceIds];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`unassignServicesForDevice failed: ${error.message}`);
  }
};

export const getDeviceServices = async (deviceIds) => {
  const sql = `
    SELECT ds.device_id, ds.service_type_id, st.name AS service_name
    FROM device_service_relations ds
    LEFT JOIN device_service_type st ON ds.service_type_id = st.id
    WHERE ds.device_id IN (?)
  `;

  const values = [deviceIds];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    throw new Error(`getDeviceServices failed: ${error.message}`);
  }
};

export const allDevicesIdName = async () => {
  const sql = "SELECT id, name FROM new_settings_devices WHERE disabled = 0";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const devicesWithServices = async (deviceId) => {
  const servicesQuery = `
          SELECT st.id AS service_id, st.name AS service_name
          FROM device_service_relations ds
          JOIN device_service_type st ON ds.service_type_id = st.id
          WHERE ds.device_id = ?
        `;
  const values = [deviceId];

  return new Promise((resolve, reject) => {
    dbQuery(servicesQuery, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};
