import pool from "../config/dbConfig.js";

export const getAllDrivers = async () => {
  const sql = "SELECT * FROM drivers";

  return new Promise((resolve, reject) => {
    pool.query(sql, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
};
