import pool from "../config/dbConfig.js";

export const getAllNewUsers = async () => {
  const sql = "SELECT * FROM SETTINGS_USERS";

  return new Promise((resolve, reject) => {
    pool.query(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const newUserById = async (id) => {
  const sql = "SELECT * FROM SETTINGS_USERS WHERE id =?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]);
    });
  });
};

export const newUserByUserId = async (userId) => {
  const sql = "SELECT * FROM SETTINGS_USERS WHERE userId =?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]);
    });
  });
};

export const modifyNewUser = (id, updatedData) => {
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

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const removeNewUser = (id) => {
  const sql = "DELETE FROM SETTINGS_USERS WHERE id =?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};
