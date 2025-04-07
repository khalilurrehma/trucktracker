import { WebSocket } from "ws";
import { subscribeToTopic } from "../mqtt/mqtt.client.js";

export const createWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });
  const clients = new Set();

  wss.on("connection", (ws) => {
    console.log("🖥️ New WebSocket client connected");
    clients.add(ws);

    ws.on("message", (message) => {
      try {
        const { action, topic } = JSON.parse(message);

        if (action === "subscribe") {
          console.log(`📡 Subscribing to new topic: ${topic}`);
          subscribeToTopic(topic);
        } else if (action === "unsubscribe") {
          console.log(`🚫 Unsubscribing from topic: ${topic}`);
          // unsubscribeFromTopic(topic);
        }
      } catch (error) {
        console.error("❌ WebSocket Message Error:", error.message);
      }
    });

    ws.on("close", () => {
      console.log("❌ WebSocket client disconnected");
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("⚠️ WebSocket error:", error);
    });
  });

  const broadcast = (data) => {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  return { broadcast };
};
