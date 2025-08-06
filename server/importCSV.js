// uploadDistricts.js
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";
import pool from "./config/dbConfig.js";
import util from "util";

const dbQuery = util.promisify(pool.query).bind(pool);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE_PATH = path.join(__dirname, "police_station_data.csv");

const insertDistrict = async (data) => {
  const { name, dept_code, province_code, district_code } = data;
  try {
    await dbQuery(
      "INSERT INTO police_station_data (name, dept_code, province_code, district_code) VALUES (?, ?, ?, ?)",
      [name, dept_code, province_code, district_code]
    );
  } catch (err) {
    console.error(`Failed to insert ID ${name}:`, err.message);
  }
};

const run = async () => {
  console.log("Starting CSV import...");

  const rows = [];

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on("data", (row) => {
      rows.push(row);
    })
    .on("end", async () => {
      for (const row of rows) {
        await insertDistrict(row);
      }
      console.log("CSV import completed.");
      process.exit(0);
    })
    .on("error", (err) => {
      console.error("Error reading CSV:", err);
    });
};

run();
