import dotenv from "dotenv";
dotenv.config();
import { CronJob } from "cron";
import { runDailyBackup } from "./jobs/dailyBackup.job.js";
import { sendOdometerReminder } from "./jobs/odometerSoftReminder.job.js";
import { startDriverBlockerJob } from "./jobs/driverBlocker.job.js";

function startBackupCron() {
  const job = new CronJob(
    "0 1 * * *",
    async () => {
      console.log(
        `[${new Date().toLocaleString("en-US", {
          timeZone: "America/Lima",
        })}] 🕓 Starting daily Flespi backup...`
      );
      try {
        await runDailyBackup();
        console.log(
          `[${new Date().toLocaleString("en-US", {
            timeZone: "America/Lima",
          })}] ✅ Backup completed.`
        );
      } catch (err) {
        console.error(
          `[${new Date().toLocaleString("en-US", {
            timeZone: "America/Lima",
          })}] ❌ Backup failed:`,
          err.message
        );
      }
    },
    null,
    false,
    "America/Lima"
  );

  job.start();
  console.log("✅ Cron job registered: daily at 1:00 AM (America/Lima).");
}

function reminderForOdometer() {
  const job = new CronJob(
    "0 23 * * *",
    async () => {
      console.log(
        `[${new Date().toLocaleString("en-US", {
          timeZone: "America/Lima",
        })}] 🕓 Starting odometer reminder...`
      );
      try {
        await sendOdometerReminder();
        console.log(
          `[${new Date().toLocaleString("en-US", {
            timeZone: "America/Lima",
          })}] ✅ Odometer reminder sent.`
        );
      } catch (err) {
        console.error(
          `[${new Date().toLocaleString("en-US", {
            timeZone: "America/Lima",
          })}] ❌ Odometer reminder failed:`,
          err.message
        );
      }
    },
    null,
    false,
    "America/Lima"
  );

  job.start();
  console.log("✅ Cron job registered: daily at 11:00 PM (America/Lima).");
}

function driverBlocker() {
  const job = new CronJob(
    "0 1 * * *",
    async () => {
      console.log(
        `[${new Date().toLocaleString("en-US", {
          timeZone: "America/Lima",
        })}] 🕓 Starting driver blocker...`
      );
      try {
        await startDriverBlockerJob();
        console.log(
          `[${new Date().toLocaleString("en-US", {
            timeZone: "America/Lima",
          })}] ✅ Driver blocker completed.`
        );
      } catch (err) {
        console.error(
          `[${new Date().toLocaleString("en-US", {
            timeZone: "America/Lima",
          })}] ❌ Driver blocker failed:`,
          err.message
        );
      }
    },
    null,
    false,
    "America/Lima"
  );

  job.start();
  console.log("✅ Cron job registered: daily at 1:00 AM (America/Lima).");
}

startBackupCron();
reminderForOdometer();
driverBlocker();

const testSetTimeout = async (testType) => {
  console.log(`🕓 Starting ${testType} test...`);
  try {
    if (testType === "backup") {
      await runDailyBackup();
    } else if (testType === "odometer") {
      await sendOdometerReminder();
    } else if (testType === "driverBlocker") {
      await startDriverBlockerJob();
    }
    console.log(`✅ ${testType} test completed successfully.`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ ${testType} test failed:`, err.message);
    process.exit(1);
  }
};

// testSetTimeout("driverBlocker");
