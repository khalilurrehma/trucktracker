import {
  activatedDoutHandler,
  deviceNewEvent,
  devicesAlarmMQTT,
  driverBehaivor,
  handleDeviceDin,
  handleDeviceLiveLocation,
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
        console.log(alarmData);
        if (alarmData) broadcast(alarmData);
        break;
      case topic.includes("calcs/1742077"): // Default - Reports - Driver Behaivor
        const behaivor = await driverBehaivor(topic, payload);
        if (behaivor) broadcast(behaivor);
        break;
      case topic.startsWith("flespi/state/gw/devices/") &&
        topic.endsWith("/telemetry/position"):
        const liveLocation = await handleDeviceLiveLocation(topic, payload);
        if (liveLocation) broadcast(liveLocation);
        break;
      case topic.startsWith("flespi/state/gw/devices/") &&
        topic.endsWith("/telemetry/din"):
        const din = await handleDeviceDin(topic, payload);
        if (din) broadcast(din);
        break;

      default:
        console.log("No handler for topic:", topic);
    }
  } catch (error) {
    console.error("❌ Error processing MQTT:", error.message);
  }
});

export { setBroadcast };
