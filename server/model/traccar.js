import pool, { traccar1Db } from "../config/dbConfig.js";
import util from "util";

const qApp = util.promisify(pool.query).bind(pool); // App DB
const qTraccar = util.promisify(traccar1Db.query).bind(traccar1Db); // Traccar DB

export async function fetchAllTraccarDevices() {
  // 1. Get devices from Traccar
  const sql = `SELECT * FROM tc_devices`;
  const traccarRows = await qTraccar(sql);

  if (!traccarRows.length) return [];

  // 2. Collect ids
  const traccarIds = traccarRows.map((d) => d.id);

  // 3. Get driver info from app DB by traccarId
  const appSql = `
    SELECT 
      d.traccarId,
      dr.id   AS driver_id,
      dr.name AS driver_name
    FROM new_settings_devices d
    LEFT JOIN vehicle_driver_association vda ON d.id = vda.device_id
    LEFT JOIN drivers dr ON vda.driver_id = dr.id
    WHERE d.traccarId IN (?)
  `;
  const appRows = await qApp(appSql, [traccarIds]);

  // 4. Map traccarId → driver
  const driverMap = {};
  appRows.forEach((r) => {
    driverMap[r.traccarId] = {
      driver_id: r.driver_id,
      driver_name: r.driver_name,
    };
  });

  // 5. Merge driver info into Traccar rows
  const merged = traccarRows.map((t) => ({
    ...t,
    driver_id: driverMap[t.id]?.driver_id || null,
    driver_name: driverMap[t.id]?.driver_name || null,
  }));

  return merged;
}
