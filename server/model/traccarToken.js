import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const insertTraccarToken = async (data) => {
  const sql = `
    INSERT INTO traccar_user_tokens (traccar_user_id, token)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          token = VALUES(token);
      `;

  try {
    await pool.query(sql, [data.userId, data.traccar_token]);
    console.log("Data inserted successfully.");
    return true;
  } catch (error) {
    console.error("Error while inserting data:", error);
    return false;
  }
};

export function getTraccarToken(callback) {
  const TraccarTokenSql = "SELECT * FROM traccar_user_tokens";
  pool.query(TraccarTokenSql, (error, TraccarTokenResults) => {
    if (error) {
      console.error("Error:", error);
      callback(error, null);
    } else {
      callback(null, TraccarTokenResults);
    }
  });
}

export function getTraccarTokenById(traccarUserId, callback) {
  const TraccarTokenByIdSql =
    "SELECT * FROM traccar_user_tokens WHERE traccar_user_id = ?";
  pool.query(
    TraccarTokenByIdSql,
    [traccarUserId],
    (error, TraccarTokenByIdResults) => {
      if (error) {
        console.error("Error:", error);
        callback(error, null);
      } else {
        callback(null, TraccarTokenByIdResults);
      }
    }
  );
}
