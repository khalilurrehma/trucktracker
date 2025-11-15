import React, { useEffect, useState, useCallback } from "react";

export default function AlertsPanel({ mqttMessages = [] }) {
  const [alerts, setAlerts] = useState([]);
  const [visible, setVisible] = useState(true);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") setVisible(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  // ✅ Build alerts safely from MQTT payload
  useEffect(() => {
    if (!mqttMessages?.length) return;

    const newAlerts = mqttMessages.slice(-5).map((msg) => {
      const { flespiDeviceId, value = {} } = msg;
      const {
        efficiency = 0,
        queueTimeAvgMin = 0,
        queueTimeFormatted = "0s",
        timestamp,
      } = value;

      // Convert timestamp safely
      const time = timestamp
        ? new Date(timestamp).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";

      // 🔴 Low efficiency
      if (efficiency < 80) {
        return {
          time,
          text: `Vehicle ${flespiDeviceId}: Low efficiency ${efficiency}%`,
          color: "text-red-600",
        };
      }

      // 🟠 Queue delay
      if (queueTimeAvgMin > 10) {
        return {
          time,
          text: `Loader ${flespiDeviceId}: Delay (${queueTimeFormatted})`,
          color: "text-amber-500",
        };
      }

      // 🟢 Normal status
      return {
        time,
        text: `Device ${flespiDeviceId}: OK (${efficiency}%)`,
        color: "text-gray-700",
      };
    });

    setAlerts(newAlerts.reverse());
  }, [mqttMessages]);

  if (!visible) return null;

  return (
    <div className="absolute top-4 right-4 z-50 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-center text-red-700 font-bold text-sm">ALERTS / EVENTS</h2>
        <button
          onClick={() => setVisible(false)}
          aria-label="Close alerts"
          className="ml-2 rounded p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition"
          title="Hide until refresh"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-gray-500 text-center">No active alerts</div>
        ) : (
          alerts.map((a, idx) => (
            <div key={idx} className={a.color}>
              {a.time} – {a.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
