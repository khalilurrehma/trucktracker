import pool from "../config/dbConfig.js";

export const getCategories = async () => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT * FROM settings_categories", (err, results) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

export const allCategoriesReports = async () => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT 
          sc.id AS category_id,
          sc.name AS category_name,
          sc.icon AS category_icon,
          sc.created_by AS category_created_by,
          sc.created_at AS category_created_at,
          JSON_ARRAYAGG(
              JSON_OBJECT(
                  'id', sr.id,
                  'name', sr.name,
                  'icon', sr.icon,
                  'created_by', sr.created_by,
                  'category_id', sr.category_id,
                  'calcs', sr.calcs,
                  'calcs_ids', sr.calcs_ids,
                  'created_at', sr.created_at
              )
          ) AS reports
      FROM settings_categories sc
      LEFT JOIN settings_reports sr ON sc.id = sr.category_id
      GROUP BY sc.id
      ORDER BY sc.created_at DESC;`,

      (err, results) => {
        if (err) {
          reject(err);
        }
        const formattedResults = results?.map((result) => {
          let parsedReportBody = JSON.parse(result.reports);

          return {
            ...result,
            reports: parsedReportBody,
          };
        });
        resolve(formattedResults);
      }
    );
  });
};

export const getCategoryById = async (id) => {
  return new Promise((resolve, reject) => {
    pool.query(
      "SELECT * FROM settings_categories WHERE id = 1",
      (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results);
      }
    );
  });
};

export const createCategory = async (category) => {
  const { name, icon, created_by } = category;

  return new Promise((resolve, reject) => {
    pool.query(
      "INSERT INTO settings_categories (name, icon, created_by) VALUES (?, ?, ?)",
      [name, icon, created_by],
      (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results);
      }
    );
  });
};

export const modifyCatefory = async (id, category) => {
  const { name, icon, created_by } = category;

  return new Promise((resolve, reject) => {
    pool.query(
      `UPDATE settings_categories SET name = ? , icon = ?, created_by = ? WHERE id = ?`,
      [name, icon, created_by, id],
      (err, results) => {
        if (err) {
          reject(err);
        }
        resolve(results);
      }
    );
  });
};

export const removeCategory = async (id) => {
  return new Promise((resolve, reject) => {
    pool.query(
      "DELETE FROM settings_categories WHERE id = ?",
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
