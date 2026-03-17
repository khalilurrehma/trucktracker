import mqtt from "mqtt";
import { EventEmitter } from "events";
import { topicsOfSubscribedNotifications } from "../model/notifications.js";

const subscribed_notifications_topics = await topicsOfSubscribedNotifications();

const rawBroker = String(process.env.MQTT_URL || process.env.MQTT_BROKER || "mqtts://mqtt.flespi.io:8883").trim();
const MQTT_BROKER = rawBroker || "mqtts://mqtt.flespi.io:8883";
const rawUsername = String(
  process.env.MQTT_USERNAME || process.env.MQTT_TOKEN || process.env.FlespiToken || ""
).trim();
const MQTT_USERNAME = rawUsername.startsWith("FlespiToken ")
  ? rawUsername.slice("FlespiToken ".length)
  : rawUsername;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || "";
const MQTT_CLIENT_ID =
  process.env.MQTT_CLIENT_ID ||
  `loadiq-truck-loader-${process.env.NODE_ENV || "dev"}`;

const client = mqtt.connect(MQTT_BROKER, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clientId: MQTT_CLIENT_ID,
  clean: false,
  reconnectPeriod: 2000,
  connectTimeout: 15000,
  keepalive: 60,
  resubscribe: true,
  queueQoSZero: false,
});

export const mqttEmitter = new EventEmitter();
const subscribedTopics = new Set();

const topics = [
  ...subscribed_notifications_topics,
  { topic: "flespi/interval/gw/calcs/+/devices/+/activated" },
  { topic: "flespi/interval/gw/calcs/+/devices/+/deactivated" },
  { topic: "flespi/interval/gw/calcs/+/devices/+/created,updated,deleted" },
  { topic: "flespi/state/gw/devices/+/telemetry/position" },
  { topic: "flespi/state/gw/devices/+/telemetry/din" },
  { topic: "flespi/state/gw/devices/+/connected" },
  { topic: "flespi/state/gw/devices/+/telemetry/engine.ignition.status" },
  { topic: "flespi/state/gw/devices/+/telemetry/+" },
  { topic: "flespi/log/gw/geofences/+/created,updated,deleted" },
];

client.on("connect", () => {
  console.log("Connected to Flespi MQTT broker");
  topics.forEach(({ topic }) => subscribeToTopic(topic));
});

client.on("reconnect", () => {
  console.log("Reconnecting to Flespi MQTT broker...");
});

client.on("offline", () => {
  console.log("MQTT client offline");
});

client.on("error", (err) => {
  console.error("MQTT error:", err.message);
});

client.on("message", (topic, message) => {
  try {
    const parsedMessage = message ? JSON.parse(message.toString()) : {};
    mqttEmitter.emit("mqttMessage", { topic, payload: parsedMessage });
  } catch (error) {
    console.error("Failed to parse MQTT message:", error.message, "topic:", topic);
  }
});

export const subscribeToTopic = (topic) => {
  if (subscribedTopics.has(topic)) return;

  client.subscribe(topic, { qos: 1 }, (err) => {
    if (err) {
      console.error(`Failed to subscribe: ${topic}`, err.message);
    } else {
      console.log(`Subscribed to topic: ${topic}`);
      subscribedTopics.add(topic);
    }
  });
};

export const unsubscribeFromTopic = (topic) => {
  client.unsubscribe(topic, (err) => {
    if (err) {
      console.error(`Failed to unsubscribe from ${topic}:`, err.message);
    } else {
      console.log(`Unsubscribed from topic: ${topic}`);
      subscribedTopics.delete(topic);
    }
  });
};

export default client;
