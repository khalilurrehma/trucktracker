import React, { useEffect, useState } from "react";

export default function AlertsPanel({ mqttMessages = [] }) {
  const [alerts, setAlerts] = useState([]);

  // 🔁 Whenever new MQTT messages arrive
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

  return (
    <div className="absolute top-4 right-4 z-50 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg p-3 w-64">
      <h2 className="text-center text-red-700 font-bold mb-2 text-sm">
        ALERTS / EVENTS
      </h2>

      <div className="text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-gray-500 text-center">No active alerts</div>
        ) : (
          alerts.map((a, idx) => (
            <div key={idx} className={`${a.color}`}>
              {a.time} – {a.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
