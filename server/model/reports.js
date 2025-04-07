import pool from "../config/dbConfig.js";

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
    const reports = await dbQuery(sql, values);

    const modifiedReports = reports.map((report) => {
      return {
        ...report,
        // devices_ids: report.devices_ids.split("%2C"),
        // devices: report.devices.map((device) => device),
        calcs: report.calcs,
      };
    });

    return modifiedReports;
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

  const sql = `INSERT INTO calculators_reports (calc_id, traccar_id, flespi_report, created_by) VALUES (?, ?, ?, ?)`;
  const values = [calcId, traccarId, JSON.stringify(flespiReport), createdBy];

  return new Promise((resolve, reject) => {
    pool.query(sql, values, (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
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
