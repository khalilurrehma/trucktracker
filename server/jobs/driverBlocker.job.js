import pool from "../config/dbConfig.js";
import util from "util";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const dbQuery = util.promisify(pool.query).bind(pool);

export const startDriverBlockerJob = async () => {
  try {
    const yesterday = dayjs().tz("America/Lima").subtract(1, "day");
    const readingDate = yesterday.format("YYYY-MM-DD");
    const startOfYesterday = yesterday
      .startOf("day")
      .format("YYYY-MM-DD HH:mm:ss");
    const endOfYesterday = yesterday.endOf("day").format("YYYY-MM-DD HH:mm:ss");

    console.log(
      `🚀 Starting blocker cron for drivers logged in on ${readingDate}`
    );

    const drivers = await dbQuery(`
      SELECT DISTINCT driver_id FROM vehicle_driver_association
    `);

    for (const driver of drivers) {
      const { driver_id } = driver;

      const login = await dbQuery(
        `
        SELECT id FROM driver_login_logs 
        WHERE driver_id = ? AND login_time BETWEEN ? AND ?
        LIMIT 1
      `,
        [driver_id, startOfYesterday, endOfYesterday]
      );

      if (!login.length) continue;

      const reading = await dbQuery(
        `
        SELECT id FROM odometer_readings 
        WHERE driver_id = ? AND reading_date = ?
      `,
        [driver_id, readingDate]
      );

      if (!reading.length) {
        const existingBlock = await dbQuery(
          `
          SELECT id FROM driver_block_records 
          WHERE driver_id = ? AND missing_reading_date = ?
        `,
          [driver_id, readingDate]
        );

        if (!existingBlock.length) {
          await dbQuery(`UPDATE drivers SET is_blocked = 1 WHERE id = ?`, [
            driver_id,
          ]);

          await dbQuery(
            `
            INSERT INTO driver_block_records (driver_id, missing_reading_date) 
            VALUES (?, ?)
          `,
            [driver_id, readingDate]
          );

          console.log(
            `🚫 Driver ${driver_id} blocked: missing reading for ${readingDate}`
          );
        }
      }
    }

    console.log("✅ Blocker cron finished.");
  } catch (err) {
    console.error("❌ Error in blocker cron:", err.message);
  }
};
