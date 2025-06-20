import pool from "../config/dbConfig.js";
import util from "util";
import {
  findCaseReportById,
  getCaseActionTime,
  getCaseLastUpdated,
  processTimeTemplate,
} from "../model/dispatch.js";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { EventEmitter } from "events";
const dbQuery = util.promisify(pool.query).bind(pool);

dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);

export const DispatchEmitter = new EventEmitter();

export const checkAndMarkDelayedCase = async (caseId) => {
  try {
    const stage = await getDispatchCaseAction(caseId);

    if (
      (stage && stage?.action === "accept") ||
      (stage && stage?.action === "reject")
    ) {
      console.log(`Driver already responded for case ${caseId}`);
      let status = stage?.action === "accept" ? "accepted" : "rejected";

      markCaseStage(caseId, status);
      return;
    }

    await markCaseStageAsDelayed(caseId);
    console.log(`Case ${caseId} is marked as delayed`);
  } catch (error) {
    console.error("Error in delay check:", error.message);
  }
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

export const checkReportAuthorizedStatus = async (caseId) => {
  try {
    const caseData = await findCaseReportById(caseId);

    const authorized = caseData[0]?.authorized_status === 1 ? true : false;

    if (authorized) {
      await adminAuthorizationRequestStage(caseId, "approved");
      console.log(`Case ${caseId} is authorized`);
      return;
    }
    await adminAuthorizationRequestStage(caseId, "delayed");
  } catch (error) {
    console.log("Error in authorized status", error);
  }
};

export const getDispatchCaseAction = async (case_id) => {
  const sql = `SELECT action FROM dispatch_case_actions WHERE case_id = ?`;

  try {
    const result = await dbQuery(sql, [case_id]);
    return result[0];
  } catch (error) {
    return error;
  }
};

export const defaultTemplateTime = async (key) => {
  const defaultTemplate = await processTimeTemplate();

  const initialStage = defaultTemplate.find((stage) => stage.stage_key === key);

  return initialStage;
};

export const markCaseStageAsDelayed = async (caseId) => {
  const now = dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss");
  const query = `UPDATE case_stage_tracking SET status = 'delayed', end_time = ? WHERE case_id = ? AND status = 'pending' AND stage_name = 'Reception Case' LIMIT 1`;
  return await dbQuery(query, [now, caseId]);
};

export const markCaseStage = async (caseId, status) => {
  const now = dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss");
  const query = `UPDATE case_stage_tracking SET status = ?, end_time = ? WHERE case_id = ? AND status = 'pending' AND stage_name = 'Reception Case' LIMIT 1`;
  return await dbQuery(query, [status, now, caseId]);
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
  const now = dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss");
  const query = `UPDATE case_stage_tracking SET status = ?, end_time = ? WHERE case_id = ? AND stage_name = 'On the way'`;
  return await dbQuery(query, [status, now, caseId]);
};

export const getLatestActiveCaseByDeviceId = async (deviceId) => {
  const sql = `
    SELECT 
      dcd.dispatch_case_id,
      JSON_UNQUOTE(JSON_EXTRACT(dc.position, '$.lat')) AS latitude,
      JSON_UNQUOTE(JSON_EXTRACT(dc.position, '$.lng')) AS longitude
    FROM 
      dispatch_case_devices dcd
    JOIN 
      dispatch_cases dc ON dc.id = dcd.dispatch_case_id
    WHERE 
      dcd.device_id = ?
      AND dc.status = 'in progress'
    ORDER BY 
      dcd.id DESC
    LIMIT 1
  `;

  try {
    const result = await dbQuery(sql, [deviceId]);
    return result[0];
  } catch (error) {
    console.error("Error fetching latest active case by deviceId:", error);
    throw error;
  }
};

export const isOnTheWayStageExists = async (case_id) => {
  const sql = `
    SELECT id FROM case_stage_tracking 
    WHERE case_id = ? AND stage_name = 'On the way'`;

  const result = await dbQuery(sql, [case_id]);
  return !!result.length;
};

export const currentCaseProcess = async (case_id) => {
  const sql = `SELECT current_subprocess FROM dispatch_cases WHERE id = ? AND current_subprocess IS NOT NULL`;

  try {
    const result = await dbQuery(sql, [case_id]);
    return result[0];
  } catch (error) {
    console.error("Error fetching current case process:", error);
    throw error;
  }
};

export const isInReferenceStageExists = async (case_id) => {
  const sql = `
    SELECT id FROM case_stage_tracking 
    WHERE case_id = ? AND stage_name = 'In Reference'`;

  const result = await dbQuery(sql, [case_id]);
  return !!result.length;
};

export const saveInReferenceStage = async (case_id) => {
  let now = dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss");
  const sql = `
    INSERT INTO case_stage_tracking 
    (case_id, stage_name, status, expected_duration, start_time) 
    VALUES (?, 'In Reference', 'confirmed', 150, ?)`;

  await dbQuery(sql, [case_id, now]);
};

export const saveAuthorizationRequestStage = async (
  case_id,
  expected_duration
) => {
  let now = dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss");
  const sql = `
    INSERT INTO case_stage_tracking (case_id, stage_name, status, expected_duration, start_time)
    VALUES 
      (?, 'Authorization Request', 'sent', 150, ?),
      (?, 'Supervisor Approval', 'pending', ?, ?)
  `;

  const values = [case_id, now, case_id, expected_duration, now];
  await dbQuery(sql, values);
};

export const adminAuthorizationRequestStage = async (case_id, status) => {
  const sql = `
    UPDATE case_stage_tracking SET status = ? WHERE case_id = ? AND stage_name = 'Supervisor Approval' AND status = 'pending' LIMIT 1
  `;

  await dbQuery(sql, [status, case_id]);
};

export const calculateDriverServiceTime = async (caseId) => {
  try {
    const [acceptedTime, completedTime] = await Promise.all([
      getCaseActionTime(caseId),
      getCaseLastUpdated(caseId),
    ]);

    if (!acceptedTime || !completedTime) {
      throw new Error("Timestamps not found");
    }

    const start = dayjs(acceptedTime);
    const end = dayjs(completedTime);
    const diffInSeconds = end.diff(start, "second");

    const dur = dayjs.duration(diffInSeconds, "seconds");

    const durationText = `${dur.hours()}h ${dur.minutes()}m ${dur.seconds()}s`;

    return {
      acceptedTime,
      completedTime,
      totalSeconds: diffInSeconds,
      durationText,
    };
  } catch (error) {
    console.error("Error calculating driver service time:", error);
  }
};
