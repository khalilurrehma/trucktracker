import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const saveCalculator = async (data) => {
  const { calc_id, name, calcs_body, calc_type } = data;

  const sql = `
        INSERT INTO calculators
        (calc_id, name, calcs_body, calc_type)
        VALUES (?, ?, ?, ?)
    `;

  const values = [
    calc_id,
    name,
    JSON.stringify(calcs_body),
    JSON.stringify(calc_type),
  ];

  return new Promise((resolve, reject) => {
    dbQuery(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const getAllCalculators = async () => {
  const sql = "SELECT * FROM calculators";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const getCalculatorById = async (id) => {
  const sql = "SELECT * FROM calculators WHERE id =?";

  return new Promise((resolve, reject) => {
    dbQuery(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]);
    });
  });
};

export const getCalculatorByCalcId = async (calcId) => {
  const sql = "SELECT * FROM calculators WHERE calc_id =?";

  return new Promise((resolve, reject) => {
    dbQuery(sql, [calcId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]);
    });
  });
};

export const superAdminDefaultCalc = async () => {
  const sql = `SELECT * FROM calculators WHERE JSON_EXTRACT(calc_type, '$.id') = 0;`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const superAdminCustomCalc = async () => {
  const sql = `SELECT * FROM calculators WHERE JSON_EXTRACT(calc_type, '$.id') = 1;`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const superAdminNotificationCalc = async () => {
  const sql = `SELECT * FROM calculators WHERE JSON_EXTRACT(calc_type, '$.id') = 2;`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const extractDefaultCalcsId = async () => {
  const sql = `SELECT calc_id FROM calculators WHERE JSON_EXTRACT(calc_type, '$.id') = 0;`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      const idsOnly = results?.map((id) => id.calc_id);
      resolve(idsOnly);
    });
  });
};

export const defaultCalcsBody = async () => {
  const sql = `SELECT calc_id, calcs_body FROM calculators WHERE JSON_EXTRACT(calc_type, '$.id') = 0;`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      const formattedData = results.reduce((acc, row) => {
        acc[parseInt(row.calc_id)] = JSON.parse(row.calcs_body);

        return acc;
      }, {});

      resolve(formattedData);
    });
  });
};

export const modifyCalculator = async (data) => {
  const { id, name, calcs_body } = data;

  const sql = `
        UPDATE calculators
        SET name =?, calcs_body =?
        WHERE id =?
    `;

  const values = [name, JSON.stringify(calcs_body), id];

  return new Promise((resolve, reject) => {
    dbQuery(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const removeCalculator = async (id) => {
  const sql = "DELETE FROM calculators WHERE id =?";

  return new Promise((resolve, reject) => {
    dbQuery(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const removeCalculatorByCalcId = async (calcId) => {
  const sql = "DELETE FROM calculators WHERE calc_id =?";

  return new Promise((resolve, reject) => {
    dbQuery(sql, [calcId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const updateCustomCalcInSubaccount = async (
  calcIds,
  traccarId,
  action
) => {
  try {
    const checkSql = `SELECT custom_calcs FROM settings_users WHERE traccarId = ?;`;
    const existingRecords = await dbQuery(checkSql, [traccarId]);

    let updatedCalcs = [];

    if (existingRecords.length > 0 && existingRecords[0].custom_calcs) {
      try {
        updatedCalcs = JSON.parse(existingRecords[0].custom_calcs);
        if (!Array.isArray(updatedCalcs)) {
          updatedCalcs = [];
        }
      } catch (err) {
        console.error("Error parsing custom_calcs:", err);
        updatedCalcs = [];
      }
    }

    if (action === "assign") {
      updatedCalcs = [...new Set([...updatedCalcs, ...calcIds])];
    } else if (action === "unassign") {
      updatedCalcs = updatedCalcs.filter((id) => !calcIds.includes(id));
    }

    const finalCalcs =
      updatedCalcs.length === 0 ? null : JSON.stringify(updatedCalcs);

    const updateSql = `
      UPDATE settings_users
      SET custom_calcs = ?
      WHERE traccarId = ?;
    `;

    return new Promise((resolve, reject) => {
      dbQuery(updateSql, [finalCalcs, traccarId], (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results);
      });
    });
  } catch (error) {
    console.error("Database Update Error:", error);
    throw error;
  }
};
