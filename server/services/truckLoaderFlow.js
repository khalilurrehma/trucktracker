import axios from "axios";
import pool from "../config/dbConfig.js";
import util from "util";

const dbQuery = util.promisify(pool.query).bind(pool);
const FlespiToken = process.env.FlespiToken;
const FLESPI_URL = "https://flespi.io/gw";

const isNum = (value) => typeof value === "number" && Number.isFinite(value);

const toNumberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const nowUnix = () => Math.floor(Date.now() / 1000);

const buildTimestampKey = (timestamp) => {
  const base = isNum(timestamp) ? timestamp : nowUnix();
  const suffix = Math.floor(Math.random() * 1_000_000);
  return `${base}.${suffix}`;
};

const getCalcAssignmentById = async (calcId) => {
  const rows = await dbQuery(
    `
      SELECT calc_id, calc_type, operation_id, zone_id, geofence_flespi_id
      FROM calculator_assignments
      WHERE calc_id = ?
      LIMIT 1
    `,
    [calcId]
  );
  return rows?.[0] || null;
};

const getLoaderCalcsForZone = async (operationId, zoneId) => {
  if (!operationId || !zoneId) return [];
  return dbQuery(
    `
      SELECT calc_id, device_flespi_id
      FROM calculator_assignments
      WHERE calc_type = 'CALC_LOADERS_PAD'
        AND operation_id = ?
        AND zone_id = ?
        AND device_flespi_id IS NOT NULL
    `,
    [operationId, zoneId]
  );
};

const fetchDeviceMetadata = async (deviceId) => {
  const url = `${FLESPI_URL}/devices/${encodeURIComponent(deviceId)}?fields=id,metadata`;
  const { data } = await axios.get(url, {
    headers: {
      Authorization: `FlespiToken ${FlespiToken}`,
    },
  });
  return data?.result || data;
};

const fetchLastInterval = async (calcId, deviceId) => {
  const fields = "active,geofence_name,begin,end";
  const url = `${FLESPI_URL}/calcs/${encodeURIComponent(
    calcId
  )}/devices/${encodeURIComponent(
    deviceId
  )}/intervals/last?data=${encodeURIComponent(
    JSON.stringify({ reverse: true, count: 1, fields })
  )}`;
  const { data } = await axios.get(url, {
    headers: {
      Authorization: `FlespiToken ${FlespiToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return data?.result?.[0] || null;
};

const postLoaderMessage = async (loaderDeviceId, message) => {
  const url = `${FLESPI_URL}/devices/${encodeURIComponent(
    loaderDeviceId
  )}/messages`;
  const { data } = await axios.post(url, [message], {
    headers: {
      Authorization: `FlespiToken ${FlespiToken}`,
      "Content-Type": "application/json",
    },
  });
  return data;
};

const normalizeTruckMetadata = (metadata) => {
  const capacity = toNumberOrNull(metadata?.vehicle_capacity_m3) ?? 0;
  const fillFactor = toNumberOrNull(metadata?.vehicle_fill_factor_ideal) ?? 0;
  return { capacity, fillFactor };
};

export const handleTruckLoaderCalcEvent = async ({
  topic,
  payload,
  calcId,
  deviceId,
}) => {
  if (!topic || !calcId || !deviceId) return;

  const isActivated = topic.endsWith("/activated");
  const isDeactivated = topic.endsWith("/deactivated");
  if (!isActivated && !isDeactivated) return;

  console.log(
    `Truck↔Loader flow event: calc_id=${calcId} device_id=${deviceId} event=${isActivated ? "activated" : "deactivated"}`
  );

  const calcAssignment = await getCalcAssignmentById(Number(calcId));
  if (!calcAssignment || calcAssignment.calc_type !== "CALC_LOAD_PAD") {
    console.log(
      `Truck↔Loader skip: calc_id=${calcId} type=${calcAssignment?.calc_type || "unknown"}`
    );
    return;
  }

  console.log(
    `Truck↔Loader resolved: operation_id=${calcAssignment.operation_id} zone_id=${calcAssignment.zone_id}`
  );

  const loaders = await getLoaderCalcsForZone(
    calcAssignment.operation_id,
    calcAssignment.zone_id
  );
  if (!loaders.length) {
    console.log(
      `Truck↔Loader skip: no loaders for operation_id=${calcAssignment.operation_id} zone_id=${calcAssignment.zone_id}`
    );
    return;
  }

  const truckDeviceId = Number(deviceId);
  const truckDevice = await fetchDeviceMetadata(truckDeviceId);
  const { capacity, fillFactor } = normalizeTruckMetadata(truckDevice?.metadata);

  const eventTimestamp = isActivated
    ? toNumberOrNull(payload?.begin) ?? toNumberOrNull(payload?.timestamp) ?? nowUnix()
    : toNumberOrNull(payload?.end) ?? toNumberOrNull(payload?.timestamp) ?? nowUnix();

  for (const loader of loaders) {
    const loaderCalcId = loader.calc_id;
    const loaderDeviceId = loader.device_flespi_id;
    if (!loaderCalcId || !loaderDeviceId) continue;

    const lastInterval = await fetchLastInterval(loaderCalcId, loaderDeviceId);
    if (!lastInterval || !lastInterval.active) {
      console.log(
        `Truck↔Loader gate: loader inactive calc_id=${loaderCalcId} device_id=${loaderDeviceId}`
      );
      continue;
    }

    if (isActivated) {
      await postLoaderMessage(loaderDeviceId, {
        timestamp: eventTimestamp,
        "timestamp.key": buildTimestampKey(eventTimestamp),
        truck_device_id: truckDeviceId,
        truck_capacity_m3: capacity,
        truck_fill_factor_ideal: fillFactor,
        truck_present: true,
        enriched: true,
      });
      console.log(
        `Truck↔Loader inject: loader_device_id=${loaderDeviceId} truck_device_id=${truckDeviceId} capacity=${capacity} fill_factor=${fillFactor}`
      );
    } else {
      await postLoaderMessage(loaderDeviceId, {
        timestamp: eventTimestamp,
        "timestamp.key": buildTimestampKey(eventTimestamp),
        truck_device_id: 0,
        truck_capacity_m3: 0,
        truck_fill_factor_ideal: 0,
        truck_present: false,
        enriched: false,
      });
      console.log(`Truck↔Loader reset: loader_device_id=${loaderDeviceId}`);
    }
  }
};
