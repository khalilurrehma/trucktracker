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
