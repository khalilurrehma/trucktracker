import dotenv from "dotenv";
dotenv.config();
import { CronJob } from "cron";
import { runDailyBackup } from "./jobs/dailyBackup.job.js";

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

startBackupCron();

// For test runs only! (Remove/comment for production.)
// setTimeout(async () => {
//   console.log("🕓 Starting Flespi backup test...");
//   try {
//     await runDailyBackup();
//     console.log("✅ Backup completed successfully.");
//     process.exit(0);
//   } catch (err) {
//     console.error("❌ Backup failed:", err.message);
//     process.exit(1);
//   }
// }, 2000);
