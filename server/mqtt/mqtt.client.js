import mqtt from "mqtt";
import { EventEmitter } from "events";
import { topicsOfSubscribedNotifications } from "../model/notifications.js";

const subscribed_notifications_topics = await topicsOfSubscribedNotifications();

const MQTT_BROKER = process.env.MQTT_BROKER;
const MQTT_PORT = process.env.MQTT_PORT;
const MQTT_TOKEN = process.env.MQTT_TOKEN;

const client = mqtt.connect(MQTT_BROKER, {
  username: MQTT_TOKEN,
  clientId: "my-node-client-" + Math.random().toString(16).substring(2, 8),
});

export const mqttEmitter = new EventEmitter();
const subscribedTopics = new Set();

// MQTT TOPICS:
const topics = [
  ...subscribed_notifications_topics,
  { topic: "flespi/interval/gw/calcs/1740759/devices/+/activated,deactivated" }, // DOUT Status Monitor - not in use rightnow
  {
    topic: "flespi/interval/gw/calcs/1742074/devices/+/created,updated,deleted", // Default - Reports - Events
  },
  {
    topic: "flespi/interval/gw/calcs/2194137/devices/+/created,updated,deleted", // Default - Operations - Alarms
  },
  {
    topic: "flespi/interval/gw/calcs/1742077/devices/+/created,updated,deleted", // Default - Reports - Driver Behaivor
  },
  {
    topic: "flespi/interval/gw/calcs/2194137/devices/+/created,updated,deleted", // Default - Reports - Driver Behaivor
  },
  {
    topic: "flespi/interval/gw/calcs/1766118/devices/+/+", // Default - Geofence
  },
  {
    topic: "flespi/state/gw/devices/+/telemetry/position",
  },
  {
    topic: "flespi/state/gw/devices/+/telemetry/din",
  },
  {
    topic: "flespi/state/gw/devices/+/connected",
  },
  {
    topic: "flespi/state/gw/devices/+/telemetry/engine.ignition.status",
  },
  {
    topic: "flespi/state/gw/devices/+/telemetry/+",
  },
  {
    topic:
      "flespi/log/gw/geofences/+/created,updated,deleted",
  },
];
client.on("connect", () => {
  console.log("✅ Connected to Flespi MQTT broker");

  topics.forEach(({ topic }) => subscribeToTopic(topic));
});

client.on("error", (err) => {
  console.error("❌ MQTT Error:", err);
});

client.on("message", (topic, message) => {
  try {
    const parsedMessage = message ? JSON.parse(message?.toString()) : {};
    mqttEmitter.emit("mqttMessage", { topic, payload: parsedMessage });
  } catch (error) {
    console.error("❌ Failed to parse MQTT message:", error.message);
  }
});

export const subscribeToTopic = (topic) => {
  if (subscribedTopics.has(topic)) return;
  client.subscribe(topic, (err) => {
    if (err) {
      console.error(`❌ Failed to subscribe: ${topic}`, err.message);
    } else {
      console.log(`✅ Subscribed to topic: ${topic}`);
      subscribedTopics.add(topic);
    }
  });
};

export const unsubscribeFromTopic = (topic) => {
  client.unsubscribe(topic, (err) => {
    if (err) {
      console.error(`❌ Failed to unsubscribe from ${topic}:`, err);
    } else {
      console.log(`🚫 Unsubscribed from topic: ${topic}`);
      subscribedTopics.delete(topic);
    }
  });
};

export default client;
