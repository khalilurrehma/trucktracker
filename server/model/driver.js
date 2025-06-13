import pool from "../config/dbConfig.js";

export const addDriver = async (body) => {
  const { userId, traccarId, name, uniqueId, attributes, location, password } =
    body;

  const sql = `
      INSERT INTO drivers
        (user_id, traccar_id, name, unique_id, attributes, location, password, assigned, deleted_at, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NOW(), NOW())
    `;

  const values = [
    userId,
    traccarId,
    name,
    uniqueId,
    JSON.stringify(attributes),
    JSON.stringify(location),
    password,
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

export const fetchDrivers = async () => {
  const driverSQL = "SELECT * FROM drivers";
  const shiftSQL = "SELECT * FROM config_shifts";

  return new Promise((resolve, reject) => {
    pool.query(driverSQL, async (driverErr, drivers) => {
      if (driverErr) return reject(driverErr);

      // Get all shifts once
      pool.query(shiftSQL, (shiftErr, shifts) => {
        if (shiftErr) return reject(shiftErr);

        const shiftMap = new Map();
        shifts.forEach((s) => shiftMap.set(s.id, s));

        const populatedDrivers = drivers.map((driver) => {
          let availability = [];

          try {
            const parsed = JSON.parse(driver.availability_details || "[]");
            availability = parsed.map((entry) => ({
              ...entry,
              shift_detail: shiftMap.get(entry.shift) || null,
            }));
          } catch (e) {
            console.warn(
              `Invalid availability_details JSON for driver ${driver.id}`
            );
          }

          return {
            ...driver,
            availability_details: availability,
          };
        });

        resolve(populatedDrivers);
      });
    });
  });
};

export const fetchDriversByUserId = async (userId) => {
  const sql = "SELECT * FROM drivers WHERE user_id =?";
  const shiftSQL = "SELECT * FROM config_shifts";

  return new Promise((resolve, reject) => {
    pool.query(sql, [parseInt(userId)], (driverErr, drivers) => {
      if (driverErr) return reject(driverErr);

      pool.query(shiftSQL, (shiftErr, shifts) => {
        if (shiftErr) return reject(shiftErr);

        const shiftMap = new Map();
        shifts.forEach((s) => shiftMap.set(s.id, s));

        const populatedDrivers = drivers.map((driver) => {
          let availability = [];

          try {
            const parsed = JSON.parse(driver.availability_details || "[]");
            availability = parsed.map((entry) => ({
              ...entry,
              shift_detail: shiftMap.get(entry.shift) || null,
            }));
          } catch (e) {
            console.warn(
              `Invalid availability_details JSON for driver ${driver.id}`
            );
          }

          return {
            ...driver,
            availability_details: availability,
          };
        });

        resolve(populatedDrivers);
      });
    });
  });
};

export const fetchDriver = async (id) => {
  const sql = "SELECT * FROM drivers where id = ?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const driverByEmail = async (email) => {
  const sql =
    "SELECT * FROM drivers WHERE JSON_EXTRACT(attributes, '$.email') = ?";
  return new Promise((resolve, reject) => {
    pool.query(sql, [email], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]);
    });
  });
};

export const confirmDriverShift = async (driverId) => {
  const getDriverQuery =
    "SELECT availability_details FROM drivers WHERE id = ?";

  return new Promise((resolve, reject) => {
    pool.query(getDriverQuery, [driverId], (err, driverResults) => {
      if (err) return reject(err);

      if (driverResults.length === 0) {
        return resolve({ exists: false, message: "Driver not found" });
      }

      let shiftIds;
      try {
        const availability = JSON.parse(driverResults[0].availability_details);
        shiftIds = [...new Set(availability.map((item) => item.shift))];
      } catch (parseErr) {
        return reject({
          exists: false,
          message: "Invalid JSON in availability_details",
        });
      }

      if (shiftIds.length === 0) {
        return resolve({ exists: false, message: "No shifts assigned" });
      }

      const placeholders = shiftIds.map(() => "?").join(",");
      const checkShiftQuery = `SELECT id FROM config_shifts WHERE id IN (${placeholders})`;

      pool.query(checkShiftQuery, shiftIds, (err, shiftResults) => {
        if (err) return reject(err);

        const validIds = shiftResults.map((row) => row.id);
        const missingShifts = shiftIds.filter((id) => !validIds.includes(id));
        const allExist = missingShifts.length === 0;

        resolve({
          exists: allExist,
          missingShifts,
        });
      });
    });
  });
};

export const getDriverCompany = async (driverId) => {
  const sql = "SELECT user_id FROM drivers WHERE id = ?";
  return new Promise((resolve, reject) => {
    pool.query(sql, [driverId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]?.user_id);
    });
  });
};

export const updateDriver = async (id, body) => {
  const { name, uniqueId, attributes, location, password } = body;

  let fields = ["name = ?", "attributes = ?", "location = ?"];
  let values = [name, JSON.stringify(attributes), JSON.stringify(location)];

  if (password) {
    fields.push("password = ?");
    values.push(password);
  }

  values.push(parseInt(id));

  const sql = `UPDATE drivers SET ${fields.join(", ")} WHERE id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const removeDriver = async (id) => {
  const sql = "DELETE FROM drivers WHERE id = ?";
  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const updateDriverAvailability = async (id, details) => {
  const sql = `UPDATE drivers SET availability_details = ?, updated_at = NOW() WHERE id = ?`;

  const values = [JSON.stringify(details), id];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        return reject(
          new Error("Failed to update driver availability: " + err.message)
        );
      }
      resolve(results);
    });
  });
};

export const fetchDriverAvailability = async (id) => {
  const sql = "SELECT availability_details FROM drivers WHERE id = ?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      const availability = JSON.parse(results[0]?.availability_details || "[]");
      const shiftIds = [...new Set(availability.map((a) => a.shift))];

      if (shiftIds.length === 0) {
        return resolve([]);
      }
      const placeholders = shiftIds.map(() => "?").join(",");
      const shiftQuery = `SELECT * FROM config_shifts WHERE id IN (${placeholders})`;

      pool.query(shiftQuery, shiftIds, (err2, shifts) => {
        if (err2) {
          return reject(err2);
        }

        const enrichedAvailability = availability.map((a) => {
          const fullShift = shifts.find((s) => s.id === a.shift);
          return {
            ...a,
            shift_info: fullShift || null,
          };
        });

        resolve(enrichedAvailability);
      });
    });
  });
};

export const driversShiftDetails = async (userId) => {
  const superAdminSql = `SELECT traccar_id, name, availability_details FROM drivers`;
  const sql = `SELECT traccar_id, name, availability_details FROM drivers WHERE user_id = ?`;

  const drivers = await new Promise((resolve, reject) => {
    pool.query(userId ? sql : superAdminSql, [userId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

  // Fetch all shift configs
  const shifts = await new Promise((resolve, reject) => {
    pool.query("SELECT * FROM config_shifts", (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

  const shiftMap = {};
  shifts.forEach((s) => {
    shiftMap[s.id] = s;
  });

  // Enrich each driver's availability_details
  const enrichedDrivers = drivers.map((driver) => {
    if (driver.availability_details) {
      try {
        const parsed = JSON.parse(driver.availability_details);
        const enriched = parsed.map((entry) => ({
          ...entry,
          shift: shiftMap[entry.shift] || entry.shift,
        }));
        driver.availability_details = enriched;
      } catch (err) {
        driver.availability_details = [];
      }
    }
    return driver;
  });

  return enrichedDrivers;
};

export const saveAssociationRelation = async (body) => {
  // vehicle is always device for backend.
  const sql = `INSERT INTO vehicle_driver_association (device_id, driver_id, odometer_reading, device_status, description, image_url)
    VALUES (?, ?, ?, ?, ?, ?)`;

  const values = [
    parseInt(body.device_id),
    body.driver_id,
    body.odometer,
    body.device_status,
    body.description,
    body.image_url,
  ];
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const findAssociateVehicleByDriverId = async (driver_id) => {
  const sql = `SELECT device_id FROM vehicle_driver_association WHERE driver_id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.device_id);
    });
  });
};

export const driverNameByDeviceId = async (device_id) => {
  const sql = `
    SELECT 
      d.id AS driver_id, 
      d.name AS driver_name
    FROM 
      vehicle_driver_association vda
    JOIN 
      drivers d ON vda.driver_id = d.id
    WHERE 
      vda.device_id = ?
    ORDER BY 
      vda.created_at DESC
    LIMIT 1
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, [device_id], (err, results) => {
      if (err) return reject(err);
      if (results.length > 0) {
        resolve({
          id: results[0].driver_id,
          name: results[0].driver_name,
        });
      } else {
        resolve(null);
      }
    });
  });
};

export const findVehiclesByDriverId = async (driver_id) => {
  const sql = `
    SELECT 
      vda.*, 
      d.id AS device_id, 
      d.name AS device_name,
      dr.id AS driver_id,
      dr.name AS driver_name
    FROM 
      vehicle_driver_association vda
    JOIN 
      new_settings_devices d ON vda.device_id = d.id
    JOIN 
      drivers dr ON vda.driver_id = dr.id
    WHERE 
      vda.driver_id = ?
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const checkAlreadyAssociatedVehicle = async (driver_id) => {
  const sql = `SELECT * FROM vehicle_driver_association WHERE driver_id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

export const saveDriverResetToken = async (driver_id, otp, expires_at) => {
  const sql = `INSERT INTO password_reset_tokens (driver_id, otp, expires_at) VALUES (?, ?, ?)`;
  const values = [driver_id, otp, expires_at];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const removeVehicleAssociation = async (driver_id, device_id) => {
  const sql = `DELETE FROM vehicle_driver_association WHERE driver_id = ? AND device_id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id, device_id], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const driverStatus = async (driver_id) => {
  const sql = "SELECT availability_status FROM drivers WHERE id = ?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]?.availability_status);
    });
  });
};

export const modifyDriverStatus = async (status, driver_id) => {
  const sql = "UPDATE drivers SET availability_status = ? WHERE id = ?";

  return new Promise((resolve, reject) => {
    pool.query(sql, [status, driver_id], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const driverStatusInService = async (driver_id) => {
  const sql = `UPDATE drivers SET availability_status = 'in service' WHERE id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const driverStatusAvailable = async (driver_id) => {
  const sql = `UPDATE drivers SET availability_status = 'available' WHERE id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const clearOldSessions = async (driver_id) => {
  const sql = `DELETE FROM driver_sessions WHERE driver_id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const checkSessionInDB = async (driver_id, token) => {
  const sql = `SELECT * FROM driver_sessions WHERE driver_id = ? AND token = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id, token], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const saveNewSession = async (driver_id, device_id, token) => {
  const sql = `INSERT INTO driver_sessions (driver_id, device_id, token) VALUES (?, ?, ?)`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id, device_id, token], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const saveFCMToken = async (driver_id, fcm_token) => {
  const sql = `
    INSERT INTO drivers_fcm_token (driver_id, fcm_token, created_at, updated_at)
    VALUES (?, ?, NOW(), NOW())
  `;

  const values = [driver_id, fcm_token];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const existingFCMToken = async (driver_id) => {
  const sql = `
    SELECT fcm_token FROM drivers_fcm_token WHERE driver_id = ?
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_id], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const updateFCMToken = async (driver_id, fcm_token) => {
  const sql = `
    UPDATE drivers_fcm_token SET fcm_token = ?, updated_at = NOW() WHERE driver_id = ?
  `;
  const values = [fcm_token, driver_id];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export const getDriverIdsByDeviceIds = async (device_ids) => {
  const sql =
    "SELECT DISTINCT driver_id FROM vehicle_driver_association WHERE device_id IN (?)";

  return new Promise((resolve, reject) => {
    pool.query(sql, [device_ids], (err, results) => {
      if (err) return reject(err);
      resolve(results.map((row) => row.driver_id));
    });
  });
};

export const getFcmTokensByDriverIds = async (driver_ids) => {
  const sql = `SELECT fcm_token FROM drivers_fcm_token WHERE driver_id IN (?)`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [driver_ids], (err, results) => {
      if (err) return reject(err);
      resolve(results.map((row) => row.fcm_token));
    });
  });
};

export const getDriverServiceTime = async (driver_id) => {
  const sql = `SELECT service_time_seconds FROM driver_service_record WHERE driver_id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [parseInt(driver_id)], (err, results) => {
      if (err) return reject(err);
      resolve(results.map((row) => row.service_time_seconds));
    });
  });
};

export const getDriverCompletedCases = async (driver_id) => {
  const sql = `
    SELECT 
      dcc.case_id, 
      dcc.completed_day, 
      dcc.completed_time,
      dc.*
    FROM dispatch_complete_cases dcc
    JOIN dispatch_cases dc ON dcc.case_id = dc.id
    WHERE dcc.driver_id = ?
  `;

  return new Promise((resolve, reject) => {
    pool.query(sql, [parseInt(driver_id)], (err, results) => {
      if (err) return reject(err);

      const formattedResult = results.map((row) => {
        let deviceData = JSON.parse(row.device_meta);

        return {
          case_id: row.case_id,
          completed_day: row.completed_day,
          completed_time: row.completed_time,
          case_service_type: deviceData[0]?.services[0]?.serviceName,
          recent_case_data: {
            case_id: row.case_id,
            case_name: row.case_name,
            case_address: row.case_address,
            status: row.status,
            current_subprocess: row.current_subprocess,
          },
        };
      });

      resolve(formattedResult);
    });
  });
};

export const getDriverReportAuthStatus = async (driver_id) => {
  const sql = `SELECT authorized_status FROM dispatch_case_reports WHERE driver_id = ?`;

  return new Promise((resolve, reject) => {
    pool.query(sql, [parseInt(driver_id)], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};
