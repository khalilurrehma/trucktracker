import pool from "../config/dbConfig.js";

export const addDriver = async (body) => {
  const { userId, traccarId, name, uniqueId, attributes, location } = body;

  const sql = `
      INSERT INTO drivers
        (user_id, traccar_id, name, unique_id, attributes, location, assigned, deleted_at, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NOW(), NOW())
    `;

  const values = [
    userId,
    traccarId,
    name,
    uniqueId,
    JSON.stringify(attributes),
    JSON.stringify(location),
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

export const fetchDrivers = async () => {
  const sql = "SELECT * FROM drivers";

  return new Promise((resolve, reject) => {
    pool.query(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchDriversByUserId = async (userId) => {
  const sql = "SELECT * FROM drivers WHERE user_id =?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [parseInt(userId)], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchDriver = async (id) => {
  const sql = "SELECT * FROM drivers where id = ?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const updateDriver = async (id, body) => {
  const { name, uniqueId, attributes, location } = body;

  const sql =
    "UPDATE drivers SET name = ?, uniqueId = ?, attributes = ?, location = ? WHERE id = ?";

  const values = [
    name,
    uniqueId,
    JSON.stringify(attributes),
    JSON.stringify(location),
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

export const removeDriver = async (id) => {
  const sql = "DELETE FROM drivers WHERE id = ?";
  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const updateDriverAvailability = async (id, details) => {
  const sql = `UPDATE drivers SET availability_details = ?, updated_at = NOW() WHERE id = ?`;

  const values = [JSON.stringify(details), id];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchDriverAvailability = async (id) => {
  const sql = "SELECT availability_details FROM drivers WHERE id = ?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]);
      }
    });
  });
};

export const driversShiftDetails = async (userId) => {
  const superAdminSql = `SELECT traccar_id, name, availability_details FROM drivers`;
  const sql = `SELECT traccar_id, name, availability_details FROM drivers WHERE user_id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(userId ? sql : superAdminSql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const cron_logs = async (log_body) => {
  const {
    device_id,
    device_name,
    cron_type,
    cron_expression,
    scheduled_time,
    status = "success",
    notes = "",
  } = log_body;

  const sql = `
    INSERT INTO device_cron_logs (
      device_id, device_name, cron_type, cron_expression,
      scheduled_time, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    device_id,
    device_name,
    cron_type,
    cron_expression,
    scheduled_time,
    status,
    notes,
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
