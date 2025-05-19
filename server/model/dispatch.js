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
      dc.user_id = ? AND dc.assigned_device_id = ?
    ORDER BY 
      dc.created_at DESC
  `;

  try {
    const rows = await dbQuery(query, [userId, deviceId]);
    return rows;
  } catch (error) {
    console.error("Error fetching dispatch cases:", error);
    return error;
  }
};
