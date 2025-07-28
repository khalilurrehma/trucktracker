import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { selectTelemetryByDeviceId } from "../../store/telemetrySlice";

export const useTelemetryData = () => {
  const { id } = useParams();
  const deviceId = parseInt(id);

  const flattenObject = (obj, prefix = "") =>
    Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + "." : "";
      if (
        typeof obj[k] === "object" &&
        obj[k] !== null &&
        !Array.isArray(obj[k])
      ) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});

  const telemetry = useSelector((state) => {
    return selectTelemetryByDeviceId(state, deviceId);
  });

  const [activeFields, setActiveFields] = useState([]);
  const previousTelemetryRef = useRef({});

  useEffect(() => {
    const prevFlat = flattenObject(previousTelemetryRef.current || {});
    const newFlat = flattenObject(telemetry || {});
    const changedKeys = [];

    for (const key in newFlat) {
      if (newFlat[key] !== prevFlat[key]) {
        changedKeys.push(key);
      }
    }

    if (changedKeys.length > 0) {
      setActiveFields(changedKeys);
    }

    previousTelemetryRef.current = telemetry;
  }, [telemetry]);

  const isOnline = telemetry?.["server.timestamp"] ? true : false;

  const data = {
    server: {
      timestamp: telemetry?.["server.timestamp"] || Date.now() / 1000,
    },
    device: {
      name: telemetry?.["device.name"] || "Unknown",
      id: telemetry?.["device.id"] || deviceId,
    },
    peer: telemetry?.["peer"] || "N/A",
    ident: telemetry?.["ident"] || "N/A",
    position: {
      latitude: telemetry?.["position.latitude"] || 0,
      longitude: telemetry?.["position.longitude"] || 0,
      speed: telemetry?.["position.speed"] || 0,
      direction: telemetry?.["position.direction"] || 0,
      altitude: telemetry?.["position.altitude"] || 0,
      satellites: telemetry?.["position.satellites"] || 0,
    },
    custom: {
      VBAT: telemetry?.["custom.VBAT"] || 0,
      VPWR: telemetry?.["custom.VPWR"] || 0,
      AIN1: telemetry?.["custom.AIN1"] || 0,
    },
  };

  return { data, activeFields, isOnline };
};
