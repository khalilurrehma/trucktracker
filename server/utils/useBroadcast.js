import { getBroadcast } from "../mqtt/mqtt.handler.js";

export const useBroadcast = () => {
  const broadcast = getBroadcast();
  if (!broadcast) {
    throw new Error("WebSocket broadcast not initialized yet!");
  }
  return broadcast;
};
