import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const newSubaccount = async (data) => {
  const { default_realm, default_realm_user, user_role, calcs_id } = data;

  const sql = `
        INSERT INTO settings_users (
          userId,
          traccarId,
          flespiId,
          deviceLimit,
          name,
          email,
          phone,
          attributes,
          poiLayer,
          twelveHourFormat,
          map,
          coordinateFormat,
          latitude,
          longitude,
          zoom,
          expirationTime,
          userLimit,
          administrator,
          readonly,
          deviceReadonly,
          limitCommands,
          disableReports,
          fixedEmail,
          calcs_id,
          flespi_metadata,
          default_realm,
          default_realm_user,
          user_role
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

  const values = [
    data.userId,
    data.traccar.id,
    data.flespi.id,
    data.traccar.deviceLimit,
    data.traccar.name,
    data.traccar.email,
    data.traccar.phone,
    JSON.stringify(data.traccar.attributes),
    data.traccar.poiLayer,
    data.traccar.twelveHourFormat,
    data.traccar.map,
    data.traccar.coordinateFormat,
    data.traccar.latitude,
    data.traccar.longitude,
    data.traccar.zoom,
    data.traccar.expirationTime,
    data.traccar.userLimit,
    data.traccar.administrator,
    data.traccar.readonly,
    data.traccar.deviceReadonly,
    data.traccar.limitCommands,
    data.traccar.disableReports,
    data.traccar.fixedEmail,
    JSON.stringify(calcs_id),
    JSON.stringify(data.flespi.metadata),
    JSON.stringify(default_realm),
    JSON.stringify(default_realm_user),
    user_role,
  ];

  try {
    const result = await dbQuery(sql, values);
    return result.insertId;
  } catch (err) {
    throw err;
  }
};

export const newSubaccount2 = async (body) => {
  const sql = `
        INSERT INTO settings_users (
          userId,
          traccarId,
          flespiId,
          deviceLimit,
          name,
          email,
          phone,
          attributes,
          poiLayer,
          twelveHourFormat,
          map,
          coordinateFormat,
          latitude,
          longitude,
          zoom,
          expirationTime,
          userLimit,
          administrator,
          readonly,
          deviceReadonly,
          limitCommands,
          disableReports,
          fixedEmail,
          flespi_metadata
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
      `;

  const values = [];

  try {
    const result = await dbQuery(sql, values);
    return result.insertId;
  } catch (err) {
    throw err;
  }
};

export const allSubaccounts = async () => {
  const sql =
    "SELECT id, traccarId, flespiId, deviceLimit, userId, name, email, phone, attributes, poiLayer, twelveHourFormat, map, coordinateFormat, latitude, longitude, zoom, expirationTime, userLimit, administrator, readonly, deviceReadonly, limitCommands,disableReports, fixedEmail, created_at FROM settings_users";

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
};

export const subaccountById = async (id) => {
  const sql =
    "SELECT id, traccarId, flespiId, deviceLimit, userId, name, email, phone, attributes, poiLayer, twelveHourFormat, map, coordinateFormat, latitude, longitude, zoom, expirationTime, userLimit, administrator, readonly, deviceReadonly, limitCommands, disableReports, fixedEmail, created_at FROM settings_users WHERE id =?";

  try {
    const result = await dbQuery(sql, [parseInt(id)]);
    if (result.length > 0) {
      const device = result[0];
      device.attributes = JSON.parse(device?.attributes);
      return device;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

export const subaccountByTraccarId = async (traccarId) => {
  const sql = "SELECT * FROM settings_users WHERE traccarId = ?";
  const values = [parseInt(traccarId)];

  try {
    const result = await dbQuery(sql, values);
    if (result.length > 0) {
      const device = result[0];
      device.attributes = JSON.parse(device?.attributes);
      return device;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

export const userAssignedCustomCalcs = async (traccarId) => {
  const sql = `SELECT custom_calcs FROM settings_users WHERE traccarId = ?`;

  const values = [parseInt(traccarId)];

  try {
    const result = await dbQuery(sql, values);
    if (result.length > 0) {
      return result[0].custom_calcs;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

export const subaccountByUserId = async (userId) => {
  const sql =
    "SELECT id, traccarId, flespiId, deviceLimit, userId, name, email, phone, attributes, poiLayer, twelveHourFormat, map, coordinateFormat, latitude, longitude, zoom, expirationTime, userLimit, administrator, readonly, deviceReadonly, limitCommands,disableReports, fixedEmail, created_at FROM settings_users WHERE userId = ?";

  const values = [parseInt(userId)];

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
};

export const subaccountUserLimit = async (traccarId) => {
  const sql = "SELECT userLimit FROM settings_users WHERE traccarId =?";

  const values = [parseInt(traccarId)];

  try {
    const result = await dbQuery(sql, values);
    if (result.length > 0) {
      return result[0].userLimit;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

export const subaccountDeviceLimit = async (traccarId) => {
  const sql = "SELECT deviceLimit FROM settings_users WHERE traccarId =?";

  const values = [parseInt(traccarId)];

  try {
    const result = await dbQuery(sql, values);
    if (result.length > 0) {
      return result[0].deviceLimit;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

export const updateSubaccountById = async (id, updatedData) => {
  const sql = `
    UPDATE settings_users
    SET
      traccarId = ?,
      flespiId = ?,
      deviceLimit = ?,
      name = ?,
      email = ?,
      phone = ?,
      attributes = ?,
      poiLayer = ?,
      twelveHourFormat = ?,
      map = ?,
      coordinateFormat = ?,
      latitude = ?,
      longitude = ?,
      zoom = ?,
      expirationTime = ?,
      userLimit = ?,
      administrator = ?,
      readonly = ?,
      deviceReadonly = ?,
      limitCommands = ?,
      disableReports = ?,
      fixedEmail = ?,
      flespi_metadata = ?
    WHERE id = ?;
  `;

  const values = [
    updatedData.traccar.id,
    updatedData.flespi.id,
    updatedData.traccar.deviceLimit,
    updatedData.traccar.name,
    updatedData.traccar.email,
    updatedData.traccar.phone,
    JSON.stringify(updatedData.traccar.attributes),
    updatedData.traccar.poiLayer,
    updatedData.traccar.twelveHourFormat,
    updatedData.traccar.map,
    updatedData.traccar.coordinateFormat,
    updatedData.traccar.latitude,
    updatedData.traccar.longitude,
    updatedData.traccar.zoom,
    updatedData.traccar.expirationTime,
    updatedData.traccar.userLimit,
    updatedData.traccar.administrator,
    updatedData.traccar.readonly,
    updatedData.traccar.deviceReadonly,
    updatedData.traccar.limitCommands,
    updatedData.traccar.disableReports,
    updatedData.traccar.fixedEmail,
    JSON.stringify(updatedData.flespi.metadata),
    id,
  ];

  try {
    const result = await dbQuery(sql, values);
    if (result.affectedRows === 0) {
      throw new Error(`User with ID ${id} not found.`);
    }

    const updatedUser = {
      id,
      traccar: { ...updatedData.traccar },
      flespi: { ...updatedData.flespi },
    };

    return updatedUser;
  } catch (err) {
    throw err;
  }
};

export const deleteSubaccountById = async (id) => {
  const sql = `
        DELETE FROM settings_users
        WHERE
            id = ?;
    `;

  const values = [id];

  try {
    const result = await dbQuery(sql, values);
    return result.affectedRows;
  } catch (err) {
    throw err;
  }
};
