import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const addNewCase = async (body) => {
  const { user_id, case_name, case_address, message, devicesMeta, file_data } =
    body;

  const query = `
    INSERT INTO dispatch_cases (
      user_id,
      case_name,
      case_address,
      status,
      message,
      device_meta,
      file_data
    ) VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `;

  const values = [
    user_id,
    case_name,
    case_address,
    message,
    devicesMeta,
    file_data,
  ];

  try {
    const result = await dbQuery(query, values);

    return result.insertId;
  } catch (error) {
    console.error("Error inserting dispatch case:", error);
    return error;
  }
};

export const saveCaseAssignedDeviceId = async (case_id, device_id) => {
  const sql = `INSERT INTO dispatch_case_devices (dispatch_case_id, device_id) VALUES (?, ?)`;

  const values = [case_id, device_id];

  try {
    const result = await dbQuery(sql, values);

    return result.insertId;
  } catch (error) {
    return error;
  }
};

export const fetchDispatchCases = async () => {
  const query = `
    SELECT 
      dc.*,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'device_id', dcd.device_id,
          'device_name', nsd.name
        )
      ) AS assigned_devices
    FROM 
      dispatch_cases dc
    LEFT JOIN 
      dispatch_case_devices dcd ON dc.id = dcd.dispatch_case_id
    LEFT JOIN 
      new_settings_devices nsd ON dcd.device_id = nsd.id
    GROUP BY 
      dc.id
    ORDER BY 
      dc.created_at DESC
  `;

  try {
    const rows = await dbQuery(query);
    return rows.map((row) => ({
      ...row,
      assigned_devices: JSON.parse(row.assigned_devices || "[]"),
      file_data: JSON.parse(row.file_data || "[]"),
    }));
  } catch (error) {
    console.error("Error fetching dispatch cases:", error);
    throw error;
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
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'device_id', dcd.device_id,
          'device_name', nsd.name
        )
      ) AS assigned_devices
    FROM 
      dispatch_cases dc
    JOIN 
      dispatch_case_devices dcd ON dc.id = dcd.dispatch_case_id
    JOIN 
      new_settings_devices nsd ON dcd.device_id = nsd.id
    WHERE 
      dc.user_id = ? AND dcd.device_id = ? AND dc.status = 'pending'
    GROUP BY 
      dc.id
    ORDER BY 
      dc.created_at DESC
  `;

  try {
    const rows = await dbQuery(query, [parseInt(userId), parseInt(deviceId)]);
    return rows.map((row) => ({
      ...row,
      assigned_devices: JSON.parse(row.assigned_devices || "[]"),
      file_data: JSON.parse(row.file_data || "[]"),
    }));
  } catch (error) {
    console.error("Error fetching filtered dispatch cases:", error);
    throw error;
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
