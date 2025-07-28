import React from "react";
import TelemetryDataCard from "./TelemetryDataCard";

const TelemetryDataGrid = ({ data, activeFields = [] }) => {
  const renderValue = (value) => {
    if (typeof value === "number") {
      return value.toString();
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    return JSON.stringify(value);
  };

  const getUnit = (key) => {
    const unitMap = {
      "position.speed": "km/h",
      "position.altitude": "m",
      "position.direction": "°",
      "position.latitude": "°",
      "position.longitude": "°",
      "custom.VBAT": "V",
      "custom.VPWR": "V",
      "custom.AIN1": "V",
      "position.satellites": "sats",
      "device.id": "",
      "server.timestamp": "s",
      peer: "",
      ident: "",
      "device.name": "",
    };
    return unitMap[key];
  };

  const shouldShowSignal = (key) => {
    return (
      key.includes("position") ||
      key.includes("satellites") ||
      key.includes("signal")
    );
  };

  const getSignalStrength = (key, value) => {
    if (key === "position.satellites") {
      const sats = Number(value);
      if (sats >= 8) return "strong";
      if (sats >= 4) return "medium";
      return "weak";
    }
    if (key.includes("VBAT") || key.includes("VPWR")) {
      const voltage = Number(value);
      if (voltage > 12) return "strong";
      if (voltage > 3) return "medium";
      return "weak";
    }
    return "medium";
  };

  const flattenData = (obj, prefix = "") => {
    const result = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result.push(...flattenData(value, fullKey));
      } else {
        result.push([fullKey, value]);
      }
    }

    return result;
  };

  const flattenedData = flattenData(data);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {flattenedData.map(([key, value]) => (
        <TelemetryDataCard
          key={key}
          title={key}
          value={renderValue(value)}
          unit={getUnit(key)}
          isActive={activeFields.includes(key)}
          showSignal={shouldShowSignal(key)}
          signalStrength={getSignalStrength(key, value)}
        />
      ))}
    </div>
  );
};

export default TelemetryDataGrid;
