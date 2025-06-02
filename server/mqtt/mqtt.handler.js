import { DispatchEmitter } from "../controllers/dispatch.js";
import { cronEmitter } from "../services/cronJobs.js";
import {
  activatedDoutHandler,
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

const setBroadcast = (broadcastFn) => {
  broadcast = broadcastFn;
};

mqttEmitter.on("mqttMessage", async ({ topic, payload }) => {
  try {
    switch (true) {
      case topic.includes("calcs/1742074"): // Default - Reports - Events
        const newEvent = await deviceNewEvent(topic, payload);
        if (newEvent) broadcast(newEvent);
        break;
      case topic.includes("calcs/1742075"): // Default - Operations - Alarms
        const alarmData = await devicesAlarmMQTT(topic, payload);
        if (alarmData) broadcast(alarmData);
        break;
      case topic.includes("calcs/1742077"): // Default - Reports - Driver Behaivor
        const behaivor = await driverBehaivor(topic, payload);
        if (behaivor) broadcast(behaivor);
        break;
      case topic.startsWith("flespi/state/gw/devices/") &&
        topic.endsWith("/telemetry/position"):
        const liveLocation = await handleDeviceLiveLocation(topic, payload);
        await handleInReferenceStage(topic, payload);
        if (liveLocation) broadcast(liveLocation);
        break;
      case topic.startsWith("flespi/state/gw/devices/") &&
        topic.endsWith("/telemetry/din"):
        const din = await handleDeviceDin(topic, payload);
        if (din) broadcast(din);
        break;
      case topic.startsWith("flespi/state/gw/devices/") &&
        topic.endsWith("/connected"):
        const connectionStatus = await handleDeviceConnection(topic, payload);
        if (connectionStatus) broadcast(connectionStatus);
        break;
      case topic.startsWith("flespi/state/gw/devices/") &&
        topic.endsWith("/telemetry/engine.ignition.status"):
        const ignitionStatus = await handleDeviceIgnition(topic, payload);
        if (ignitionStatus) broadcast(ignitionStatus);
        break;
      case topic.includes("calcs/1766118"):
        const geofenceResults = await geofenceEntryAndExit(topic, payload);
        break;
      // case topic.includes("flespi/message/gw/devices"):
      //   console.log("MQTT Message:", payload["position.satellites"]);
      //   break;

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

    broadcast(message);
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
    broadcast(message);
  } catch (error) {
    console.error("❌ Error processing dispatch case event:", error.message);
  }
});

export { setBroadcast };
