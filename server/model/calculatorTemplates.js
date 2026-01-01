import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const getCalculatorTemplatesByType = async (type) => {
  const sql = `
    SELECT id, type, name, file_path
    FROM calculator_templates
    WHERE type = ?
  `;

  return dbQuery(sql, [type]);
};
