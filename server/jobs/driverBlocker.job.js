import pool from "../config/dbConfig.js";
import util from "util";
import { sendPushNotification } from "../utils/pushNotification.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const dbQuery = util.promisify(pool.query).bind(pool);

export const startDriverBlockerJob = async () => {
  try {
    const tz = "America/Lima";
    const today = dayjs().tz(tz);
    const readingDate = today.subtract(1, "day").format("YYYY-MM-DD");

    console.log(`🚀 Starting blocker cron for date: ${readingDate}`);

    // Step 1: Find drivers with at least one assigned case yesterday
    const activeDrivers = await dbQuery(
      `
      SELECT DISTINCT dr.id AS driver_id
      FROM drivers dr
      JOIN vehicle_driver_association vda ON dr.id = vda.driver_id
      JOIN dispatch_case_devices dcd ON vda.device_id = dcd.device_id
      JOIN dispatch_cases dc ON dcd.dispatch_case_id = dc.id
      WHERE DATE(dc.created_at) = ?
    `,
      [readingDate]
    );

    console.log(
      `🔍 Found ${activeDrivers.length} drivers with assigned cases.`
    );

    for (const { driver_id } of activeDrivers) {
      // Step 2: Check if driver submitted odometer reading
      const [reading] = await dbQuery(
        `
        SELECT id FROM odometer_readings 
        WHERE driver_id = ? AND reading_date = ?
        LIMIT 1
      `,
        [driver_id, readingDate]
      );

      if (reading) {
        console.log(`✅ Driver ${driver_id} has odometer reading, skip.`);
        continue;
      }

      // Step 3: Check if already blocked
      const [existingBlock] = await dbQuery(
        `
        SELECT id FROM driver_block_records 
        WHERE driver_id = ? AND missing_reading_date = ?
      `,
        [driver_id, readingDate]
      );

      if (existingBlock) {
        console.log(`⚠️ Driver ${driver_id} already blocked, skip.`);
        continue;
      }

      // Step 4: Block driver
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
        `🚫 Driver ${driver_id} blocked: missing odometer for ${readingDate}`
      );

      const [fcmRow] = await dbQuery(
        `
        SELECT fcm_token FROM drivers_fcm_token 
        WHERE driver_id = ? AND fcm_token IS NOT NULL
      `,
        [driver_id]
      );

      if (fcmRow && fcmRow.fcm_token) {
        const title = "🚫 You Have Been Blocked!";
        const body =
          "Please submit your missing odometer reading to regain access.";
        const data = {
          type: "blocked_odometer_alert",
          action: "submit_missing_reading",
          reading_date: readingDate,
        };

        await sendPushNotification([fcmRow.fcm_token], title, body, data);
        console.log(`📲 Block notification sent to driver ID ${driver_id}`);
      } else {
        console.log(
          `⚠️ No FCM token found for driver ID ${driver_id}, skip notification.`
        );
      }
    }

    console.log("✅ Blocker cron finished.");
  } catch (err) {
    console.error("❌ Error in blocker cron:", err.message);
  }
};
