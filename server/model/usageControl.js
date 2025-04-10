import pool from "../config/dbConfig.js";

export const newDeviceInUsageControl = async (deviceId, userId) => {
  const sql = `
    INSERT INTO usage_control (deviceId, shiftId, driverId, userId, reason, created_At) 
    VALUES (?, NULL, NULL, ?, NULL, NOW());
  `;

  const values = [deviceId, userId];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results.insertId);
    });
  });
};

export const addUsageActions = async (body) => {
  const { name, command, userId } = body;

  const sql = `
      INSERT INTO usage_actions (name, command, created_At, updated_At, userId)
      VALUES (?, ?, NOW(), NOW(), ?)
    `;

  const values = [name, command, userId];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results.insertId);
    });
  });
};

export const getAllActionByUserId = async (userId) => {
  const sql = `
      SELECT * FROM usage_actions WHERE userId = ? `;
  return new Promise((resolve, reject) => {
    pool.query(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const actionCommandByTypeId = async (type_id) => {
  const sql = `
  SELECT actionCommand, actionName 
  FROM config_usage 
  WHERE JSON_EXTRACT(device_type_info, '$.id') = ?;
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, [type_id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const generateUsageReport = async (body) => {
  const {
    device_type_info,
    device_id,
    usage_actions_id,
    userId,
    actionName,
    actionCommand,
    // device_name,
    // response,
  } = body;

  const sql = `
      INSERT INTO config_usage (device_type_info, device_id, usage_actions_id, actionName, actionCommand, created_At, updated_At, userId)
      VALUES (?, ?, ?, ? , ?, NOW(), NOW(), ?)
    `;

  const values = [
    JSON.stringify(device_type_info),
    JSON.stringify(device_id),
    usage_actions_id,
    actionName,
    actionCommand,
    userId,
  ];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const removeUsageReport = async (id) => {
  const sql = "DELETE FROM config_usage WHERE id =?";
  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const updateUsageResponse = async (deviceId, commandId, body) => {
  const { response } = body;

  const sql = `
    UPDATE device_shifts
    SET response = ?, updated_At = NOW()
    WHERE 
      JSON_UNQUOTE(JSON_EXTRACT(response, '$.id')) = ?
      AND JSON_UNQUOTE(JSON_EXTRACT(response, '$.device_id')) = ?
  `;

  const values = [JSON.stringify(response), commandId, deviceId];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchUsageReportOfUser = async (userId) => {
  const sql = `
    SELECT * FROM config_usage WHERE userId = ?
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const addDeviceShift = async (body) => {
  const {
    device,
    driver_id,
    queue,
    queue_time,
    resend_time,
    commandOn,
    commandOff,
    shiftId,
    userId,
  } = body;

  const sql = `
      INSERT INTO device_shifts (device, driver_id, queue, queue_time, resend_time, commandOn, commandOff, shiftId, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  const values = [
    JSON.stringify(device),
    driver_id,
    queue === "yes" ? true : false,
    queue_time,
    JSON.stringify(resend_time),
    commandOn,
    commandOff,
    shiftId,
    userId,
  ];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const getDeviceShift = async () => {
  const sql = ` 
    SELECT 
      device_shifts.*, 
      JSON_OBJECT(
        'id', drivers.id,
        'name', drivers.name,
        'uniqueId', drivers.unique_id,
        'attributes', drivers.attributes,
        'location', drivers.location
      ) AS driver,
      JSON_OBJECT(
        'id', config_shifts.id,
        'shift_name', config_shifts.shift_name,
        'start_time', config_shifts.start_time,
        'end_time', config_shifts.end_time,
        'start_day', config_shifts.start_day,
        'end_day', config_shifts.end_day,
        'shift_type', config_shifts.shift_type,
        'grace_time', config_shifts.grace_time
      ) AS shift
    FROM 
      device_shifts
    LEFT JOIN 
      drivers 
    ON 
      device_shifts.driver_id = drivers.id
    LEFT JOIN 
      config_shifts
    ON 
      device_shifts.shiftId = config_shifts.id
    WHERE 
      1
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, (err, results) => {
      if (err) {
        reject(err);
      }

      resolve(results);
    });
  });
};

export const fetchDeviceShiftById = async (id) => {
  const sql = `
        SELECT 
          device_shifts.*, 
          drivers.id AS driver_id, 
          drivers.name AS driver_name,
          config_shifts.shift_name, 
          config_shifts.start_time, 
          config_shifts.end_time, 
          config_shifts.shift_type, 
          config_shifts.grace_time, 
          config_shifts.start_day, 
          config_shifts.end_day,
          config_shifts.queue_ttl
        FROM 
          device_shifts
        LEFT JOIN 
          drivers 
        ON 
          device_shifts.driver_id = drivers.id
        LEFT JOIN 
          config_shifts 
        ON 
          device_shifts.shiftId = config_shifts.id
        WHERE 
          device_shifts.id = ?
  `;
  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      const parsedResults = results.map((row) => ({
        ...row,
        device: row.device ? JSON.parse(row.device) : null,
      }));

      resolve(parsedResults);
    });
  });
};

export const fetchDeviceShiftByUserId = async (id) => {
  const sql = `
        SELECT 
      device_shifts.*, 
      JSON_OBJECT(
        'id', drivers.id,
        'name', drivers.name,
        'uniqueId', drivers.unique_id,
        'attributes', drivers.attributes,
        'location', drivers.location
      ) AS driver,
      JSON_OBJECT(
        'id', config_shifts.id,
        'shift_name', config_shifts.shift_name,
        'start_time', config_shifts.start_time,
        'end_time', config_shifts.end_time,
        'start_day', config_shifts.start_day,
        'end_day', config_shifts.end_day,
        'shift_type', config_shifts.shift_type,
        'grace_time', config_shifts.grace_time
      ) AS shift
    FROM 
      device_shifts
    LEFT JOIN 
      drivers 
    ON 
      device_shifts.driver_id = drivers.id
    LEFT JOIN 
      config_shifts
    ON 
      device_shifts.shiftId = config_shifts.id
    WHERE 
      device_shifts.userId = ?
  `;
  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }

      resolve(results);
    });
  });
};

export const fetchDeviceShiftByDeviceId = async (deviceId) => {
  const sql = `
    SELECT * FROM device_shifts WHERE JSON_VALUE(device, '$.id' RETURNING UNSIGNED)  = ?
`;

  return new Promise((resolve, reject) => {
    pool.query(sql, deviceId, (err, results) => {
      if (err) {
        reject(err);
      }

      resolve(results);
    });
  });
};

export const fetchDeviceShiftByFlespiId = async (id) => {
  const sql = `
        SELECT 
    device_shifts.*,
    drivers.name AS driver_name,
    drivers.location AS driver_location
    FROM 
        device_shifts
    LEFT JOIN 
        drivers 
    ON 
        device_shifts.driver_id = drivers.id
    WHERE 
        JSON_UNQUOTE(JSON_EXTRACT(device_shifts.device, '$.flespiId')) = ?;
  `;
  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      const parsedResults = results.map((row) => {
        const parsedDevice = row.device ? JSON.parse(row.device) : {};
        const parsedLocation = row.driver_location
          ? JSON.parse(row.driver_location)
          : {};
        return {
          device_flespI_id: parsedDevice?.flespiId,
          driver_name: row.driver_name,
          driver_location: parsedLocation,
        };
      });

      resolve(parsedResults);
    });
  });
};

export const updateDeviceShift = async (id, prevDriverId, body) => {
  const { device, driver_id, shiftId, userId } =
    body;

  const unassignPrevDriver = `UPDATE drivers SET assigned = null WHERE id = ?`;
  const checkDriverSql = `SELECT id FROM drivers WHERE id = ?`;
  const updateSql = `
    UPDATE device_shifts
    SET driver_id = ?, shiftId = ?, userId = ?
    WHERE id = ?
  `;

  const updateValues = [
    driver_id,
    shiftId,
    userId,
    id,
  ];

  return new Promise((resolve, reject) => {
    pool.query(checkDriverSql, [driver_id], (err, driverResults) => {
      if (err) {
        reject(err);
        return;
      }

      if (driverResults.length === 0) {
        reject(new Error(`Driver ID ${driver_id} does not exist.`));
        return;
      }

      pool.query(updateSql, updateValues, (updateErr) => {
        if (updateErr) {
          reject(updateErr);
          return;
        }

        pool.query(updateSql, updateValues, (unassignErr, updateResults) => {
          if (unassignErr) {
            reject(unassignErr);
            return;
          }
          resolve(updateResults);
        });
      });
    });
  });
};

export const removeDeviceShift = async (id) => {
  const sql = `
      DELETE FROM device_shifts WHERE id =?
    `;
  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchControlUsageTable = async (page, limit) => {
  const offset = (page - 1) * limit;

  const sql = `
        SELECT 
        uc.*, 
        nsd.*, 
        s.id AS shift_id, 
        s.shift_name, 
        s.grace_time, 
        d.id AS driver_id, 
        d.name AS driver_name, 
        d.location, 
        ds.id AS device_shift_id, 
        ds.queue AS device_shift_queue, 
        ds.queue_time AS device_shift_queue_time,
        ds.response AS device_shift_response, 
        ds.resend_time AS device_shift_resend_time
    FROM 
        usage_control uc
    LEFT JOIN 
        new_settings_devices nsd ON uc.deviceId = nsd.id
    LEFT JOIN 
        config_shifts s ON uc.shiftId = s.id
    LEFT JOIN 
        drivers d ON uc.driverId = d.id
    LEFT JOIN 
        device_shifts ds ON uc.device_shift_id = ds.id
    LIMIT ? OFFSET ?;
`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [parseInt(limit), parseInt(offset)], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchControlUsageTableByUserId = async (userId, page, limit) => {
  const offset = (page - 1) * limit;

  const sql = `
        SELECT 
        uc.*, 
        nsd.*, 
        s.id AS shift_id, 
        s.shift_name, 
        s.grace_time, 
        d.id AS driver_id, 
        d.name AS driver_name, 
        d.location, 
        ds.id AS device_shift_id, 
        ds.queue AS device_shift_queue, 
        ds.queue_time AS device_shift_queue_time,
        ds.response AS device_shift_response, 
        ds.resend_time AS device_shift_resend_time
    FROM 
        usage_control uc
    LEFT JOIN 
        new_settings_devices nsd ON uc.deviceId = nsd.id
    LEFT JOIN 
        config_shifts s ON uc.shiftId = s.id
    LEFT JOIN 
        drivers d ON uc.driverId = d.id
    LEFT JOIN 
        device_shifts ds ON uc.device_shift_id = ds.id
      WHERE 
          uc.userId = ?
      LIMIT ? OFFSET ?;
`;

  return new Promise((resolve, reject) => {
    pool.query(
      sql,
      [parseInt(userId), parseInt(limit), parseInt(offset)],
      (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results);
      }
    );
  });
};

export const updateDeviceInUsageControl = async (deviceId, body) => {
  const { shiftId, driverId, prevDriver } = body;

  const unassignPrevDriverSql = `UPDATE drivers SET assigned = null WHERE id = ?`;
  const unassignPrevDriverValues = [prevDriver];

  const updateUsageControlSql = `
    UPDATE usage_control 
    SET shiftId = ?, driverId = ?, updated_At = NOW() 
    WHERE deviceId = ?
  `;
  const usageControlValues = [shiftId, driverId, parseInt(deviceId)];

  const updateDeviceShiftSql = `
    UPDATE device_shifts 
    SET driver_id = ?, shiftId = ?, updated_at = NOW() 
    WHERE JSON_UNQUOTE(JSON_EXTRACT(device, '$.id')) = ?
  `;
  const deviceShiftValues = [driverId, shiftId, parseInt(deviceId)];

  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
        return;
      }

      connection.beginTransaction((transactionError) => {
        if (transactionError) {
          connection.release();
          reject(transactionError);
          return;
        }

        connection.query(
          unassignPrevDriverSql,
          unassignPrevDriverValues,
          (unassignError) => {
            if (unassignError) {
              return connection.rollback(() => {
                connection.release();
                reject(unassignError);
              });
            }

            connection.query(
              updateUsageControlSql,
              usageControlValues,
              (usageControlError) => {
                if (usageControlError) {
                  return connection.rollback(() => {
                    connection.release();
                    reject(usageControlError);
                  });
                }

                connection.query(
                  updateDeviceShiftSql,
                  deviceShiftValues,
                  (deviceShiftError) => {
                    if (deviceShiftError) {
                      return connection.rollback(() => {
                        connection.release();
                        reject(deviceShiftError);
                      });
                    }

                    connection.commit((commitError) => {
                      if (commitError) {
                        return connection.rollback(() => {
                          connection.release();
                          reject(commitError);
                        });
                      }

                      connection.release();
                      resolve({
                        message:
                          "Successfully updated device and shift configurations.",
                      });
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
};

export const updateUsageControl = async (
  deviceId,
  shift_Id,
  device_shift_id,
  driverId,
  actionFrom
) => {
  const sql =
    actionFrom === "deviceShiftUpdate"
      ? `
    UPDATE usage_control
    SET shiftId = ?, driverId = ?, updated_At = NOW()
    WHERE deviceId = ?
  `
      : `
    UPDATE usage_control
    SET shiftId = ?, device_shift_id = ?, driverId = ?, updated_At = NOW()
    WHERE deviceId = ?
  `;

  const values =
    actionFrom === "deviceShiftUpdate"
      ? [shift_Id, driverId, deviceId]
      : [shift_Id, device_shift_id, driverId, deviceId];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        return reject(new Error(`SQL Error: ${err.message}`));
      }
      if (results.affectedRows === 0) {
        return reject(
          new Error(
            `Update failed: No matching record found for deviceId ${deviceId}`
          )
        );
      }
      resolve({ success: true, message: "Usage control updated successfully" });
    });
  });
};

export const unAssignUsageControl = async (deviceId) => {
  const sql = `
    UPDATE usage_control
    SET shiftId = NULL, device_shift_id = NULL, driverId = NULL, updated_At = NOW()
    WHERE deviceId = ?
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, [deviceId], (err, results) => {
      if (err) {
        return reject(new Error(`SQL Error: ${err.message}`));
      }
      if (results.affectedRows === 0) {
        return reject(
          new Error(
            `Update failed: No matching record found for deviceId ${deviceId}`
          )
        );
      }
      resolve({ success: true, message: "Usage control updated successfully" });
    });
  });
};

export const assignDriver = async (id, assign = false) => {
  const sql = `
    UPDATE drivers
    SET assigned = ?, updated_At = NOW()
    WHERE id = ?
  `;

  const values = [assign ? 1 : 0, id];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const updateUsageControlShift = async (
  deviceId,
  shiftId,
  driverId,
  deviceShift
) => {
  const { deviceBody, driver_id, userId, queue, queue_time } = deviceShift;
  const { device } = deviceBody;

  const sqlUpdateUsageControl = `
    UPDATE usage_control
    SET shiftId = ?, driverId = ?, updated_At = NOW()
    WHERE deviceId = ?;
  `;

  const sqlInsertDeviceShifts = `
    INSERT INTO device_shifts (device, created_at, updated_at, driver_id, queue, queue_time, shiftId, userId)
    VALUES (?, NOW(), NOW(), ?, ?, ?, ?, ?);
  `;

  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);

      connection.beginTransaction(async (err) => {
        if (err) {
          connection.release();
          return reject(err);
        }

        try {
          await new Promise((resolve, reject) => {
            connection.query(
              sqlUpdateUsageControl,
              [shiftId, driverId, deviceId],
              (err, results) => {
                if (err) return reject(err);
                resolve(results);
              }
            );
          });

          await new Promise((resolve, reject) => {
            connection.query(
              sqlInsertDeviceShifts,
              [
                JSON.stringify(device),
                driver_id,
                queue,
                queue_time,
                shiftId,
                userId,
              ],
              (err, results) => {
                if (err) return reject(err);
                resolve(results);
              }
            );
          });

          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                reject(err);
              });
            }
            connection.release();
            resolve({
              status: true,
              message: "Shift ID and device shift inserted successfully",
            });
          });
        } catch (error) {
          connection.rollback(() => {
            connection.release();
            reject(error);
          });
        }
      });
    });
  });
};

export const updateReason = async (reason, deviceId) => {
  const sql = `UPDATE usage_control SET reason = ? WHERE deviceId = ?;`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [reason, deviceId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const addLogAndReport = async (body) => {
  const {
    log_timestamp,
    device_id,
    driver_id,
    action_command,
    performed_by,
    location,
    action_reason,
    shift_id,
    complied,
  } = body;

  const logSql = `INSERT INTO reports_uc_logs
    (log_timestamp, device_id, driver_id, action_command, performed_by, location, action_reason) 
    VALUES (?, ?, ?, ?, ?, ?, ?);`;

  const reportSql = `INSERT INTO reports_control_usage
    (log_timestamp, device_id, shift_id, commands, driver_id, manual_control, action_reason, auth_location, complied) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;

  const logValues = [
    log_timestamp,
    device_id,
    driver_id,
    action_command,
    performed_by,
    location,
    action_reason,
  ];

  const reportValues = [
    log_timestamp,
    device_id,
    shift_id,
    action_command === "900,1,1" ? "YES" : "NO",
    driver_id,
    action_command === true ? "YES" : "NO",
    action_reason,
    location,
    complied,
  ];

  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        return reject(err);
      }

      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return reject(err);
        }

        connection.query(logSql, logValues, (err, logResults) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              reject(err);
            });
          }

          connection.query(reportSql, reportValues, (err, reportResults) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                reject(err);
              });
            }

            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  reject(err);
                });
              }

              connection.release();
              resolve({ logResults, reportResults });
            });
          });
        });
      });
    });
  });
};

export const fetchAllLogs = async () => {
  const sql = `SELECT 
    rul.id AS log_id,
    rul.log_timestamp,
    nsd.name AS device_name,
    d.name AS driver_name,
    rul.action_command,
    rul.performed_by,
    rul.location,
    rul.action_reason
  FROM 
    reports_uc_logs rul
  LEFT JOIN 
    new_settings_devices nsd ON rul.device_id = nsd.id
  LEFT JOIN 
    drivers d ON rul.driver_id = d.id
  ORDER BY 
    rul.log_timestamp DESC;
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchAllLogsbyUserId = async (userId) => {
  const sql = `SELECT
    rul.id AS log_id,
    rul.log_timestamp,
    nsd.name AS device_name,
    d.name AS driver_name,
    rul.action_command,
    rul.performed_by,
    rul.location,
    rul.action_reason
  FROM
    reports_uc_logs rul
  LEFT JOIN
    new_settings_devices nsd ON rul.device_id = nsd.id
  LEFT JOIN
    drivers d ON rul.driver_id = d.id
  WHERE rul.performed_by = ?
  ORDER BY
    rul.log_timestamp DESC;
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchAllReports = async () => {
  const sql = `SELECT 
  rcu.id AS report_id,
  rcu.log_timestamp,
  nsd.name AS device_name,
  cs.shift_name AS shift_name,
  CASE 
      WHEN rcu.commands = 'YES' THEN 'YES'
      ELSE 'NO' 
  END AS commands,
  d.name AS driver_name,
  CASE 
      WHEN rcu.manual_control = 'YES' THEN 'YES'
      ELSE 'NO' 
  END AS manual_control,
  rcu.action_reason,
  rcu.auth_location,
  CASE 
      WHEN rcu.complied = 'YES' THEN 'YES'
      ELSE 'NO' 
  END AS complied
FROM reports_control_usage rcu
LEFT JOIN new_settings_devices nsd ON rcu.device_id = nsd.id
LEFT JOIN drivers d ON rcu.driver_id = d.id
LEFT JOIN config_shifts cs ON rcu.shift_id = cs.id
ORDER BY rcu.log_timestamp DESC;
`;

  return new Promise((resolve, reject) => {
    pool.query(sql, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchAllReportsByUserId = async (userId) => {
  const sql = `SELECT 
  rcu.id AS report_id,
  rcu.log_timestamp,
  rcu.performed_by,
  nsd.name AS device_name,
  cs.shift_name AS shift_name,
  CASE 
      WHEN rcu.action_command = 'YES' THEN 'YES'
      ELSE 'NO' 
  END AS commands,
  d.name AS driver_name,
  rcu.action_reason,
  rcu.location
FROM reports_uc_logs rcu
LEFT JOIN new_settings_devices nsd ON rcu.device_id = nsd.id
LEFT JOIN drivers d ON rcu.driver_id = d.id
LEFT JOIN config_shifts cs ON rcu.device_id = cs.id
WHERE rcu.performed_by = ?
ORDER BY rcu.log_timestamp DESC;
`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchDeviceUsageById = async (deviceId) => {
  const sql = `SELECT 
        uc.id AS usage_id,
        uc.deviceId,
        sd.name AS device_name,
        uc.shiftId,
        cs.shift_name,
        cs.start_time,
        cs.end_time,
        cs.shift_type,
        uc.driverId,
        d.name AS driver_name,
        uc.reason,
        uc.created_At AS usage_created_at,
        uc.updated_At AS usage_updated_at
    FROM 
        usage_control uc
    LEFT JOIN 
        config_shifts cs ON uc.shiftId = cs.id
    LEFT JOIN 
        drivers d ON uc.driverId = d.id
    LEFT JOIN 
        settings_devices sd ON uc.deviceId = sd.id
    WHERE 
        uc.deviceId = ?;

`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [deviceId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};
