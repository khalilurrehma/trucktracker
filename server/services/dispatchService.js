import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const getDispatchCaseAction = async (case_id) => {
  const sql = `SELECT action FROM dispatch_case_actions WHERE case_id = ?`;

  try {
    const result = await dbQuery(sql, [case_id]);
    return result[0];
  } catch (error) {
    return error;
  }
};

export const markCaseStageAsDelayed = async (caseId) => {
  const query = `UPDATE case_stage_tracking SET status = 'delayed', end_time = ? WHERE case_id = ? AND status = 'pending'`;
  return await dbQuery(query, [new Date(), caseId]);
};
