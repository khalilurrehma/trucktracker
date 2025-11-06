import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, IconButton } from "@mui/material";
import { ArrowLeft, Menu } from "lucide-react";
import MapCanvas from "./components/MapCanvas";
import OperationList from "./components/OperationList";
import AlertsPanel from "./components/AlertsPanel";
import { useOperations } from "../hooks/useOperations";
import { useZones } from "../hooks/useZones";
import { useDevices } from "../hooks/useDevices";
import { useDrawing } from "../hooks/useDrawing";
import { useAppContext } from "../AppContext";

export default function OperationZoneManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mqttDeviceLiveLocation, mqttOperationStats, mqttMessages } =
    useAppContext();

  const ops = useOperations();
  const zones = useZones();
  const allDevices = useDevices(ops.selectedOperationId);
  const drawing = useDrawing();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (ops.operations.length > 0 && !ops.selectedOperationId) {
      const latest = ops.operations[ops.operations.length - 1];
      ops.setSelectedOperationId(latest.id);
    }
  }, [ops.operations, ops.selectedOperationId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const geoId = params.get("id");
    if (geoId && ops.operations?.length > 0) {
      const found = ops.operations.find((g) => String(g.id) === String(geoId));
      if (found) ops.setSelectedOperationId(found.id);
    }
  }, [location.search, ops.operations]);

  return (
    <div className="manager-wrapper">
      {/* Hamburger button for mobile */}
      <IconButton
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="menu-toggle"
      >
        <Menu />
      </IconButton>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
          fullWidth
        >
          Back
        </Button>
        <OperationList ops={ops} />
      </div>
      {console.log(mqttOperationStats)}

      {/* Map and alerts */}
      <div className="map-section">
        <MapCanvas
          ops={ops}
          allDevices={allDevices}
          mqttDeviceLiveLocation={mqttDeviceLiveLocation}
          mqttOperationStats={mqttOperationStats}
        />
        <AlertsPanel mqttMessages={mqttMessages} />
      </div>

      {/* Inline responsive styles */}
      <style>
        {`
          .manager-wrapper {
            display: flex;
            height: 100vh;
            width: 100%;
            overflow: hidden;
          }
          .sidebar {
            flex: 0 0 360px;
            background: var(--panel, #121212);
            border-right: 1px solid var(--border, #222);
            padding: 12px;
            transition: transform 0.3s ease-in-out;
            z-index: 20;
          }
          .map-section {
            flex: 1;
            position: relative;
            overflow: hidden;
          }
          .menu-toggle {
            display: none;
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(255,255,255,0.8);
            z-index: 30;
          }

          /* Mobile styles */
          @media (max-width: 768px) {
            .manager-wrapper {
              flex-direction: column;
            }
            .sidebar {
              position: absolute;
              top: 0;
              left: 0;
              width: 80%;
              max-width: 300px;
              height: 100%;
              background: #111;
              transform: translateX(-100%);
              box-shadow: 2px 0 10px rgba(0,0,0,0.3);
            }
            .sidebar.open {
              transform: translateX(0);
            }
            .menu-toggle {
              display: inline-flex;
            }
            .map-section {
              flex: 1;
              height: 100vh;
            }
          }
        `}
      </style>
    </div>
  );
}
