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
    const startOfDay = limaNow.startOf("day").format("YYYY-MM-DD HH:mm:ss");
    const endOfDay = limaNow.endOf("day").format("YYYY-MM-DD HH:mm:ss");

    console.log(
      `Checking login between ${startOfDay} and ${endOfDay} (America/Lima)`
    );

    const drivers = await dbQuery(`
      SELECT DISTINCT driver_id 
      FROM vehicle_driver_association
    `);

    if (drivers.length === 0) {
      console.log("No drivers with associated vehicles found.");
      return;
    }

    const validDriverIds = drivers.map((driver) => driver.driver_id);

    const placeholders = validDriverIds.map(() => "?").join(",");
    const loggedInDrivers = await dbQuery(
      `
      SELECT DISTINCT driver_id 
      FROM driver_login_logs 
      WHERE login_time BETWEEN ? AND ?
        AND driver_id IN (${placeholders})
    `,
      [startOfDay, endOfDay, ...validDriverIds]
    );

    if (loggedInDrivers.length === 0) {
      console.log("No drivers logged in today.");
      return;
    }

    const activeDriverIds = loggedInDrivers.map((d) => d.driver_id);

    const activePlaceholders = activeDriverIds.map(() => "?").join(",");

    const fcmResults = await dbQuery(
      `
      SELECT driver_id, fcm_token 
      FROM drivers_fcm_token 
      WHERE driver_id IN (${activePlaceholders})
        AND fcm_token IS NOT NULL
    `,
      [...activeDriverIds]
    );

    if (fcmResults.length === 0) {
      console.log("No FCM tokens found for active drivers.");
      return;
    }

    for (const driver of fcmResults) {
      const { driver_id, fcm_token } = driver;
      const title = "Odometer Reminder";
      const body = `Please update your vehicle's odometer reading today (${limaNow.format(
        "YYYY-MM-DD"
      )}).`;
      const data = {
        type: "odometer_reminder",
        reading_date: limaNow.format("YYYY-MM-DD"),
      };

      await sendPushNotification([fcm_token], title, body, data);
      console.log(`Sent reminder to driver ID ${driver_id}`);
    }

    console.log(`Sent reminders to ${fcmResults.length} drivers.`);
  } catch (error) {
    console.error("Error in sendOdometerReminder:", error);
  }
};
