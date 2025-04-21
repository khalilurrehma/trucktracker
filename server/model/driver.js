import pool from "../config/dbConfig.js";

export const addDriver = async (body) => {
  const { userId, traccarId, name, uniqueId, attributes, location } = body;

  const sql = `
      INSERT INTO drivers
        (user_id, traccar_id, name, unique_id, attributes, location, assigned, deleted_at, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NOW(), NOW())
    `;

  const values = [
    userId,
    traccarId,
    name,
    uniqueId,
    JSON.stringify(attributes),
    JSON.stringify(location),
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

  return new Promise((resolve, reject) => {
    pool.query(sql, [parseInt(userId)], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
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

export const updateDriver = async (id, body) => {
  const { name, uniqueId, attributes, location } = body;

  const sql =
    "UPDATE drivers SET name = ?, uniqueId = ?, attributes = ?, location = ? WHERE id = ?";

  const values = [
    name,
    uniqueId,
    JSON.stringify(attributes),
    JSON.stringify(location),
    id,
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

  return new Promise((resolve, reject) => {
    pool.query(userId ? sql : superAdminSql, [userId], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const cron_logs = async (log_body) => {
  const {
    device_id,
    device_name,
    cron_type,
    cron_expression,
    scheduled_time,
    status = "success",
    notes = "",
  } = log_body;

  const sql = `
    INSERT INTO device_cron_logs (
      device_id, device_name, cron_type, cron_expression,
      scheduled_time, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    device_id,
    device_name,
    cron_type,
    cron_expression,
    scheduled_time,
    status,
    notes,
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
