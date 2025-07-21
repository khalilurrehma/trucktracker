import pool from "../config/dbConfig.js";
import util from "util";
import { sendPushNotification } from "../utils/pushNotification.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const dbQuery = util.promisify(pool.query).bind(pool);

export const sendOdometerReminder = async () => {
  try {
    const limaNow = dayjs().tz("America/Lima");
    const todayDate = limaNow.format("YYYY-MM-DD");

    console.log(`🚀 Checking active dispatch drivers on ${todayDate}`);

    const activeDrivers = await dbQuery(
      `
      SELECT DISTINCT dr.id AS driver_id
      FROM drivers dr
      JOIN vehicle_driver_association vda ON dr.id = vda.driver_id
      JOIN dispatch_case_devices dcd ON vda.device_id = dcd.device_id
      JOIN dispatch_cases dc ON dcd.dispatch_case_id = dc.id
      WHERE DATE(dc.created_at) = ?
    `,
      [todayDate]
    );

    if (activeDrivers.length === 0) {
      console.log("✅ No active dispatch drivers today, no reminders needed.");
      return;
    }

    const driverIds = activeDrivers.map((d) => d.driver_id);
    const placeholders = driverIds.map(() => "?").join(",");

    const fcmResults = await dbQuery(
      `
      SELECT driver_id, fcm_token 
      FROM drivers_fcm_token 
      WHERE driver_id IN (${placeholders}) 
        AND fcm_token IS NOT NULL
    `,
      [...driverIds]
    );

    if (fcmResults.length === 0) {
      console.log("❌ No FCM tokens found for active drivers.");
      return;
    }

    for (const { driver_id, fcm_token } of fcmResults) {
      const title = "Odometer Reminder";
      const body = `Please update your vehicle's odometer reading today (${todayDate}).`;
      const data = {
        type: "odometer_reminder",
        reading_date: todayDate,
      };

      await sendPushNotification([fcm_token], title, body, data);
      console.log(`📲 Sent reminder to driver ID ${driver_id}`);
    }

    console.log(`✅ Sent reminders to ${fcmResults.length} drivers.`);
  } catch (error) {
    console.error("❌ Error in sendOdometerReminder:", error);
  }
};
