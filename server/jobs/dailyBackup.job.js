import axios from "axios";
import pool from "../config/dbConfig.js";
import util from "util";
import moment from "moment";
import { messagesToCsvZipBuffer } from "../utils/excelExport.js";
import {
  uploadBackupFileToS3,
  deleteBackupFileFromS3,
} from "../utils/backupS3upload.js";

const dbQuery = util.promisify(pool.query).bind(pool);
const FLESPI_TOKEN = process.env.FlespiToken;

function getYesterdayTimeRange() {
  const from = moment().subtract(1, "day").startOf("day").unix();
  const to = moment().subtract(1, "day").endOf("day").unix();
  const dayStr = moment().subtract(1, "day").format("YYYY-MM-DD");
  return { from, to, dayStr };
}

async function fetchMessages(flespiId, from, to) {
  const data = { from, to };
  const encodedData = encodeURIComponent(JSON.stringify(data));
  const url = `https://flespi.io/gw/devices/${flespiId}/messages?data=${encodedData}`;

  const res = await axios.get(url, {
    headers: { Authorization: `FlespiToken ${FLESPI_TOKEN}` },
    timeout: 60000,
  });
  return res.data.result || [];
}

export async function runDailyBackup() {
  const { from, to, dayStr } = getYesterdayTimeRange();

  const devices = await dbQuery(
    `SELECT id, flespiId, name, userId FROM new_settings_devices`
  );
  if (!devices.length) {
    console.warn("No devices found for backup.");
    return;
  }

  const userIds = [...new Set(devices.map((d) => d.userId))];
  const retentionRows = await dbQuery(
    `SELECT traccarId, retention_days FROM settings_users WHERE traccarId IN (${userIds
      .map(() => "?")
      .join(",")})`,
    userIds
  );
  const retentionMap = {};
  for (const row of retentionRows) {
    retentionMap[row.traccarId] = row.retention_days || 180;
  }

  for (const device of devices) {
    try {
      const retentionDays = retentionMap[device.userId] || 180;
      const messages = await fetchMessages(device.flespiId, from, to);

      if (messages.length > 0) {
        const csvFilename = `device_${device.name}_${dayStr}.csv`;
        const zipFilename = `device_${device.name}_${dayStr}.zip`;
        const zipBuffer = await messagesToCsvZipBuffer(messages, csvFilename);

        const s3Key = `${device.flespiId}/${zipFilename}`;
        const fileUrl = await uploadBackupFileToS3(
          zipBuffer,
          process.env.CONTABO_BACKUP_BUCKET_NAME,
          s3Key
        );

        await dbQuery(
          `INSERT INTO device_daily_data (device_id, flespi_id, backup_date, message_count, data)
              VALUES (?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE message_count = VALUES(message_count), data = VALUES(data)`,
          [
            device.id,
            device.flespiId,
            dayStr,
            messages.length,
            JSON.stringify(messages),
          ]
        );

        await dbQuery(
          `INSERT INTO device_backup_files (device_id, flespi_id, backup_date, file_name, file_url, s3_key)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), file_url = VALUES(file_url), s3_key = VALUES(s3_key)`,
          [device.id, device.flespiId, dayStr, zipFilename, fileUrl, s3Key]
        );

        const oldBackups = await dbQuery(
          `SELECT id, backup_date, s3_key FROM device_backup_files WHERE device_id = ? ORDER BY backup_date DESC`,
          [device.id]
        );

        if (oldBackups.length > retentionDays) {
          const toDelete = oldBackups.slice(retentionDays);
          for (const backup of toDelete) {
            if (backup.s3_key) await deleteBackupFileFromS3(backup.s3_key);
            await dbQuery(`DELETE FROM device_backup_files WHERE id = ?`, [
              backup.id,
            ]);
          }
        }
        console.log(
          `✅ Device ${device.flespiId} — ${messages.length} messages, backup for ${dayStr}`
        );
      } else {
        console.log(
          `ℹ️  Device ${device.flespiId}: No messages for ${dayStr}, no backup needed.`
        );
      }
    } catch (err) {
      console.error(`❌ Error for device ${device.flespiId}:`, err.message);
    }
  }
  console.log("🎉 Daily backup process completed.");
}
