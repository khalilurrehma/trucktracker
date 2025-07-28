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
  mqttDoutAlerts,
} from "../services/topic.handlers.js";
import { mqttEmitter } from "./mqtt.client.js";

let broadcast;
let broadcastToDriver;

const setBroadcast = (broadcastFn, broadcastToDriverFn) => {
  broadcast = broadcastFn;
  broadcastToDriver = broadcastToDriverFn;
};

mqttEmitter.on("mqttMessage", async ({ topic, payload }) => {
  try {
    switch (true) {
      case topic.includes("calcs/1742074"): // Default - Reports - Events
        const newEvent = await deviceNewEvent(topic, payload);
        if (newEvent) broadcast(newEvent, { to: "admin" });
        break;
      case topic.includes("calcs/1742075"): // Default - Operations - Alarms
        const alarmData = await devicesAlarmMQTT(topic, payload);
        if (alarmData) broadcast(alarmData, { to: "admin" });
        break;
      case topic.includes("calcs/1742077"): // Default - Reports - Driver Behaivor
        const behaivor = await driverBehaivor(topic, payload);
        if (behaivor) broadcast(behaivor, { to: "admin" });
        break;
      case topic.startsWith("flespi/state/gw/devices/") &&
        topic.endsWith("/connected"):
        const connectionStatus = await handleDeviceConnection(topic, payload);
        if (connectionStatus) broadcast(connectionStatus, { to: "admin" });
        break;

      case topic.includes("calcs/1766118"):
        const geofenceResults = await geofenceEntryAndExit(topic, payload);
        break;

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
