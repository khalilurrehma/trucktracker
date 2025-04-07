import { traccar1Db } from "../config/dbConfig.js";
import util from "util";

const dbQuery = util.promisify(traccar1Db.query).bind(traccar1Db);

export async function fetchAllTraccarDevices() {
  const sql = `SELECT * FROM tc_devices`;
  // const sql = `
  //   SELECT
  //     tud.*,
  //     tu.*,
  //     td.*
  //   FROM
  //     tc_user_device tud
  //   JOIN
  //     tc_users tu ON tud.userid = tu.id
  //   JOIN
  //     tc_devices td ON tud.deviceid = td.id;
  // `;

  try {
    const result = await dbQuery(sql);
    return result;
  } catch (error) {
    console.error("Error fetching Traccar devices:", error);
    throw error;
  }
}
