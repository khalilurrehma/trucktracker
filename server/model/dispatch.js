import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// RIMAC CASE

export const saveRimacCase = async (body) => {
  const query = `INSERT INTO rimac_reports (report_data) VALUES (?)`;
  let values = [JSON.stringify(body)];

  try {
    const result = await dbQuery(query, values);

    return result;
  } catch (error) {
    console.error("Error inserting dispatch case:", error);
    return error;
  }
};

export const allRimacCases = async (offset, limit, search = "") => {
  const hasSearch = search.trim() !== "";
  const searchFilter = hasSearch
    ? `WHERE JSON_UNQUOTE(JSON_EXTRACT(report_data, '$.Informe')) LIKE ?`
    : "";

  const baseQuery = `
    SELECT 
      *, 
      (
        SELECT COUNT(*) 
        FROM rimac_reports 
        ${searchFilter}
      ) AS total
    FROM rimac_reports
    ${searchFilter}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  try {
    const queryParams = hasSearch
      ? [`%${search}%`, `%${search}%`, limit, offset]
      : [limit, offset];

    const rows = await dbQuery(baseQuery, queryParams);

    const total = rows.length > 0 ? rows[0].total : 0;
    const cleanRows = rows.map(({ total, ...rest }) => rest);
    return { data: cleanRows, total };
  } catch (error) {
    console.error("Error fetching Rimac cases:", error);
    throw error;
  }
};

export const getRimacCaseByCode = async (code) => {
  const sql = `
    SELECT id, report_data
    FROM rimac_reports
    WHERE JSON_UNQUOTE(JSON_EXTRACT(report_data, '$.Informe')) = ?
    LIMIT 1
  `;

  try {
    const result = await dbQuery(sql, [code]);
    return result[0];
  } catch (error) {
    console.error("Error fetching Rimac report by code:", error);
    throw error;
  }
};

export const updateRimacReportById = async (id, report_body) => {
  const sql = `UPDATE rimac_reports SET report_data = ? WHERE id = ?`;
  let values = [JSON.stringify(report_body), id];

  try {
    await dbQuery(sql, values);
  } catch (error) {
    console.error("Error fetching Rimac report by ID:", error);
    throw error;
  }
};

export const findRimacReportById = async (report_id) => {
  const sql = `SELECT * FROM rimac_reports WHERE id = ?`;
  const values = [report_id];

  try {
    const result = await dbQuery(sql, values);
    return result[0];
  } catch (error) {
    console.error("Error fetching Rimac report by ID:", error);
    throw error;
  }
};

export const addNewCase = async (body) => {
  const {
    user_id,
    case_name,
    case_address,
    position,
    message,
    devicesMeta,
    file_data,
    metadata,
  } = body;

  const query = `
    INSERT INTO dispatch_cases (
      user_id,
      case_name,
      case_address,
      position,
      status,
      message,
      created_at,
      device_meta,
      file_data,
      meta_data
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `;

  let now = dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss");

  const values = [
    user_id,
    case_name,
    case_address,
    JSON.stringify(position),
    message,
    now,
    devicesMeta,
    JSON.stringify(file_data),
    metadata,
  ];

  try {
    const result = await dbQuery(query, values);

    return result.insertId;
  } catch (error) {
    console.error("Error inserting dispatch case:", error);
    return error;
  }
};

export const updateCaseCurrentProcess = async (case_id, status) => {
  const sql = `UPDATE dispatch_cases SET current_subprocess = ? WHERE id = ?`;
  const values = [status, case_id];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    console.error("Error updating case current process:", error);
    throw error;
  }
};

export const saveCaseAssignedDeviceId = async (case_id, device_id) => {
  const sql = `INSERT INTO dispatch_case_devices (dispatch_case_id, device_id) VALUES (?, ?)`;

  const values = [case_id, parseInt(device_id)];

  try {
    const result = await dbQuery(sql, values);

    return result.insertId;
  } catch (error) {
    console.error("Error assigning case to device:", error);
    throw error;
  }
};

export const fetchDispatchCases = async (offset, limit, search = "") => {
  const hasSearch = !!search.trim();
  const whereClause = hasSearch ? `WHERE dc.case_name LIKE ?` : "";
  const params = hasSearch ? [`%${search}%`, limit, offset] : [limit, offset];

  const baseQuery = `
    SELECT 
      dc.*,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'device_id', dcd.device_id,
          'device_name', nsd.name
        )
      ) AS assigned_devices
    FROM dispatch_cases dc
    LEFT JOIN dispatch_case_devices dcd ON dc.id = dcd.dispatch_case_id
    LEFT JOIN new_settings_devices nsd ON dcd.device_id = nsd.id
    ${whereClause}
    GROUP BY dc.id
    ORDER BY dc.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = hasSearch
    ? `SELECT COUNT(*) as total FROM dispatch_cases dc WHERE dc.case_name LIKE ?`
    : `SELECT COUNT(*) as total FROM dispatch_cases`;

  try {
    const rows = await dbQuery(baseQuery, params);
    const countParams = hasSearch ? [`%${search}%`] : [];
    const [{ total }] = await dbQuery(countQuery, countParams);

    return {
      rows: rows.map((row) => ({
        ...row,
        assigned_devices: JSON.parse(row.assigned_devices || "[]"),
        file_data: JSON.parse(row.file_data || "[]"),
      })),
      total,
    };
  } catch (error) {
    console.error("Error fetching dispatch cases:", error);
    throw error;
  }
};

export const fetchDispatchCasesByUserId = async (
  user_id,
  offset,
  limit,
  search = ""
) => {
  const hasSearch = !!search.trim();
  const whereClause = hasSearch ? `AND dc.case_name LIKE ?` : "";
  const params = hasSearch
    ? [user_id, `%${search}%`, limit, offset]
    : [user_id, limit, offset];

  const query = `
    SELECT 
      dc.*,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'device_id', dcd.device_id,
          'device_name', nsd.name
        )
      ) AS assigned_devices
    FROM dispatch_cases dc
    LEFT JOIN dispatch_case_devices dcd ON dc.id = dcd.dispatch_case_id
    LEFT JOIN new_settings_devices nsd ON dcd.device_id = nsd.id
    WHERE dc.user_id = ?
    ${whereClause}
    GROUP BY dc.id
    ORDER BY dc.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = hasSearch
    ? `SELECT COUNT(*) as total FROM dispatch_cases WHERE user_id = ? AND case_name LIKE ?`
    : `SELECT COUNT(*) as total FROM dispatch_cases WHERE user_id = ?`;

  try {
    const rows = await dbQuery(query, params);
    const countParams = hasSearch ? [user_id, `%${search}%`] : [user_id];
    const [{ total }] = await dbQuery(countQuery, countParams);

    return {
      rows: rows.map((row) => ({
        ...row,
        assigned_devices: JSON.parse(row.assigned_devices || "[]"),
        file_data: JSON.parse(row.file_data || "[]"),
      })),
      total,
    };
  } catch (error) {
    console.error("Error fetching dispatch cases by user:", error);
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

export const getCaseLastUpdated = async (case_id) => {
  const sql = `SELECT updated_at FROM dispatch_cases WHERE id = ? AND status = 'approved' LIMIT 1`;

  try {
    const rows = await dbQuery(sql, [case_id]);
    return rows[0]?.updated_at;
  } catch (error) {
    return error;
  }
};

export const updateCaseServiceById = async (fields, case_id) => {
  const sql = `UPDATE dispatch_case_reports SET damage = ?, meta_information = ?, meta_data = ? WHERE case_id = ? AND authorized_status = true`;

  try {
    const rows = await dbQuery(sql, [
      fields.damage,
      fields.meta_information,
      JSON.stringify(fields.meta_data),
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
      dc.user_id = ? AND dcd.device_id = ? AND dc.status != 'completed'
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

export const findLatestInProgressCase = async (userId, deviceId) => {
  const parsedUserId = parseInt(userId);
  const parsedDeviceId = parseInt(deviceId);

  if (isNaN(parsedUserId) || isNaN(parsedDeviceId)) {
    throw new Error(`Invalid userId or deviceId: ${userId}, ${deviceId}`);
  }

  const query = `
    SELECT 
      dc.*
    FROM 
      dispatch_cases dc
    JOIN 
      dispatch_case_devices dcd ON dc.id = dcd.dispatch_case_id
    WHERE 
      dc.user_id = ? 
      AND dcd.device_id = ? 
      AND dc.status NOT IN ('pending')
    ORDER BY 
      dc.created_at DESC
    LIMIT 1;
  `;

  try {
    const rows = await dbQuery(query, [parsedUserId, parsedDeviceId]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching latest in-progress dispatch case:", error);
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

export const getCaseActionTime = async (case_id) => {
  const sql = `SELECT created_at FROM dispatch_case_actions WHERE case_id = ?`;

  try {
    const rows = await dbQuery(sql, [case_id]);
    return rows[0].created_at;
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

export const saveRequestedSuggestedService = async (request) => {
  const { user_id, case_id, driver_id, suggested_services } = request;

  const sql = `INSERT INTO dispatch_case_service_approvals (user_id, case_id, driver_id, suggested_services) 
      VALUES (?, ?, ?, ?)`;

  const values = [
    user_id,
    case_id,
    driver_id,
    JSON.stringify(suggested_services),
  ];

  try {
    const result = await dbQuery(sql, values);
    return result;
  } catch (error) {
    return error;
  }
};

export const allPendingSuggestedServices = async (case_id) => {
  const sql = `
    SELECT 
      a.*, 
      d.name AS driver_name 
    FROM dispatch_case_service_approvals a
    JOIN drivers d ON a.driver_id = d.id
    WHERE a.case_id = ? AND a.status = 'pending'
  `;

  try {
    const rows = await dbQuery(sql, [case_id]);

    const parsedRows = rows.map((row) => ({
      ...row,
      suggested_services:
        typeof row.suggested_services === "string"
          ? JSON.parse(row.suggested_services)
          : row.suggested_services,
    }));

    return parsedRows;
  } catch (error) {
    return error;
  }
};

export const allPendingSuggestedServicesByUserId = async (case_id, user_id) => {
  const sql = `
    SELECT 
      a.*, 
      d.name AS driver_name 
    FROM dispatch_case_service_approvals a
    JOIN drivers d ON a.driver_id = d.id
    WHERE a.case_id = ? AND a.user_id = ? AND a.status = 'pending'
`;

  try {
    const rows = await dbQuery(sql, [case_id, user_id]);

    const parsedRows = rows.map((row) => ({
      ...row,
      suggested_services:
        typeof row.suggested_services === "string"
          ? JSON.parse(row.suggested_services)
          : row.suggested_services,
    }));

    return parsedRows;
  } catch (error) {
    return error;
  }
};

export const findPendingApprovalSuggestedService = async (id) => {
  const sql = `SELECT * FROM dispatch_case_service_approvals WHERE id = ? AND status = 'pending'`;

  try {
    const rows = await dbQuery(sql, [id]);
    return rows[0];
  } catch (error) {
    return error;
  }
};

export const actionSuggestionService = async (id, action) => {
  const sql = `UPDATE dispatch_case_service_approvals SET status = ? WHERE id = ?`;

  try {
    const result = await dbQuery(sql, [action, id]);
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

export const fetchCaseIdByReportId = async (report_id) => {
  const query = `SELECT case_id FROM dispatch_case_reports WHERE id = ?`;

  try {
    const result = await dbQuery(query, [parseInt(report_id)]);
    return result[0]?.case_id;
  } catch (error) {
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

export const defaultTemplateTimeForAdmin = async (key, userId) => {
  const query = `
    SELECT 
      cst.stage_key, 
      cst.label, 
      COALESCE(aso.custom_time_sec, cst.default_time_sec) AS time_sec, 
      cst.display_order
    FROM case_stage_templates cst
    LEFT JOIN admin_stage_overrides aso 
      ON cst.stage_key = aso.stage_key 
      AND aso.admin_id = ?
    WHERE cst.stage_key = ?
  `;

  try {
    const results = await dbQuery(query, [userId, key]);
    return results[0] || null;
  } catch (error) {
    console.error("Error fetching stage time for admin:", error);
    throw error;
  }
};

export const fetchSubserviceLocationData = async (userId, page, limit) => {
  const offset = (page - 1) * limit;

  let query;
  let queryParams;
  const countQuery = "SELECT COUNT(*) as total FROM location_data";

  if (userId !== "1") {
    query = `
      SELECT 
        l.id, 
        l.code, 
        l.ring_type, 
        l.code_department, 
        l.department,
        l.code_province, 
        l.province, 
        l.code_district, 
        l.district,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'subserviceId', sp.id,
            'subserviceType', sts.name,
            'subserviceTypeId', sts.id,
            'price', sp.price
          )
        ) as subservices
      FROM location_data l
      LEFT JOIN location_subservice_prices sp 
        ON l.id = sp.location_id AND sp.user_id = ?
      LEFT JOIN service_type_subservices sts 
        ON sp.subservice_type = sts.id
      GROUP BY l.id, l.code, l.ring_type, l.code_department, l.department,
               l.code_province, l.province, l.code_district, l.district
      LIMIT ? OFFSET ?
    `;
    queryParams = [userId, limit, offset];
  } else {
    query = `
      SELECT id, code, ring_type, code_department, department,
             code_province, province, code_district, district
      FROM location_data
      LIMIT ? OFFSET ?
    `;
    queryParams = [limit, offset];
  }

  const rows = await dbQuery(query, queryParams);
  const [countResult] = await dbQuery(countQuery);

  return {
    rows,
    total: countResult.total,
  };
};

export const saveOrUpdateZonePrices = async ({
  userId,
  locationId,
  subservices,
}) => {
  // 1. Get existing subservice prices for this location
  const existingQuery = `
    SELECT id, subservice_type AS subserviceType, price 
    FROM location_subservice_prices 
    WHERE user_id = ? AND location_id = ?
  `;
  const existingRows = await dbQuery(existingQuery, [userId, locationId]);

  const toInsert = [];
  const toUpdate = [];
  const incomingTypeIds = subservices.map((s) => s.subserviceType);

  // 2. Map existing rows for quick lookup
  const existingMap = new Map();
  for (const row of existingRows) {
    existingMap.set(row.subserviceType, row);
  }

  // 3. Determine what to insert or update
  for (const item of subservices) {
    const found = existingMap.get(item.subserviceType);
    if (!found) {
      toInsert.push([userId, locationId, item.subserviceType, item.price]);
    } else if (found.price !== item.price) {
      toUpdate.push({ id: found.id, price: item.price });
    }
    existingMap.delete(item.subserviceType); // Remaining = to delete
  }

  // 4. Remaining in map are to be deleted
  const toDeleteIds = Array.from(existingMap.values()).map((r) => r.id);

  // Execute Inserts
  if (toInsert.length > 0) {
    const insertQuery = `
      INSERT INTO location_subservice_prices (user_id, location_id, subservice_type, price)
      VALUES ?
    `;
    await dbQuery(insertQuery, [toInsert]);
  }

  // Execute Updates
  for (const item of toUpdate) {
    const updateQuery = `
      UPDATE location_subservice_prices SET price = ? WHERE id = ?
    `;
    await dbQuery(updateQuery, [item.price, item.id]);
  }

  // Execute Deletes
  if (toDeleteIds.length > 0) {
    const deleteQuery = `
      DELETE FROM location_subservice_prices WHERE id IN (?)
    `;
    await dbQuery(deleteQuery, [toDeleteIds]);
  }

  return {
    inserted: toInsert.length,
    updated: toUpdate.length,
    deleted: toDeleteIds.length,
  };
};

export const addNewTowCarServicePrice = async ({
  userId,
  locationId,
  providers,
}) => {
  const query = `
    INSERT INTO location_towcarservice_prices (user_id, location_id, provider, price)
    VALUES ?
  `;

  const values = providers.map((providerData) => [
    userId,
    locationId,
    providerData.provider,
    providerData.price,
  ]);

  const result = await dbQuery(query, [values]);

  const insertedIds = Array.isArray(result.insertId)
    ? result.insertId
    : Array.from({ length: providers.length }, (_, i) => result.insertId + i);

  return insertedIds;
};

export const fetchTowCarServiceLocationData = async (userId, page, limit) => {
  const offset = (page - 1) * limit;

  let query;
  let queryParams;
  const countQuery = "SELECT COUNT(*) as total FROM location_data";

  if (userId !== "1") {
    query = `
      SELECT 
        l.id, 
        l.code, 
        l.ring_type, 
        l.code_department, 
        l.department,
        l.code_province, 
        l.province, 
        l.code_district, 
        l.district,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'providerId', tcs.id,
            'provider', tcs.provider,
            'price', tcs.price
          )
        ) as providers
      FROM location_data l
      LEFT JOIN location_towcarservice_prices tcs 
        ON l.id = tcs.location_id AND tcs.user_id = ?
      GROUP BY l.id, l.code, l.ring_type, l.code_department, l.department,
              l.code_province, l.province, l.code_district, l.district
      LIMIT ? OFFSET ?
    `;
    queryParams = [userId, limit, offset];
  } else {
    query = `
      SELECT id, code, ring_type, code_department, department,
             code_province, province, code_district, district
      FROM location_data
      LIMIT ? OFFSET ?
    `;
    queryParams = [limit, offset];
  }

  const rows = await dbQuery(query, queryParams);
  const [countResult] = await dbQuery(countQuery);

  return {
    rows,
    total: countResult.total,
  };
};

export const updateProviderPriceInDb = async ({
  providerId,
  userId,
  locationId,
  provider,
  price,
}) => {
  const query = `
    UPDATE location_towcarservice_prices
    SET provider = ?, price = ?
    WHERE id = ? AND user_id = ? AND location_id = ?
  `;
  const queryParams = [provider, price, providerId, userId, locationId];

  await dbQuery(query, queryParams);
};

export const existingProviderPrice = async ({ locationId, userId }) => {
  const query = `
    SELECT id FROM location_towcarservice_prices WHERE location_id = ? AND user_id = ?
  `;

  try {
    const rows = await dbQuery(query, [locationId, userId]);
    return rows;
  } catch (error) {
    console.error("Error fetching existing provider prices:", error);
    throw error;
  }
};

export const deleteProviderPrice = async ({
  userId,
  locationId,
  toDeleteIds,
}) => {
  const query = `DELETE FROM location_towcarservice_prices WHERE id IN (${toDeleteIds?.join(
    ","
  )}) AND user_id = ? AND location_id = ?`;

  try {
    await dbQuery(query, [userId, locationId]);
  } catch (error) {
    console.error("Error deleting provider price:", error);
    throw error;
  }
};

// ------------------------------- DISPATCH CASE TRACKING

export const initialCaseStageStatus = async ({ caseId, expected_duration }) => {
  const now = dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss");

  const query = `
    INSERT INTO case_stage_tracking (case_id, stage_name, status, expected_duration, start_time)
    VALUES 
      (?, 'Assignment of the advisor', 'sent', ?, ?),
      (?, 'Reception Case', 'pending', ?, ?)
  `;

  const values = [caseId, expected_duration, now, caseId, 30, now];

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
  const now = dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss");
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

export const caseTrackingByIdAndStageName = async (case_id, stage_name) => {
  const query = `SELECT 
         stage_name,
         status,
         expected_duration,
         start_time
       FROM case_stage_tracking
       WHERE case_id = ? AND stage_name = ?`;

  try {
    const results = await dbQuery(query, [parseInt(case_id), stage_name]);
    return results[0];
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

export const countTodayCasesByUserAndDevice = async (userId, deviceId) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM dispatch_cases dc
    JOIN dispatch_case_devices dcd ON dc.id = dcd.dispatch_case_id
    WHERE 
      dc.user_id = ? 
      AND dcd.device_id = ?
      AND DATE(dc.created_at) = CURDATE()
  `;

  try {
    const [result] = await dbQuery(query, [
      parseInt(userId),
      parseInt(deviceId),
    ]);
    return result?.total || 0;
  } catch (error) {
    console.error("Error counting today’s dispatch cases:", error);
    throw error;
  }
};

export const insertDriverServiceTime = async (caseId, driverId, seconds) => {
  const query = `
    INSERT INTO driver_service_record (case_id, driver_id, service_time_seconds)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE service_time_seconds = VALUES(service_time_seconds)
  `;

  await dbQuery(query, [caseId, driverId, seconds]);
};

export const insertDispatchCompleteCase = async (caseId, driverId) => {
  const limaTime = dayjs().tz("America/Lima");

  const completedDay = limaTime.format("YYYY-MM-DD");
  const completedTime = limaTime.format("HH:mm:ss");
  const createdAt = limaTime.format("YYYY-MM-DD HH:mm:ss");

  const query = `
    INSERT INTO dispatch_complete_cases (case_id, driver_id, completed_day, completed_time, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      completed_day = VALUES(completed_day),
      completed_time = VALUES(completed_time),
      created_at = VALUES(created_at)
  `;

  await dbQuery(query, [
    caseId,
    driverId,
    completedDay,
    completedTime,
    createdAt,
  ]);
};

export const saveSearchHistory = async ({
  userId,
  userName,
  address,
  radius,
  lat,
  lng,
}) => {
  const query = `
    INSERT INTO dispatch_search_history (userId, userName, address, latitude, longitude, radius) VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [userId, userName, address, lat, lng, radius];

  const result = await dbQuery(query, values);

  return result.insertId || result[0]?.insertId || null;
};

export const allSearchHistory = async () => {
  const query = `
    SELECT * FROM dispatch_search_history ORDER BY time DESC
  `;

  try {
    const rows = await dbQuery(query);
    return rows;
  } catch (error) {
    throw error;
  }
};

export const allSearchHistoryByUserId = async (userId) => {
  const query = `
    SELECT * FROM dispatch_search_history WHERE userId = ? ORDER BY time DESC
  `;
  try {
    const rows = await dbQuery(query, [userId]);
    return rows;
  } catch (error) {
    throw error;
  }
};

export const updateSearchHistory = async (search_id) => {
  const sql = `UPDATE dispatch_search_history SET case_assigned = ? WHERE id = ?`;
  try {
    await dbQuery(sql, [true, search_id]);
  } catch (error) {
    throw error;
  }
};

export const fetchZoneRatesByUserId = async (userId, districtName) => {
  const query = `
      SELECT 
        ltp.provider,
        ltp.price,
        ld.district,
        ld.id AS location_id
      FROM 
        location_data ld
      JOIN 
        location_towcarservice_prices ltp 
        ON ld.id = ltp.location_id
      WHERE 
        ld.district = ? 
        AND ltp.user_id = (
          SELECT 
            COALESCE((
              SELECT user_id FROM location_towcarservice_prices 
              WHERE location_id = ld.id AND user_id = ? LIMIT 1
            ), 1)
        )
      `;

  const values = [districtName, parseInt(userId)];

  try {
    const rows = await dbQuery(query, values);
    return rows;
  } catch (error) {
    console.error("Error fetching zone rates by user ID:", error);
    throw error;
  }
};
