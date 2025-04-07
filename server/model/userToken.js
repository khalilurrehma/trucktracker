import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const createUTF = async (data) => {
  const sql = `
    INSERT INTO settings_uft (userId, email, ips, token_id, expire, created, token, ttl, info, cid, access_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      userId = VALUES(userId),
      email = VALUES(email),
      ips = VALUES(ips),
      token_id = VALUES(token_id),
      expire = VALUES(expire),
      created = VALUES(created),
      ttl = VALUES(ttl),
      info = VALUES(info),
      access_type = VALUES(access_type),
      token = VALUES(token);
      `;

  const values = [
    data.userId,
    data.email,
    data.ips,
    data.id,
    data.expire,
    data.created,
    data.key,
    data.ttl,
    data.info,
    data.cid,
    data.access.type,
  ];

  try {
    const result = await dbQuery(sql, values);
    return result.insertId;
  } catch (err) {
    throw err;
  }
};

export const createUFT2 = async (data) => {
  const sql = `
  INSERT INTO settings_uft (userId, email, token, cid, access_type)
  VALUES (?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    userId = VALUES(userId),
    email = VALUES(email),
    access_type = VALUES(access_type);
  `;

  const values = [
    data.userId,
    data.email,
    data.key,
    data.cid,
    data.access_type,
  ];

  try {
    const result = await dbQuery(sql, values);
    return result.insertId;
  } catch (err) {
    throw err;
  }
};

export const getUTFByUserId = async (userId) => {
  const sql = `
      SELECT *
      FROM settings_uft
      WHERE userId = ?;
    `;

  const values = [userId];

  try {
    const result = await dbQuery(sql, values);
    return result[0];
  } catch (err) {
    throw err;
  }
};
