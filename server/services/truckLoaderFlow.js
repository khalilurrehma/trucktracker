import axios from "axios";
import pool from "../config/dbConfig.js";
import util from "util";

const dbQuery = util.promisify(pool.query).bind(pool);
const FlespiToken = process.env.FlespiToken;
const FLESPI_URL = "https://flespi.io/gw";

const LOADER_STATE_TTL_MS = 30 * 60 * 1000;
const idempotencyCache = new Map();
const activeLoadersByScope = new Map();

const isNum = (value) => typeof value === "number" && Number.isFinite(value);

const toNumberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const nowUnix = () => Math.floor(Date.now() / 1000);

const buildTimestampKey = (timestamp, intervalId, isEntry) => {
  const base = isNum(timestamp) ? timestamp : nowUnix();
  const safeIntervalId = Number(intervalId);
  const tail = Number.isFinite(safeIntervalId) ? safeIntervalId % 800000 : 0;
  const offset = isEntry ? 0.1 : 0.2;
  return Number((base + offset + tail / 1e6).toFixed(6));
};

const extractSourceGeofenceId = (payload) => {
  const candidates = [
    payload?.load_pad_geofence_id,
    payload?.geofence?.id,
    payload?.geofence_flespi_id,
    payload?.geofence_id,
    payload?.["geofence.id"],
    payload?.zone_geofence_id,
  ];

  for (const candidate of candidates) {
    const parsed = toNumberOrNull(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const getScopeCalcAssignment = async (calcId, deviceId, geofenceId = null) => {
  const rows = await dbQuery(
    `
      SELECT calc_id, calc_type, operation_id, zone_id, geofence_flespi_id
      FROM calculator_assignments
      WHERE calc_id = ?
        AND (device_flespi_id = ? OR device_flespi_id IS NULL)
        AND (
          ? IS NULL
          OR geofence_flespi_id = ?
          OR geofence_flespi_id IS NULL
        )
      ORDER BY
        CASE
          WHEN ? IS NOT NULL AND geofence_flespi_id = ? THEN 0
          WHEN geofence_flespi_id IS NULL THEN 1
          ELSE 2
        END,
        device_flespi_id IS NULL ASC
      LIMIT 1
    `,
    [calcId, deviceId, geofenceId, geofenceId, geofenceId, geofenceId]
  );
  return rows?.[0] || null;
};

const getLoaderCalcsForZone = async (
  operationId,
  zoneId,
  activeLoaderIds = null,
  geofenceId = null
) => {
  if (!operationId || !zoneId) return [];

  const rows = await dbQuery(
    `
      SELECT calc_id, device_flespi_id
      FROM calculator_assignments
      WHERE calc_type = 'CALC_LOADERS_PAD'
        AND operation_id = ?
        AND zone_id = ?
        AND (
          ? IS NULL
          OR geofence_flespi_id = ?
          OR geofence_flespi_id IS NULL
        )
        AND device_flespi_id IS NOT NULL
    `,
    [operationId, zoneId, geofenceId, geofenceId]
  );

  if (!activeLoaderIds || activeLoaderIds.size === 0) {
    return rows;
  }

  return rows.filter((row) => activeLoaderIds.has(Number(row.device_flespi_id)));
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
  let fillFactor = toNumberOrNull(metadata?.vehicle_fill_factor_ideal) ?? 0;
  if (fillFactor > 1) {
    fillFactor = fillFactor / 100;
  }
  return { capacity, fillFactor };
};

const getScopeKey = (operationId, zoneId) =>
  `${Number(operationId) || 0}:${Number(zoneId) || 0}`;

const getGeofenceScopeKey = (operationId, zoneId, geofenceId = null) =>
  `${getScopeKey(operationId, zoneId)}:${Number(geofenceId) || 0}`;

const purgeExpiredLoaders = () => {
  const now = Date.now();
  for (const [scopeKey, loadersMap] of activeLoadersByScope.entries()) {
    for (const [loaderDeviceId, ts] of loadersMap.entries()) {
      if (now - ts > LOADER_STATE_TTL_MS) {
        loadersMap.delete(loaderDeviceId);
      }
    }
    if (loadersMap.size === 0) {
      activeLoadersByScope.delete(scopeKey);
    }
  }
};

const updateLoaderPresence = ({
  operationId,
  zoneId,
  geofenceId,
  loaderDeviceId,
  isActive,
}) => {
  const scopeKey = getGeofenceScopeKey(operationId, zoneId, geofenceId);
  const numericLoaderId = Number(loaderDeviceId);
  if (!Number.isFinite(numericLoaderId)) return;

  let loadersMap = activeLoadersByScope.get(scopeKey);
  if (!loadersMap) {
    loadersMap = new Map();
    activeLoadersByScope.set(scopeKey, loadersMap);
  }

  if (isActive) {
    loadersMap.set(numericLoaderId, Date.now());
  } else {
    loadersMap.delete(numericLoaderId);
  }

  if (loadersMap.size === 0) {
    activeLoadersByScope.delete(scopeKey);
  }
};

const getActiveLoadersForScope = (operationId, zoneId, geofenceId = null) => {
  purgeExpiredLoaders();
  const scopeKey = getGeofenceScopeKey(operationId, zoneId, geofenceId);
  const loadersMap = activeLoadersByScope.get(scopeKey);
  if (!loadersMap) return new Set();
  return new Set(Array.from(loadersMap.keys()));
};

const isDuplicateEvent = ({ calcId, deviceId, intervalId, eventType }) => {
  if (!Number.isFinite(Number(intervalId))) return false;

  const key = `${calcId}:${deviceId}:${intervalId}:${eventType}`;
  const now = Date.now();
  const existing = idempotencyCache.get(key);
  if (existing && now - existing < LOADER_STATE_TTL_MS) {
    return true;
  }
  idempotencyCache.set(key, now);

  if (idempotencyCache.size > 50000) {
    for (const [k, ts] of idempotencyCache.entries()) {
      if (now - ts > LOADER_STATE_TTL_MS) {
        idempotencyCache.delete(k);
      }
    }
  }

  return false;
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

  const eventType = isActivated ? "activated" : "deactivated";
  const intervalId = Number(payload?.id);
  const sourceGeofenceId = extractSourceGeofenceId(payload);
  if (isDuplicateEvent({ calcId, deviceId, intervalId, eventType })) {
    return;
  }

  const calcAssignment = await getScopeCalcAssignment(
    Number(calcId),
    Number(deviceId),
    sourceGeofenceId
  );
  if (!calcAssignment) {
    console.log(
      `Truck/Loader skip: no assignment for calc_id=${calcId} device_id=${deviceId}`
    );
    return;
  }

  const calcType = String(calcAssignment.calc_type || "").toUpperCase();
  const operationId = Number(calcAssignment.operation_id);
  const zoneId = Number(calcAssignment.zone_id);
  const scopedGeofenceId =
    sourceGeofenceId ?? calcAssignment.geofence_flespi_id ?? null;

  if (!Number.isFinite(Number(sourceGeofenceId))) {
    console.warn(
      `Truck/Loader payload missing geofence field (prefer load_pad_geofence_id or geofence.id). Fallback scope: operation_id=${operationId} zone_id=${zoneId} geofence_id=${scopedGeofenceId ?? "n/a"}`
    );
  }

  if (calcType === "CALC_LOADERS_PAD") {
    updateLoaderPresence({
      operationId,
      zoneId,
      geofenceId: scopedGeofenceId,
      loaderDeviceId: Number(deviceId),
      isActive: isActivated,
    });
    console.log(
      `Loader presence ${eventType}: operation_id=${operationId} zone_id=${zoneId} geofence_id=${scopedGeofenceId ?? "n/a"} loader_device_id=${deviceId}`
    );
    return;
  }

  if (calcType !== "CALC_LOAD_PAD") {
    return;
  }

  const activeLoaders = getActiveLoadersForScope(operationId, zoneId, scopedGeofenceId);
  const loaders = await getLoaderCalcsForZone(
    operationId,
    zoneId,
    activeLoaders,
    scopedGeofenceId
  );
  if (!loaders.length) {
    console.log(
      `Truck/Loader skip: no active loaders for operation_id=${operationId} zone_id=${zoneId} geofence_id=${scopedGeofenceId ?? "n/a"}`
    );
    return;
  }

  const truckDeviceId = Number(deviceId);
  let capacity = toNumberOrNull(payload?.truck_capacity_m3);
  let fillFactor = toNumberOrNull(payload?.truck_fill_factor_ideal);

  if (!Number.isFinite(capacity) || !Number.isFinite(fillFactor)) {
    const truckDevice = await fetchDeviceMetadata(truckDeviceId);
    const metadata = normalizeTruckMetadata(truckDevice?.metadata);
    capacity = Number.isFinite(capacity) ? capacity : metadata.capacity;
    fillFactor = Number.isFinite(fillFactor) ? fillFactor : metadata.fillFactor;
  }

  if (fillFactor > 1) {
    fillFactor = fillFactor / 100;
  }

  const eventTimestamp = isActivated
    ? toNumberOrNull(payload?.begin) ?? toNumberOrNull(payload?.timestamp) ?? nowUnix()
    : toNumberOrNull(payload?.end) ?? toNumberOrNull(payload?.timestamp) ?? nowUnix();

  for (const loader of loaders) {
    const loaderCalcId = loader.calc_id;
    const loaderDeviceId = Number(loader.device_flespi_id);
    if (!loaderCalcId || !loaderDeviceId) continue;

    const lastInterval = await fetchLastInterval(loaderCalcId, loaderDeviceId);
    if (!lastInterval || !lastInterval.active) {
      console.log(
        `Truck/Loader gate: loader inactive calc_id=${loaderCalcId} device_id=${loaderDeviceId}`
      );
      continue;
    }

    if (isActivated) {
      await postLoaderMessage(loaderDeviceId, {
        timestamp: eventTimestamp,
        "timestamp.key": buildTimestampKey(eventTimestamp, intervalId, true),
        truck_device_id: truckDeviceId,
        truck_capacity_m3: Number.isFinite(capacity) ? capacity : 0,
        truck_fill_factor_ideal: Number.isFinite(fillFactor) ? fillFactor : 0,
        truck_present: true,
        enriched: true,
      });

      console.log(
        `Truck/Loader inject: loader_device_id=${loaderDeviceId} truck_device_id=${truckDeviceId}`
      );
    } else {
      await postLoaderMessage(loaderDeviceId, {
        timestamp: eventTimestamp,
        "timestamp.key": buildTimestampKey(eventTimestamp, intervalId, false),
        truck_device_id: 0,
        truck_capacity_m3: 0,
        truck_fill_factor_ideal: 0,
        truck_present: false,
        enriched: false,
      });

      console.log(`Truck/Loader reset: loader_device_id=${loaderDeviceId}`);
    }
  }
};
