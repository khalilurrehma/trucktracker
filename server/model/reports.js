import pool from "../config/dbConfig.js";

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

export const getReports = async () => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT settings_reports.*, settings_categories.name AS category_name
    FROM settings_reports
    LEFT JOIN settings_categories ON settings_reports.category_id = settings_categories.id
    ORDER BY settings_reports.created_at DESC`,

      (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results);
      }
    );
  });
};

export const getReportById = async (id) => {
  const sql = `
    SELECT * FROM settings_reports
    WHERE id = ?;
  `;
  return new Promise((resolve, reject) => {
    pool.query(sql, [id], (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results[0]);
    });
  });
};

export async function reportsByCreatedBy(createdBy) {
  const sql = `
    SELECT settings_reports.*, settings_categories.name AS category_name
    FROM settings_reports
    LEFT JOIN settings_categories ON settings_reports.category_id = settings_categories.id
    WHERE settings_reports.created_by = ? ORDER BY settings_reports.created_at DESC;
  `;

  const values = [createdBy];

  try {
    return new Promise((resolve, reject) => {
      pool.query(sql, values, (err, results) => {
        if (err) {
          reject(err);
        }

        const modifiedReports = results.map((report) => {
          return {
            ...report,
            // devices_ids: report.devices_ids.split("%2C"),
            // devices: report.devices.map((device) => device),
            calcs: report.calcs,
          };
        });

        resolve(modifiedReports);
      });
    });
  } catch (err) {
    throw err;
  }
}

export const createReport = async (report) => {
  const { name, icon, created_by, category_id, calcs, calcs_ids } = report;

  const sql = `INSERT INTO settings_reports (name, icon, created_by, category_id, calcs, calcs_ids) VALUES (?, ?, ?, ?, ?, ?)`;
  const values = [
    name,
    icon,
    created_by,
    category_id,
    JSON.stringify(calcs),
    JSON.stringify(calcs_ids),
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

export const createCalcReport = async (reportBody) => {
  const { calcId, traccarId, flespiReport, createdBy } = reportBody;
  const normalizedReport = Array.isArray(flespiReport)
    ? flespiReport.filter((row) => row != null)
    : [];

  if (normalizedReport.length === 0) {
    return { skipped: true, reason: "empty_report", affectedRows: 0 };
  }

  const payload = JSON.stringify(normalizedReport);
  const calcIdNum = Number(calcId);
  const traccarIdNum = Number(traccarId);

  const existingRows = await runQuery(
    `
      SELECT id, flespi_report
      FROM calculators_reports
      WHERE calc_id = ?
        AND traccar_id = ?
        AND DATE(created_at) = CURRENT_DATE
      ORDER BY id DESC
      LIMIT 1
    `,
    [calcIdNum, traccarIdNum]
  );

  const existing = existingRows?.[0];
  if (existing) {
    if ((existing.flespi_report || "") === payload) {
      return {
        skipped: true,
        reason: "unchanged_report",
        id: Number(existing.id),
        affectedRows: 0,
      };
    }

    const updateResult = await runQuery(
      `
        UPDATE calculators_reports
        SET flespi_report = ?, created_by = ?
        WHERE id = ?
      `,
      [payload, createdBy, Number(existing.id)]
    );

    return {
      updated: true,
      id: Number(existing.id),
      affectedRows: Number(updateResult?.affectedRows || 0),
    };
  }

  const sql = `
    INSERT INTO calculators_reports (calc_id, traccar_id, flespi_report, created_by)
    VALUES (?, ?, ?, ?)
  `;
  const values = [calcIdNum, traccarIdNum, payload, createdBy];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const getLatestCalcReportsByCalcIds = async ({ calcIds, traccarId }) => {
  const normalizedCalcIds = Array.from(
    new Set(
      (Array.isArray(calcIds) ? calcIds : [calcIds])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    )
  );
  const traccarIdNum = Number(traccarId);

  if (normalizedCalcIds.length === 0 || !Number.isFinite(traccarIdNum)) {
    return [];
  }

  const placeholders = normalizedCalcIds.map(() => "?").join(",");
  const sql = `
    SELECT cr.id, cr.calc_id, cr.traccar_id, cr.flespi_report, cr.created_by, cr.created_at
    FROM calculators_reports cr
    JOIN (
      SELECT calc_id, MAX(id) AS id
      FROM calculators_reports
      WHERE traccar_id = ?
        AND calc_id IN (${placeholders})
      GROUP BY calc_id
    ) latest ON latest.id = cr.id
    ORDER BY cr.id DESC
  `;

  return runQuery(sql, [traccarIdNum, ...normalizedCalcIds]);
};

export const getCalcIdsUpdatedToday = async ({ calcIds, traccarId }) => {
  const normalizedCalcIds = Array.from(
    new Set(
      (Array.isArray(calcIds) ? calcIds : [calcIds])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    )
  );
  const traccarIdNum = Number(traccarId);

  if (normalizedCalcIds.length === 0 || !Number.isFinite(traccarIdNum)) {
    return [];
  }

  const placeholders = normalizedCalcIds.map(() => "?").join(",");
  const sql = `
    SELECT DISTINCT calc_id
    FROM calculators_reports
    WHERE traccar_id = ?
      AND calc_id IN (${placeholders})
      AND DATE(created_at) = CURRENT_DATE
  `;

  const rows = await runQuery(sql, [traccarIdNum, ...normalizedCalcIds]);
  return rows.map((row) => Number(row.calc_id)).filter((id) => Number.isFinite(id));
};

export const modifyReport = async (id, report) => {
  const { name, icon, created_by, category_id, calcs, calcs_ids } = report;
  const sql = `UPDATE settings_reports SET name = ?, icon = ?, category_id = ?, calcs = ?, calcs_ids = ? WHERE id = ?`;
  const values = [
    name,
    icon,
    category_id,
    JSON.stringify(calcs),
    JSON.stringify(calcs_ids),
    parseInt(id),
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

export const removeReport = async (id) => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM settings_reports WHERE id = ?",
      [id],
      (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results);
      }
    );
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

export const fetchCronLogs = async () => {
  const sql = `
    SELECT * FROM device_cron_logs
    ORDER BY created_at DESC
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
