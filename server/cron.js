import dotenv from "dotenv";
dotenv.config();

import { CronJob } from "cron";
import { runMonthlyBackup } from "./jobs/flespiMonthlyBackup.js";

function startBackupCron() {
  const job = new CronJob(
    "0 2 1 * *",
    async () => {
      console.log("🕓 Starting monthly Flespi backup...");

      try {
        await runMonthlyBackup();
        console.log("✅ Backup completed.");

        job.stop();
        console.log("🛑 Backup cron job stopped after run.");
      } catch (err) {
        console.error("❌ Backup failed:", err.message);

        job.stop();
        console.log("🛑 Cron job stopped after failure.");
      }
    },
    null,
    false,
    "America/Lima"
  );

  job.start();
  console.log("✅ Cron job registered (1st of month @ 2:00 AM).");
}

startBackupCron();

// setTimeout(async () => {
//   console.log("🕓 Starting Flespi backup test...");
//   try {
//     await runMonthlyBackup();
//     console.log("✅ Backup completed successfully.");
//     process.exit(0); // exit after done
//   } catch (err) {
//     console.error("❌ Backup failed:", err.message);
//     process.exit(1); // exit with error code
//   }
// }, 2000);
