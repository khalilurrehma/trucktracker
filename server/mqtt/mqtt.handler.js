import { DispatchEmitter } from "../controllers/dispatch.js";
import { cronEmitter } from "../services/cronJobs.js";
import {
  activatedDoutHandler,
  detailedTelemetry,
  deviceNewEvent,
  devicesAlarmMQTT,
  driverBehaivor,
  geofenceEntryAndExit,
  handleDeviceConnection,
  handleDeviceDin,
  handleDeviceIgnition,
  handleDeviceLiveLocation,
  handleInReferenceStage,
  handleGeofenceEvent,
  operationCalculator,
} from "../services/topic.handlers.js";
import { handleTruckLoaderCalcEvent } from "../services/truckLoaderFlow.js";
import { mqttEmitter } from "./mqtt.client.js";
import {
  getAllCalculatorIds,
  getCalculatorIdsByOperationId,
} from "../model/calculatorAssignments.js";

let broadcast;
let broadcastToDriver;
let cachedCalcIds = new Set();
let cachedOpCalcIds = new Set();
let lastCalcIdsRefresh = 0;
const CALC_CACHE_TTL_MS = 60 * 1000;
let lastOpCalcIdsRefresh = 0;
const OP_CALC_CACHE_TTL_MS = 60 * 1000;
const OPERATION_FILTER_ID = process.env.OPERATION_FILTER_ID
  ? Number(process.env.OPERATION_FILTER_ID)
  : null;

const refreshCalcIdsCache = async () => {
  const now = Date.now();
  if (now - lastCalcIdsRefresh < CALC_CACHE_TTL_MS) return;

  const calcIds = await getAllCalculatorIds();
  cachedCalcIds = new Set(calcIds.map((id) => String(id)));
  lastCalcIdsRefresh = now;
};

const refreshOpCalcIdsCache = async () => {
  if (!OPERATION_FILTER_ID) return;
  const now = Date.now();
  if (now - lastOpCalcIdsRefresh < OP_CALC_CACHE_TTL_MS) return;

  const calcIds = await getCalculatorIdsByOperationId(OPERATION_FILTER_ID);
  cachedOpCalcIds = new Set(calcIds.map((id) => String(id)));
  lastOpCalcIdsRefresh = now;
};

const extractCalcIdFromTopic = (topic) => {
  const match = topic.match(/calcs\/(\d+)\//);
  return match ? match[1] : null;
};

const extractDeviceIdFromTopic = (topic) => {
  const match = topic.match(/devices\/(\d+)/);
  return match ? match[1] : null;
};

const extractIntervalEventType = (topic) => {
  const parts = String(topic || "").split("/");
  return parts[parts.length - 1] || null;
};

const buildIntervalLogData = ({ topic, payload, calcId, deviceId }) => {
  const intervalId = payload?.id ?? null;
  const begin = payload?.begin ?? null;
  const end = payload?.end ?? null;
  const duration = payload?.duration ?? null;
  const active = payload?.active ?? null;
  const timestamp = payload?.timestamp ?? null;
  const eventType = extractIntervalEventType(topic);
  const payloadKeys = payload && typeof payload === "object"
    ? Object.keys(payload)
    : [];

  return {
    topic,
    calc_id: calcId ? Number(calcId) : null,
    device_id: deviceId ? Number(deviceId) : null,
    event_type: eventType,
    interval_id: intervalId != null ? Number(intervalId) : null,
    begin,
    end,
    duration,
    active,
    timestamp,
    payload_keys: payloadKeys,
    payload,
  };
};

const setBroadcast = (broadcastFn, broadcastToDriverFn) => {
  broadcast = broadcastFn;
  broadcastToDriver = broadcastToDriverFn;
};

mqttEmitter.on("mqttMessage", async ({ topic, payload }) => {
  try {
    if (topic.includes("flespi/interval/gw/calcs/")) {
      // console.log("CALC INTERVAL EVENT:", topic);
      const calcId = extractCalcIdFromTopic(topic);
      const deviceId = extractDeviceIdFromTopic(topic);
    
      await refreshCalcIdsCache();
      await refreshOpCalcIdsCache();
      if (!calcId || !cachedCalcIds.has(calcId)) {
        return;
      }
      if (OPERATION_FILTER_ID && !cachedOpCalcIds.has(calcId)) {
        return;
      }

      if (topic.endsWith("/activated")) {
        console.log(
          `LOAD_PAD enter: calc_id=${calcId} device_id=${deviceId}`
        );
      } else if (topic.endsWith("/deactivated")) {
        console.log(
          `LOAD_PAD exit: calc_id=${calcId} device_id=${deviceId}`
        );
      }
      try {
        await handleTruckLoaderCalcEvent({
          topic,
          payload,
          calcId,
          deviceId,
        });
      } catch (err) {
        console.error(
          "❌ Truck↔Loader flow error:",
          err.response?.data || err.message
        );
      }
      if (broadcast) {
        broadcast(
          {
            ...payload,
            topic,
            calcId,
            deviceId,
            calculatorInterval: true,
          },
          { to: "admin" }
        );
      }
    }

    switch (true) {
      case topic.includes("gw/geofences"):
        const geofencesData = await handleGeofenceEvent(topic, payload);
        if (geofencesData) broadcast(geofencesData, { to: "admin" });
        break;
      // case topic.includes("calcs/2194137"):
      //   const opData = await operationCalculator(topic, payload);
      //   if (opData) broadcast(opData, { to: "admin" });
      //   break;
      // case topic.includes("calcs/1742074"): // Default - Reports - Events
      //   const newEvent = await deviceNewEvent(topic, payload);
      //   if (newEvent) broadcast(newEvent, { to: "admin" });
      //   break;
      // case topic.includes("calcs/2194137"): // Default - Operations - Alarms
      //   const alarmData = await devicesAlarmMQTT(topic, payload);
      //   if (alarmData) broadcast(alarmData, { to: "admin" });
      //   break;
      // case topic.includes("calcs/1742077"): // Default - Reports - Driver Behaivor
      //   const behaivor = await driverBehaivor(topic, payload);
      //   if (behaivor) broadcast(behaivor, { to: "admin" });
      //   break;
      case topic.startsWith("flespi/state/gw/devices/") &&
        topic.endsWith("/connected"):
        console.log("DEVICE CONNECTED EVENT:", topic, payload);
        const connectionStatus = await handleDeviceConnection(topic, payload);
        if (connectionStatus) broadcast(connectionStatus, { to: "admin" });
        break;

      // case topic.includes("calcs/1766118"):
      //   const geofenceResults = await geofenceEntryAndExit(topic, payload);
      //   break;

      case topic.startsWith("flespi/state/gw/devices/") &&
        topic.includes("/telemetry/"):
        // 1. Live location
        if (topic.endsWith("/telemetry/position")) {
          const liveLocation = await handleDeviceLiveLocation(topic, payload);
          await handleInReferenceStage(topic, payload);
          if (liveLocation) broadcast(liveLocation, { to: "admin" });
        }

        // 2. DIN
        if (topic.endsWith("/telemetry/din")) {
          const din = await handleDeviceDin(topic, payload);
          if (din) broadcast(din, { to: "admin" });
        }

        // 3. Ignition
        if (topic.endsWith("/telemetry/engine.ignition.status")) {
          const ignitionStatus = await handleDeviceIgnition(topic, payload);
          if (ignitionStatus) broadcast(ignitionStatus, { to: "admin" });
        }

        // 4. All telemetry values (including those above)
        const detailed = await detailedTelemetry(topic, payload);
        if (detailed) broadcast(detailed, { to: "admin" });
        break;

      default:
        console.log("No handler for topic:", topic);
    }
  } catch (error) {
    // console.error("❌ Error processing MQTT:", error.message);
  }
});

cronEmitter.on("cronSaved", async (cronData) => {
  try {
    const { loaded } = cronData;
    const message = {
      type: "cronLogs",
      loaded,
    };

    broadcast(message, { to: "admin" });
  } catch (error) {
    console.error("❌ Error processing cron event:", error.message);
  }
});

DispatchEmitter.on("newcase", async (casedata) => {
  try {
    let message = {
      ...casedata,
      dispatchNotification: "newcase-notification",
    };
    broadcast(message, { to: "admin" });
  } catch (error) {
    console.error("❌ Error processing dispatch case event:", error.message);
  }
});

DispatchEmitter.on("subprocessEvent", async (subprocessEvent) => {
  try {
    let message = {
      ...subprocessEvent,
      subprocessEvent: "subprocessEvent-update",
    };
    broadcast(message, { to: "admin" });
  } catch (error) {
    console.error("❌ Error processing dispatch case event:", error.message);
  }
});
DispatchEmitter.on("suggestedServices", async (suggestedServices) => {
  try {
    let message = {
      ...suggestedServices,
      suggestedServices: "suggestedServices-notification",
    };

    broadcast(message, { to: "admin" });
  } catch (error) {
    console.error(
      "❌ Error processing suggestedServices event:",
      error.message
    );
  }
});

DispatchEmitter.on("driverCase", async (driverCase) => {
  try {
    broadcastToDriver(driverCase.driverId, driverCase);
  } catch (error) {
    console.error("❌ Error processing driverCase event:", error.message);
  }
});

DispatchEmitter.on("caseProcessUpdate", async (caseProcessUpdate) => {
  try {
    broadcastToDriver(caseProcessUpdate.driverId, caseProcessUpdate);
  } catch (error) {
    console.error(
      "❌ Error processing caseProcessUpdate event:",
      error.message
    );
  }
});

DispatchEmitter.on("rimacCase", async (caseRport) => {
  try {
    let message = {
      ...caseRport,
      rimacCase: "rimacCase",
    };

    broadcast(message, { to: "admin" });
  } catch (error) {
    console.error("❌ Error processing rimacCase event:", error.message);
  }
});

export { setBroadcast };
