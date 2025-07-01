import axios from "axios";
import pool from "../config/dbConfig.js";
import util from "util";
import moment from "moment";
const dbQuery = util.promisify(pool.query).bind(pool);
import { messagesToCsvZipBuffer } from "../utils/excelExport.js";
import { uploadBackupFileToS3 } from "../utils/backupS3upload.js";

const FLESPI_TOKEN = process.env.FlespiToken;

function getLastMonthTimeRange() {
  const from = moment().subtract(1, "month").startOf("month").unix();
  const to = moment().subtract(1, "month").endOf("month").unix();
  const monthYear = moment().subtract(1, "month").format("YYYY-MM");
  return { from, to, monthYear };
}

async function fetchMessages(flespiId, from, to) {
  const fields = [
    "timestamp",
    "position.latitude",
    "position.longitude",
    "position.speed",
    "engine.ignition.status",
    "vehicle.mileage",
    "alarm.code",
  ].join(",");

  const data = {
    from: from,
    to: to,
    count: 10000000,
    fields: fields,
  };

  const encodedData = encodeURIComponent(JSON.stringify(data));

  const url = `https://flespi.io/gw/devices/${flespiId}/messages?data=${encodedData}`;

  const res = await axios.get(url, {
    headers: { Authorization: `FlespiToken ${FLESPI_TOKEN}` },
  });

  return res.data.result || [];
}

export async function runMonthlyBackup() {
  const { from, to, monthYear } = getLastMonthTimeRange();

  const devices = await dbQuery(
    `SELECT id, flespiId, name FROM new_settings_devices WHERE flespiId = ?`
  );

  for (const device of devices) {
    try {
      const messages = await fetchMessages(device.flespiId, from, to);

      await dbQuery(
        `
            INSERT INTO device_monthly_data (device_id, flespi_id, month_year, message_count, data)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE message_count = ?, data = ?
          `,
        [
          device.id,
          device.flespiId,
          monthYear,
          messages.length,
          JSON.stringify(messages),
          messages.length,
          JSON.stringify(messages),
        ]
      );

      await dbQuery(
        `
            DELETE FROM device_monthly_data
            WHERE device_id = ?
              AND month_year NOT IN (
                SELECT month_year FROM (
                  SELECT month_year FROM device_monthly_data
                  WHERE device_id = ?
                  ORDER BY month_year DESC
                  LIMIT 6
                ) AS latest
              )
          `,
        [device.id, device.id]
      );

      if (messages.length > 0) {
        const csvFilename = `device_${device.name}_${monthYear}.csv`;
        const zipFilename = `device_${device.name}_${monthYear}.zip`;

        const zipBuffer = await messagesToCsvZipBuffer(messages, csvFilename);

        const s3Key = zipFilename;
        const fileUrl = await uploadBackupFileToS3(
          zipBuffer,
          process.env.CONTABO_BACKUP_BUCKET_NAME,
          s3Key
        );

        await dbQuery(
          `
      INSERT INTO device_backup_files (device_id, flespi_id, backup_month, file_name, file_url)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), file_url = VALUES(file_url)
    `,
          [device.id, device.flespiId, monthYear, zipFilename, fileUrl]
        );
      }

      console.log(
        `✅ Device ${device.flespiId} — ${messages.length} messages stored & Excel backed up`
      );
    } catch (err) {
      console.error(`❌ Error for device ${device.flespiId}: ${err.message}`);
    }
  }

  console.log("🎉 Monthly backup completed");
}
