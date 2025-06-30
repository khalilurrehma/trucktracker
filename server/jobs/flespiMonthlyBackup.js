import axios from "axios";
import pool from "../config/dbConfig.js";
import util from "util";
import moment from "moment";
const dbQuery = util.promisify(pool.query).bind(pool);

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
    `SELECT id, flespiId FROM new_settings_devices WHERE flespiId = 6075754`
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

      for (const msg of messages) {
        await dbQuery(
          `
              INSERT INTO device_messages (
                device_id, flespi_id, timestamp,
                latitude, longitude, speed,
                ignition_status, alarm_code, mileage, raw
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
          [
            device.id,
            device.flespiId,
            msg.timestamp,
            msg["position.latitude"] || null,
            msg["position.longitude"] || null,
            msg["position.speed"] || null,
            msg["engine.ignition.status"] || false,
            msg["alarm.code"] || null,
            msg["vehicle.mileage"] || null,
            JSON.stringify(msg),
          ]
        );
      }

      console.log(
        `✅ Device ${device.flespiId} — ${messages.length} messages stored`
      );
    } catch (err) {
      console.error(`❌ Error for device ${device.flespiId}: ${err.message}`);
    }
  }

  console.log("🎉 Monthly backup completed");
}
