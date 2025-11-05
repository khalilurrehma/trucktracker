import React, { useEffect, useMemo, useRef, useState } from "react";
import OperationForm from "./components/OperationForm";
import ZoneForm from "./components/ZoneForm";
import OperationList from "./components/OperationList";
import ZoneList from "./components/ZoneList";
import AlertsPanel from "./components/AlertsPanel";
import MapCanvas from "./components/MapCanvas";
import { useOperations } from "../hooks/useOperations";
import { useZones } from "../hooks/useZones";
import { useDevices } from "../hooks/useDevices";
import { useDrawing } from "../hooks/useDrawing";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { useAppContext } from "../AppContext";   // ✅ added import

export default function OperationZoneManager() {
  const navigate = useNavigate();
  const { mqttDeviceLiveLocation, mqttOperationStats, mqttMessages } = useAppContext(); // ✅ get live MQTT data
  const ops = useOperations();
  const zones = useZones();
  const allDevices = useDevices(ops.selectedOperationId);
  const drawing = useDrawing();
  useEffect(() => {
    if (ops.operations.length > 0 && !ops.selectedOperationId) {
      // Assuming operations are sorted oldest → newest
      const latest = ops.operations[ops.operations.length - 1];
      ops.setSelectedOperationId(latest.id);
      console.log("✅ Auto-selected latest operation:", latest.name || latest.id);
    }
  }, [ops.operations, ops.selectedOperationId]);
  // ✅ Log live device updates
  if (mqttDeviceLiveLocation?.length > 0) {
    mqttDeviceLiveLocation.forEach((msg) => {
      const device = allDevices.find((d) => Number(d.flespiId) === Number(msg.deviceId));
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr" }}>
      <div
        style={{
          padding: 12,
          background: "var(--panel)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back
        </Button>

        {ops.mode === "OPERATION" ? (
          <OperationForm ops={ops} drawing={drawing} />
        ) : (
          <ZoneForm ops={ops} zones={zones} drawing={drawing} />
        )}

        <OperationList ops={ops} />
        {ops.selectedOperationId && (
          <ZoneList ops={ops} zones={zones} allDevices={allDevices} />
        )}
      </div>
      {console.log("Rendering MapCanvas with live MQTT data:", {
        // mqttDeviceLiveLocation,
        mqttOperationStats,
        // mqttMessages,
      })}
      {/* ✅ Pass live MQTT data into the map */}
      <MapCanvas
        ops={ops}
        zones={zones}
        drawing={drawing}
        allDevices={allDevices}
        mqttDeviceLiveLocation={mqttDeviceLiveLocation}
        mqttOperationStats={mqttOperationStats}

      />

      {/* 🆕 Alerts Panel */}
      <AlertsPanel mqttMessages={mqttMessages} />

    </div>
  );
}
