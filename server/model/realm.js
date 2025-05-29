import pool from "../config/dbConfig.js";

export const addNewRealm = (dbBody) => {
  const {
    flespi_realm_id,
    realm_owner_id,
    flespi_realm_name,
    flespi_realm_cid,
    flespi_realm_public_id,
    flespi_realm_config,
    flespi_subaccount_id,
    userId,
  } = dbBody;
  const sql = `INSERT INTO realm (flespi_realm_id, realm_owner_id, flespi_realm_name, flespi_realm_cid, flespi_realm_public_id, flespi_realm_config, flespi_subaccount_id, userId, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

  const values = [
    flespi_realm_id,
    realm_owner_id,
    flespi_realm_name,
    flespi_realm_cid,
    flespi_realm_public_id,
    flespi_realm_config,
    flespi_subaccount_id,
    userId,
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

export const allRealms = () => {
  const sql = `SELECT * FROM realm`;

  return new Promise((resolve, reject) => {
    pool.query(sql, (err, results) => {
      if (err) {
        reject(err);
      }

      resolve(results);
    });
  });
};
export const realmById = (id) => {
  const sql = `SELECT * FROM realm WHERE flespi_realm_id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }

      resolve(results);
    });
  });
};

export const allRealmsByUserId = (userId) => {
  const sql = `SELECT * FROM realm WHERE userId =?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const realmByTraccarId = (traccarId) => {
  const sql = `SELECT * FROM realm WHERE realm_owner_id =?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [traccarId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const realmIdByTraccarId = (traccarId) => {
  const sql = `SELECT flespi_realm_id FROM realm WHERE realm_owner_id =?`;
  return new Promise((resolve, reject) => {
    pool.query(sql, [traccarId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]?.flespi_realm_id || null);
    });
  });
};

export const addNewRealmUser = async (body) => {
  const {
    flespi_user_id,
    realm_id,
    userId,
    realm_user_body,
    traccar_user_body,
    token,
  } = body;

  const sql = `INSERT INTO realm_users (flespi_user_id, realm_id, userId, realm_user_body, traccar_user_body, token, created_at) VALUES (?,?,?,?,?,?,NOW())`;

  const values = [
    flespi_user_id,
    realm_id,
    userId,
    JSON.stringify(realm_user_body),
    JSON.stringify(traccar_user_body),
    token,
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

export const realmAllUser = async (realmId) => {
  const sql = `SELECT * FROM realm_users WHERE realm_id =?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [realmId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const realmUserById = async (id) => {
  const sql = `SELECT * FROM realm_users WHERE id =?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const realmUserTraccarIdByflespiId = (flespiId) => {
  const sql = `SELECT traccar_user_body->>'$.id' AS traccar_id
        FROM realm_users
        WHERE flespi_user_id = ?;`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [flespiId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]?.traccar_id ? Number(results[0].traccar_id) : null);
    });
  });
};

export const realmUserByTraccarId = async (id) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT * FROM realm_users WHERE JSON_EXTRACT(traccar_user_body, '$.id') = ?;`,
      [parseInt(id)],
      (err, results) => {
        if (err) {
          reject(err);
        }

        resolve(results);
      }
    );
  });
};

export const realmUserByUserId = async (realmId, userId) => {
  const sql = `SELECT * FROM realm_users WHERE realm_id =? AND userId =?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [realmId, userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const subaccountUserCount = async (userId) => {
  const sql = `SELECT COUNT(*) as count FROM realm_users WHERE userId =?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0].count);
    });
  });
};

export const putRealmUser = async (body) => {
  const { flespi_user_id, realm_id, realm_user_body } = body;

  const sql = `UPDATE realm_users 
               SET realm_user_body = JSON_SET(realm_user_body, '$.name', ?), 
                   updated_at = NOW() 
               WHERE realm_id = ? 
               AND flespi_user_id = ?`;

  const values = [realm_user_body, realm_id, flespi_user_id];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const removeRealmUser = async (realmId, id) => {
  const sql = `DELETE FROM realm_users WHERE realm_id =? AND id =?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [realmId, id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const realmUserTraccarIdsByUserId = async (userId) => {
  const sql = `
    SELECT JSON_UNQUOTE(JSON_EXTRACT(traccar_user_body, '$.id')) AS traccar_id
    FROM realm_users
    WHERE userId = ?
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, [userId], (err, results) => {
      if (err) {
        return reject(err);
      }

      const traccarIds = results
        .map((row) => parseInt(row.traccar_id))
        .filter((id) => id !== null);
      resolve(traccarIds);
    });
  });
};
