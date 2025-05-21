import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const addNewCase = async (body) => {
  const {
    assigned_device_id,
    user_id,
    case_name,
    case_address,
    cost,
    message,
    file_url,
  } = body;

  const query = `
    INSERT INTO dispatch_cases (
      assigned_device_id,
      user_id,
      case_name,
      case_address,
      status,
      message,
      cost,
      file_url
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
  `;

  const values = [
    assigned_device_id,
    user_id,
    case_name,
    case_address,
    message,
    cost,
    file_url,
  ];

  try {
    const result = await dbQuery(query, values);

    return result;
  } catch (error) {
    console.error("Error inserting dispatch case:", error);
    return error;
  }
};

export const fetchDispatchCases = async () => {
  const query = `SELECT * FROM dispatch_cases ORDER BY created_at DESC`;

  try {
    const rows = await dbQuery(query);
    return rows;
  } catch (error) {
    console.error("Error fetching dispatch cases:", error);
    return error;
  }
};

export const findCaseStatusById = async (caseId) => {
  const query = `SELECT status FROM dispatch_cases WHERE id = ?`;

  try {
    const rows = await dbQuery(query, [parseInt(caseId)]);
    return rows;
  } catch (error) {
    return error;
  }
};

export const findCaseById = async (id) => {
  const sql = `SELECT * FROM dispatch_cases WHERE id = ?`;

  try {
    const rows = await dbQuery(sql, [id]);
    return rows[0];
  } catch (error) {
    console.error("Error fetching dispatch cases:", error);
    return error;
  }
};

export const findCaseReportById = async (caseId) => {
  const sql = `SELECT 
  dcr.id AS report_id,
  dcr.case_id,
  dc.case_name,
  dc.status,
  dcr.suggested_services,
  dcr.subservices,
  dcr.additional_information,
  dcr.photos,
  dcr.created_at,
  dcr.updated_at
  FROM dispatch_case_reports dcr
  JOIN dispatch_cases dc ON dcr.case_id = dc.id;
`;

  try {
    const rows = await dbQuery(sql, [caseId]);
    return rows;
  } catch (error) {
    console.error("Error fetching dispatch cases:", error);
    return error;
  }
};

export const updateCaseServiceById = async (fields, case_id) => {
  const sql = `UPDATE dispatch_case_reports SET damage = ?, meta_information = ? WHERE case_id = ?`;

  try {
    const rows = await dbQuery(sql, [
      fields.damage,
      fields.meta_information,
      case_id,
    ]);
    return rows;
  } catch (error) {
    console.error("Error fetching dispatch cases:", error);
    return error;
  }
};

export const findCaseByUserIdAndDeviceId = async (userId, deviceId) => {
  const query = `
    SELECT 
      dc.*, 
      d.id AS device_id, 
      d.name AS device_name
    FROM 
      dispatch_cases dc
    JOIN 
      new_settings_devices d 
      ON dc.assigned_device_id = d.id
    WHERE 
      dc.user_id = ? AND dc.assigned_device_id = ? AND dc.status = 'pending'
    ORDER BY 
      dc.created_at DESC
  `;

  try {
    const rows = await dbQuery(query, [parseInt(userId), deviceId]);

    return rows;
  } catch (error) {
    console.error("Error fetching dispatch cases:", error);
    return error;
  }
};

export const saveDispatchCaseAction = async (body) => {
  const { case_id, driver_id, action, rejection_reason } = body;

  const sql = `INSERT INTO dispatch_case_actions (
    case_id,
    driver_id,
    action,
    rejection_reason
  ) VALUES (?, ?, ?, ?)`;

  const values = [case_id, driver_id, action, rejection_reason];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    return error;
  }
};

export const updateCaseStatusById = async (case_id, action) => {
  const sql = `UPDATE dispatch_cases SET status = ? WHERE id = ?`;

  try {
    const result = await dbQuery(sql, [action, case_id]);
    return result;
  } catch (error) {
    return error;
  }
};

export const saveDispatchCaseReport = async (reportData) => {
  const query = `
      INSERT INTO dispatch_case_reports (
        case_id, driver_id, suggested_services, subservices, additional_information, photos
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
  const values = [
    reportData.case_id,
    reportData.driver_id,
    reportData.suggested_services,
    reportData.subservices,
    reportData.additional_information,
    reportData.photos,
  ];

  try {
    const result = await dbQuery(query, values);
    return result.insertId || result[0]?.insertId || null;
  } catch (error) {
    console.error("Error saving dispatch case report:", error);
    throw error;
  }
};
