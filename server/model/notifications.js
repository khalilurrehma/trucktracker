import pool from "../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

export const notificationTypes = async () => {
  const sql = `SELECT * FROM settings_notifications`;

  try {
    const results = await dbQuery(sql);
    return results;
  } catch (error) {
    throw error;
  }
};

export const newNotificationTypeCalc = async (body) => {
  const sql = `INSERT INTO settings_notifications
                    (name, mqtt_topic, is_subscribed, calc_id) 
                        VALUES (?, ?, ?, ?)`;

  const values = [body.name, body.mqtt_topic, body.is_subscribed, body.calc_id];

  try {
    await dbQuery(sql, values);
    return "Notification type saved successfully";
  } catch (error) {
    throw error;
  }
};

export const saveNotificationLogs = async (body) => {
  const sql = `INSERT INTO settings_notifications_logs
                    (device_id, device_name, topic, notification_body) 
                        VALUES (?, ?, ?, ?)`;

  const values = [
    body.device_id,
    body.device_name,
    body.topic,
    JSON.stringify(body.notification_body),
  ];

  try {
    await dbQuery(sql, values);
    return "Notification logs saved successfully";
  } catch (error) {
    throw error;
  }
};

export const fetchAllNotificationLogs = async () => {
  const sql = "SELECT * FROM settings_notifications_logs";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const notificationTypeById = async (id) => {
  const sql = "SELECT * FROM settings_notifications WHERE id =?";

  return new Promise((resolve, reject) => {
    dbQuery(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]);
    });
  });
};

export const saveSubscribedNotification = async (body) => {
  const sql = `INSERT INTO subscribed_notifications
                    (name, mqtt_topic, audio_filename, audio_file, channels) 
                        VALUES (?,?,?,?,?)`;

  const values = [
    body.name,
    body.mqtt_topic,
    body.audio_filename,
    body.audio_file,
    body.channels,
  ];

  try {
    await dbQuery(sql, values);
    return true;
  } catch (error) {
    throw error;
  }
};

export const saveSubscribedProtocolNotification = async (body) => {
  const sql = `INSERT INTO subscribed_protocol_notifications 
      (device_type_id, configured_notification_id, audio_file, audio_filename, userId, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())`;

  const values = [
    body.device_type_id,
    body.configured_items,
    body.audio_file,
    body.audio_filename,
    body.userId,
  ];

  try {
    await dbQuery(sql, values);
    return true;
  } catch (error) {
    throw error;
  }
};

export const allSubscribedProtocolNotifications = async () => {
  const query = `
    SELECT spn.*, cn.notification_name, cn.notification_code
    FROM subscribed_protocol_notifications spn
    JOIN configured_notifications cn 
    ON spn.configured_notification_id = cn.id
  `;

  return new Promise((resolve, reject) => {
    dbQuery(query, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const subcribedEventPNByDeviceTypeId = async (
  deviceTypeId,
  notificationCode
) => {
  const query = `
    SELECT spn.*, cn.notification_name, cn.notification_code
    FROM subscribed_protocol_notifications spn
    JOIN configured_notifications cn 
    ON spn.configured_notification_id = cn.id
    WHERE spn.device_type_id = ? AND cn.notification_code = ?
    AND cn.notification_type = 'Events'
  `;
  const values = [deviceTypeId, notificationCode];

  return new Promise((resolve, reject) => {
    dbQuery(query, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results?.length > 0 ? results[0] : null);
    });
  });
};

export const subcribedAlarmPNByDeviceTypeId = async (
  deviceTypeId,
  notificationCode
) => {
  const query = `
    SELECT spn.*, cn.notification_name, cn.notification_code
    FROM subscribed_protocol_notifications spn
    JOIN configured_notifications cn 
    ON spn.configured_notification_id = cn.id
    WHERE spn.device_type_id = ? AND cn.notification_code = ?
    AND cn.notification_type = 'Alarms'
  `;

  return new Promise((resolve, reject) => {
    dbQuery(query, [deviceTypeId, notificationCode], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]);
    });
  });
};

export const allSubscribedNotifications = async () => {
  const sql = "SELECT * FROM subscribed_notifications";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const topicsOfSubscribedNotifications = async () => {
  const sql = "SELECT mqtt_topic FROM subscribed_notifications";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      const formatResult = results?.map((row) => {
        return {
          topic: row?.mqtt_topic,
        };
      });
      resolve(formatResult);
    });
  });
};

export const updateNotification = async (active, id) => {
  const sql = "UPDATE settings_notifications SET is_subscribed =? WHERE id =?";

  return new Promise((resolve, reject) => {
    dbQuery(sql, [active, id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results.affectedRows === 1);
    });
  });
};

export const newOperationAlarm = async (data) => {
  const sql = `INSERT INTO operations_alarms
                    (deviceId, deviceName, alarmCode, alarmType, topic, message, userId) 
                        VALUES (?,?,?,?,?,?,?)`;

  const values = [
    data.deviceId,
    data.deviceName,
    data.alarmCode,
    data.alarmType,
    data.topic,
    JSON.stringify(data.message),
    data.userId,
  ];

  try {
    await dbQuery(sql, values);
    return "Operation alarm saved successfully";
  } catch (error) {
    throw error;
  }
};

export const getLatestOperationAlarms = async () => {
  const sql = `SELECT * FROM operations_alarms ORDER BY createdAt DESC`;

  try {
    const results = await dbQuery(sql);
    return results;
  } catch (error) {
    console.error("Error fetching latest operation alarms:", error);
    throw error;
  }
};

export const getLatestOperationAlarmsByUserId = async (userId) => {
  const sql = `SELECT * FROM operations_alarms WHERE userId = ? ORDER BY createdAt DESC`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const newDeviceEvent = async (data) => {
  const sql = `INSERT INTO reports_events
                    (deviceId, deviceName, eventType, topic, message, userId) 
                        VALUES (?,?,?,?,?,?)`;

  const values = [
    data.deviceId,
    data.deviceName,
    data.eventType,
    data.topic,
    JSON.stringify(data.message),
    data.userId,
  ];

  try {
    await dbQuery(sql, values);
    return "Device event saved successfully";
  } catch (error) {
    throw error;
  }
};

export const getLatestDeviceEvents = async () => {
  const sql = `SELECT * FROM reports_events ORDER BY createdAt DESC`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const getLastIgnitionEventBefore = async (
  deviceId,
  eventType,
  beforeTimestamp
) => {
  const sql = `
        SELECT * FROM reports_events 
        WHERE deviceId = ? 
          AND eventType = ? 
          AND createdAt < ? 
        ORDER BY createdAt DESC 
        LIMIT 1
    `;

  return new Promise((resolve, reject) => {
    dbQuery(sql, [deviceId, eventType, beforeTimestamp], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results.length > 0 ? results[0] : null);
    });
  });
};

export const getLatestDeviceEventsByUserId = async (userId) => {
  const sql = `SELECT * FROM reports_events WHERE userId = ? ORDER BY createdAt DESC`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const newDriverBehaivorReport = async (data) => {
  const sql = `INSERT INTO reports_driver_behaviour 
               (deviceId, deviceName, driverBehaivorEvent, topic, message, userId) 
               VALUES (?, ?, ?, ?, ?, ?)`;

  const values = [
    data.deviceId,
    data.deviceName,
    data.driverBehaivorEvent,
    data.topic,
    JSON.stringify(data.message),
    data.userId,
  ];

  try {
    await dbQuery(sql, values);
    return "Driver behaviour report saved successfully";
  } catch (error) {
    throw error;
  }
};

export const getLatestDriverBehaivorReports = async () => {
  const sql = `SELECT * FROM reports_driver_behaviour ORDER BY createdAt DESC`;

  try {
    const results = await dbQuery(sql);
    return results;
  } catch (error) {
    console.error("Error fetching latest driver behaviour reports:", error);
    throw error;
  }
};

export const getLatestDriverBehaivorReportsByUserId = async (userId) => {
  const sql = `SELECT * FROM reports_driver_behaviour WHERE userId = ? ORDER BY createdAt DESC`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchDefaultAlarmsEvents = async () => {
  const sql = `SELECT * FROM alarms_events_default`;

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const newConfiguredNotification = async (body) => {
  const sql = `INSERT INTO configured_notifications 
      (notification_id, notification_name, notification_type, device_type_id, parameter_value, notification_code)
      VALUES (?, ?, ?, ?, ?, ?)`;

  const values = [
    body.notification_id,
    body.notification_name,
    body.notification_type,
    body.device_type_id,
    body.parameter_value,
    body.notification_code,
  ];

  try {
    await dbQuery(sql, values);
    return true;
  } catch (error) {
    throw error;
  }
};

export const newTrackDeviceIdNotification = async (body) => {
  const sql = `INSERT INTO track_device_id_notifications 
               (alarm_event_id, alarm_event_name, device_type_id) 
               VALUES (?,?,?)`;

  const values = [
    body.alarm_event_id,
    body.alarm_event_name,
    body.device_type_id,
  ];

  try {
    await dbQuery(sql, values);
    return true;
  } catch (error) {
    throw error;
  }
};

export const trackNotificationByDeviceTypeId = async (deviceTypeId) => {
  const sql =
    "SELECT * FROM track_device_id_notifications WHERE device_type_id =?";

  return new Promise((resolve, reject) => {
    dbQuery(sql, [deviceTypeId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const configuredNotificationByDeviceTypeId = async (deviceTypeId) => {
  const sql = "SELECT * FROM configured_notifications WHERE device_type_id =?";

  return new Promise((resolve, reject) => {
    dbQuery(sql, [deviceTypeId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const allConfiguredNotifications = async () => {
  const sql = "SELECT * FROM configured_notifications";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const alarmCodeOfConfiguredNotifications = async () => {
  const sql = "SELECT notification_code FROM configured_notifications";

  return new Promise((resolve, reject) => {
    dbQuery(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results.map((row) => row.notification_code));
    });
  });
};
