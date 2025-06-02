import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const addNewCase = async (body) => {
  const {
    user_id,
    case_name,
    case_address,
    position,
    message,
    devicesMeta,
    file_data,
  } = body;

  const query = `
    INSERT INTO dispatch_cases (
      user_id,
      case_name,
      case_address,
      position,
      status,
      message,
      device_meta,
      file_data
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
  `;

  const values = [
    user_id,
    case_name,
    case_address,
    JSON.stringify(position),
    message,
    devicesMeta,
    JSON.stringify(file_data),
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
    console.error("Error assigning case to device:", error);
    throw error;
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

export const fetchDispatchCasesByUserId = async (user_id) => {
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
      WHERE user_id = ?
    GROUP BY 
      dc.id
    ORDER BY 
      dc.created_at DESC
  `;

  try {
    const rows = await dbQuery(query, [user_id]);
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
  const query = `SELECT * FROM dispatch_cases WHERE id = ?`;

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

export const findCaseByName = async (case_name) => {
  const sql = `SELECT id, case_name FROM dispatch_cases WHERE case_name = ? LIMIT 1`;

  try {
    const rows = await dbQuery(sql, [case_name]);
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
  dcr.authorized_status,
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
  const sql = `UPDATE dispatch_case_reports SET damage = ?, meta_information = ? WHERE case_id = ? AND authorized_status = true`;

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
      dc.user_id = ? AND dcd.device_id = ? AND dc.status IN ('pending', 'in progress')
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
        case_id, driver_id, suggested_services, subservices, additional_information
      ) VALUES (?, ?, ?, ?, ?)
    `;
  const values = [
    reportData.case_id,
    reportData.driver_id,
    reportData.suggested_services,
    reportData.subservices,
    reportData.additional_information,
  ];

  try {
    const result = await dbQuery(query, values);
    return result.insertId || result[0]?.insertId || null;
  } catch (error) {
    console.error("Error saving dispatch case report:", error);
    throw error;
  }
};

export const saveInvolvedVehicle = async (reportId, vehicle) => {
  const { plateNumber } = vehicle;

  const query = `INSERT INTO dispatch_involved_vehicles (report_id, plate_number)
     VALUES (?, ?)`;

  const values = [reportId, plateNumber];

  const result = await dbQuery(query, values);

  return result.insertId || result[0]?.insertId || null;
};

export const saveVehiclePhoto = async (vehicleId, photo) => {
  const { category, type, url } = photo;

  const query = `INSERT INTO dispatch_vehicle_photos (vehicle_id, category, type, url)
     VALUES (?, ?, ?, ?)`;

  const values = [vehicleId, category, type, url];

  const result = await dbQuery(query, values);

  return result.insertId || result[0]?.insertId || null;
};

export const fetchCaseReportById = async (case_id) => {
  const query = `
    SELECT 
        dcr.id AS report_id,
        dcr.case_id,
        dcr.driver_id,
        dcr.suggested_services,
        dcr.subservices,
        dcr.additional_information,
        dcr.damage,
        dcr.meta_information,
        dcr.authorized_status,
        dcr.created_at AS report_created_at,
        dcr.updated_at AS report_updated_at,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'vehicle_id', dv.id,
                'plate_number', dv.plate_number,
                'created_at', dv.created_at,
                'photos', (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'photo_id', dvp.id,
                            'category', dvp.category,
                            'type', dvp.type,
                            'url', dvp.url,
                            'created_at', dvp.created_at
                        )
                    )
                    FROM dispatch_vehicle_photos dvp
                    WHERE dvp.vehicle_id = dv.id
                )
            )
        ) AS vehicles
    FROM dispatch_case_reports dcr
    LEFT JOIN dispatch_involved_vehicles dv ON dcr.id = dv.report_id
    WHERE dcr.case_id = ?
    GROUP BY 
        dcr.id,
        dcr.case_id,
        dcr.driver_id,
        dcr.suggested_services,
        dcr.subservices,
        dcr.additional_information,
        dcr.damage,
        dcr.meta_information,
        dcr.created_at,
        dcr.updated_at;
  `;

  try {
    const result = await dbQuery(query, [parseInt(case_id)]);

    return result.length ? result[0] : null;
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
};

export const updateCaseReportStatus = async (report_id, status) => {
  const query = `UPDATE dispatch_case_reports SET authorized_status = ? WHERE id = ?`;

  try {
    const result = await dbQuery(query, [status, parseInt(report_id)]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error updating case report status:", error);
    throw error;
  }
};

export const saveCaseReportNotification = async ({
  company_id,
  report_id,
  message,
}) => {
  const query = `
    INSERT INTO dispatch_case_notification (report_id, user_id, message)
    VALUES (?, ?, ?)
  `;

  const values = [report_id, company_id, message];

  try {
    const result = await dbQuery(query, values);
    return result.insertId || result[0]?.insertId || null;
  } catch (error) {
    console.error("Error saving case report notification:", error);
    throw error;
  }
};

export const getAllNotifications = async () => {
  const query =
    "SELECT * FROM dispatch_case_notification WHERE is_read = 0 ORDER BY created_at DESC";

  try {
    const results = await dbQuery(query);
    return results;
  } catch (error) {
    throw error;
  }
};

export const getNotificationsByCompanyId = async (company_id) => {
  const query =
    "SELECT * FROM dispatch_case_notification WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC";

  try {
    const results = await dbQuery(query, [parseInt(company_id)]);
    return results;
  } catch (error) {
    throw error;
  }
};

export const setNewStatusNotification = async (id) => {
  const query =
    "UPDATE dispatch_case_notification SET is_read = 1 WHERE id = ?";

  try {
    const results = await dbQuery(query, [parseInt(id)]);
    return results;
  } catch (error) {
    console.error("Error saving case report notification:", error);
    throw error;
  }
};

export const processTimeTemplate = async () => {
  const query = `
    SELECT 
         stage_key, label, default_time_sec AS time_sec, display_order 
       FROM case_stage_templates 
       ORDER BY display_order ASC
  `;

  try {
    const results = await dbQuery(query);
    return results;
  } catch (error) {
    throw error;
  }
};

export const processTemplateForAdmin = async (admin_id) => {
  const query = `
    SELECT 
         t.stage_key,
         t.label,
         COALESCE(o.custom_time_sec, t.default_time_sec) AS time_sec,
         t.display_order
       FROM case_stage_templates t
       LEFT JOIN admin_stage_overrides o
         ON t.stage_key = o.stage_key AND o.admin_id = ?
       ORDER BY t.display_order ASC
  `;

  try {
    const results = await dbQuery(query, [parseInt(admin_id)]);
    return results;
  } catch (error) {
    throw error;
  }
};

// ------------------------------- DISPATCH CASE TRACKING

export const initialCaseStageStatus = async ({ caseId }) => {
  const now = new Date();

  const query = `
    INSERT INTO case_stage_tracking (case_id, stage_name, status, expected_duration, start_time)
    VALUES 
      (?, 'Assignment of the advisor', 'sent', ?, ?),
      (?, 'Reception Case', 'pending', ?, ?)
  `;

  const values = [caseId, 60, now, caseId, 30, now];

  try {
    const results = await dbQuery(query, values);
    return results;
  } catch (error) {
    console.error("Error inserting initial case stages:", error);
    throw error;
  }
};

export const onTheWayCaseStageStatus = async ({
  caseId,
  expected_duration,
}) => {
  const now = new Date();
  const query = `
    INSERT INTO case_stage_tracking (case_id, stage_name, status, expected_duration, start_time)
    VALUES 
      (?, 'On the way', 'pending', ?, ?)
  `;

  const values = [caseId, expected_duration, now];

  try {
    const results = await dbQuery(query, values);
    return results;
  } catch (error) {
    throw error;
  }
};

export const caseTrackingById = async (case_id) => {
  const query = `SELECT 
         id,
         case_id,
         stage_name,
         status,
         expected_duration,
         start_time,
         end_time
       FROM case_stage_tracking
       WHERE case_id = ?
       ORDER BY start_time ASC`;

  try {
    const results = await dbQuery(query, [parseInt(case_id)]);
    return results;
  } catch (error) {
    throw error;
  }
};

export const saveAdminOverrideTemplate = async (body) => {
  const { adminId, stage_key, custom_time_sec } = body;

  const query = `INSERT INTO admin_stage_overrides (admin_id, stage_key, custom_time_sec)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE custom_time_sec = VALUES(custom_time_sec)`;

  const values = [adminId, stage_key, custom_time_sec];

  try {
    const results = await dbQuery(query, values);
    return results;
  } catch (error) {
    throw error;
  }
};

// Dashboard services

export const findTodayCasesByUserAndDevices = async (
  userId,
  deviceId,
  date
) => {
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
      dc.user_id = ?
      AND dcd.device_id = ?
      AND dc.status IN ('pending', 'in progress')
      AND DATE(dc.created_at) = CURDATE()
    GROUP BY 
      dc.id
    ORDER BY 
      dc.created_at DESC
  `;

  try {
    const rows = await dbQuery(query, [
      parseInt(userId),
      parseInt(deviceId),
      date,
    ]);
    return rows.map((row) => ({
      ...row,
      assigned_devices: JSON.parse(row.assigned_devices || "[]"),
      file_data: JSON.parse(row.file_data || "[]"),
    }));
  } catch (error) {
    console.error("Error fetching today’s dispatch cases:", error);
    throw error;
  }
};
