import pool from "../config/dbConfig.js";
import util from "util";
import { processTimeTemplate } from "../model/dispatch.js";
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
  const query = `UPDATE case_stage_tracking SET status = 'delayed', end_time = ? WHERE case_id = ? AND status = 'pending' AND stage_name = 'Reception Case' LIMIT 1`;
  return await dbQuery(query, [new Date(), caseId]);
};

export const markCaseStage = async (caseId, status) => {
  const query = `UPDATE case_stage_tracking SET status = ?, end_time = ? WHERE case_id = ? AND status = 'pending' AND stage_name = 'Reception Case' LIMIT 1`;
  return await dbQuery(query, [status, new Date(), caseId]);
};

export const driverOnTheWayStage = async (caseId) => {
  const query = `SELECT * FROM case_stage_tracking WHERE case_id = ? AND stage_name = 'On the way' LIMIT 1`;

  try {
    const result = await dbQuery(query, [caseId]);
    return result[0];
  } catch (error) {
    return error;
  }
};

export const updateOnTheWayStageStatus = async (caseId, status) => {
  const query = `UPDATE case_stage_tracking SET status = ?, end_time = ? WHERE case_id = ? AND stage_name = 'On the way'`;
  return await dbQuery(query, [status, new Date(), caseId]);
};

export const onTheWayStageStatusCheck = async (case_id) => {
  try {
    const stage = await driverOnTheWayStage(case_id);

    if (stage && stage.status === "on the way") {
      console.log(`Driver is already ${stage.status} to the address`);
      return;
    }
    await updateOnTheWayStageStatus(case_id, "delayed");
  } catch (error) {
    console.log("Error in on the way stage delay", error);
  }
};

export const defaultTemplateTime = async (key) => {
  const defaultTemplate = await processTimeTemplate();

  const initialStage = defaultTemplate.find((stage) => stage.stage_key === key);

  return initialStage;
};
