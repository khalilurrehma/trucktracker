import React, { useEffect, useState, useCallback } from "react";

export default function AlertsPanel({ mqttMessages = [] }) {
  const [alerts, setAlerts] = useState([]);
  const [visible, setVisible] = useState(true); // ⬅️ hide until refresh

  // Close on ESC (optional)
  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") setVisible(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  // 🔁 Build alerts from latest MQTT messages
  useEffect(() => {
    if (!mqttMessages.length) return;

    const newAlerts = mqttMessages.slice(-5).map((msg) => {
      const { value, flespiDeviceId } = msg;
      const time = new Date(value.timestamp).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (value.efficiency < 80)
        return {
          time,
          text: `Vehicle ${flespiDeviceId} low efficiency ${value.efficiency}%`,
          color: "text-red-600",
        };

      if (value.queueTimeAvgMin > 10)
        return {
          time,
          text: `Loader ${flespiDeviceId} loading delay (${value.queueTimeFormatted})`,
          color: "text-amber-500",
        };

      return {
        time,
        text: `Device ${flespiDeviceId} OK (${value.efficiency || 0}%)`,
        color: "text-gray-800",
      };
    });

    setAlerts(newAlerts.reverse()); // newest first
  }, [mqttMessages]);

  if (!visible) return null; // ⬅️ hidden after close until refresh

  return (
    <div className="absolute top-4 right-4 z-50 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg p-3 w-64">
      {/* Header + Close */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-center text-red-700 font-bold text-sm">ALERTS / EVENTS</h2>
        <button
          onClick={() => setVisible(false)}
          aria-label="Close alerts"
          className="ml-2 rounded p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition"
          title="Hide until refresh"
        >
          {/* X icon (SVG) */}
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

      {/* Body */}
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
