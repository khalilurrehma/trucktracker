import { WebSocket } from "ws";

export const createWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

  const clients = new Set();
  const driverClients = new Map();

  wss.on("connection", (ws) => {
    console.log("🖥️ New WebSocket client connected");
    clients.add(ws);

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        const { action, driverId, clientType } = data;

        if (action === "identify-driver" && driverId) {
          ws.clientType = clientType || "mobile";
          ws.driverId = driverId;
          ws.isDriver = true;
          driverClients.set(driverId.toString(), ws);
          console.log(`🚗 Driver registered: ${driverId} via ${ws.clientType}`);
        } else if (action === "identify-client" && clientType) {
          ws.clientType = clientType; // e.g., "react", "mobile", "admin"
          console.log(`💻 Client identified as: ${clientType}`);
        }
      } catch (error) {
        console.error("❌ WebSocket Message Error:", error.message);
      }
    });

    ws.on("close", () => {
      console.log("❌ WebSocket client disconnected");
      clients.delete(ws);

      if (ws.isDriver && ws.driverId && driverClients.has(ws.driverId)) {
        driverClients.delete(ws.driverId);
        console.log(`🗑️ Driver ${ws.driverId} removed`);
      }
    });

    ws.on("error", (error) => {
      console.error("⚠️ WebSocket error:", error);
    });
  });

  const broadcast = (data, options = {}) => {
    const { to = null, exclude = [] } = options;

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (to && client.clientType !== to) return;
        if (exclude.includes(client.clientType)) return;
        client.send(JSON.stringify(data));
      }
    });
  };

  const broadcastToDriver = (driverId, data) => {
    const driverSocket = driverClients.get(driverId.toString());

    if (driverSocket && driverSocket.readyState === WebSocket.OPEN) {
      driverSocket.send(JSON.stringify(data));
      console.log(`📤 Sent message to driver ${driverId}`);
    } else {
      console.warn(`⚠️ Driver ${driverId} not connected`);
    }
  };

  return {
    broadcast,
    broadcastToDriver,
  };
};
