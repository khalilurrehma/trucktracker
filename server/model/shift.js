import pool from "../config/dbConfig.js";
import dayjs from "dayjs";

export const addNewShift = async (body) => {
  const {
    shift_name,
    start_time,
    end_time,
    shift_type,
    grace_time,
    userId,
    start_day,
    end_day,
    queue_ttl,
    queue_status,
    queue_startsIn,
    queue_EndsIn,
  } = body;

  const sql = `
    INSERT INTO config_shifts 
    (shift_name, start_time, end_time, shift_type, grace_time, userId, start_day, end_day, queue_ttl, queue_status, queue_startsIn, queue_endsIn, created_at, updated_at)
      VALUES 
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
  `;

  const values = [
    shift_name,
    start_time,
    end_time,
    shift_type,
    grace_time,
    userId,
    JSON.stringify(start_day),
    JSON.stringify(end_day),
    queue_ttl,
    queue_status === "yes" ? 1 : 0,
    queue_startsIn,
    queue_EndsIn,
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

export const fetchShifts = async () => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT * FROM config_shifts", (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchShiftById = async (id) => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT * FROM config_shifts WHERE id =?",
      [id],
      (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results[0]);
      }
    );
  });
};

export const updateShift = async (body, shift_id) => {
  const {
    shift_name,
    start_time,
    end_time,
    shift_type,
    grace_time,
    userId,
    queue_ttl,
    queue_startsIn,
    queue_EndsIn,
  } = body;
  const sql = `
    UPDATE config_shifts
    SET shift_name =?, start_time =?, end_time =?, shift_type =?, grace_time =?, userId =?, queue_ttl =?, queue_startsIn =?, queue_endsIn =?, updated_at = NOW()
    WHERE id =?
  `;

  const values = [
    shift_name,
    start_time,
    end_time,
    shift_type,
    grace_time,
    userId,
    queue_ttl,
    queue_startsIn,
    queue_EndsIn,
    shift_id,
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

export const deleteShift = async (shift_id) => {
  const sql = "DELETE FROM config_shifts WHERE id =?";
  return new Promise((resolve, reject) => {
    pool.query(sql, [shift_id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const fetchShiftByType = async (type) => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT * FROM config_shifts where shift_type = ?",
      type,
      (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results);
      }
    );
  });
};

export const fetchShiftByUserId = async (userId) => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT * FROM config_shifts where userId =?",
      userId,
      (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results);
      }
    );
  });
};

// attendance report's

export const createOrUpdateAttendanceReport = async (
  body,
  deviceId,
  action
) => {
  const {
    device,
    driver,
    shiftStart,
    shiftEnd,
    graceTime,
    igBeforeShiftStart,
    stationArrivalTime,
    igBeforeShiftEnd,
    igOffAfterShiftEnd,
    shiftBeginStatus,
    shiftEndStatus,
  } = body;

  if (action === "create") {
    const createSql = `
      INSERT INTO attendance_reports 
        (date, flespi_device_id, device, driver, shift_begin, grace_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW());
    `;
    // convert startTime format into YYYY-MM-DD HH:MM:SS only!

    const values = [
      dayjs().format("YYYY-MM-DD"),
      deviceId,
      JSON.stringify(device),
      driver,
      shiftStart,
      graceTime,
    ];

    return new Promise((resolve, reject) => {
      pool.query(createSql, values, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  if (action === "update") {
    const updateSql = `
      UPDATE attendance_reports 
      SET 
        shift_end = ?, 
        ignition_before_shift_end = ?, 
        ignition_off_after_shift_end = ?
      WHERE flespi_device_id = ?
    `;

    const values = [shiftEnd, igBeforeShiftEnd, igOffAfterShiftEnd, deviceId];

    return new Promise((resolve, reject) => {
      pool.query(updateSql, values, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  return Promise.reject(
    new Error("Invalid action type. Use 'create' or 'update'.")
  );
};
