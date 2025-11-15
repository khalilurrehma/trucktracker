import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createRoot } from "react-dom/client";

import TruckInfoCard from "@/operations/components/TruckInfoCard";
import VehicleMarker from "@/operations/components/VehicleMarker";
import AlertsPanel from "@/operations/components/AlertsPanel";
import { createBaseLayers } from "@/operations/components/MapBaseLayers";

import { getOperationById } from "@/apis/operationApi";
import { getZonesByOperationId, deleteZone } from "@/apis/zoneApi";
import {
  getDevicesByPositionOperation,
  fetchOperationKPI,
} from "@/apis/deviceAssignmentApi";

import { useAppContext } from "@/AppContext";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Swal from "sweetalert2";

const colors = {
  QUEUE_AREA: "#e67e22",
  LOAD_PAD: "#27ae60",
  DUMP_AREA: "#c0392b",
  ZONE_AREA: "#3498db",
};

/* ---------------- GET CENTER OF POLYGON ---------------- */
const getPolygonCenter = (geometry) => {
  try {
    const coords =
      geometry.type === "Polygon"
        ? geometry.coordinates[0]
        : geometry.type === "MultiPolygon"
          ? geometry.coordinates[0][0]
          : null;

    if (!coords) return null;

    let x = 0,
      y = 0;

    coords.forEach(([lng, lat]) => {
      x += lng;
      y += lat;
    });

    return [y / coords.length, x / coords.length]; // Leaflet uses [lat, lng]
  } catch (e) {
    console.error("Centroid error:", e);
    return null;
  }
};

export default function OperationWithZonesMap() {
  const mapRef = useRef(null);
  const layersRef = useRef({});
  const hasFitBounds = useRef(false);

  const [operation, setOperation] = useState(null);
  const [zones, setZones] = useState([]);
  const [devices, setDevices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [deviceKPI, setDeviceKPI] = useState({});
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const [activeZone, setActiveZone] = useState(null);

  const { mqttDeviceLiveLocation, mqttMessages } = useAppContext();
  const operationId = new URLSearchParams(window.location.search).get("id");

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    const load = async () => {
      if (!operationId) return;

      const op = await getOperationById(operationId);
      const zoneList = await getZonesByOperationId(operationId);
      const deviceList = await getDevicesByPositionOperation(op.id);

      const devicesArray = deviceList?.devices || [];
      setDevices(devicesArray);

      // KPI loading
      const kpiPromises = devicesArray.map((device) =>
        fetchOperationKPI(device.flespi_device_id)
      );
      const kpiResults = await Promise.allSettled(kpiPromises);

      const kpiMap = {};
      devicesArray.forEach((device, index) => {
        kpiMap[device.flespi_device_id] =
          kpiResults[index].status === "fulfilled"
            ? kpiResults[index].value
            : null;
      });

      setDeviceKPI(kpiMap);

      // Operation
      setOperation({
        ...op,
        geometry:
          typeof op.geometry === "string"
            ? JSON.parse(op.geometry)
            : op.geometry,
      });

      // Zones
      setZones(
        zoneList.map((z) => ({
          ...z,
          geometry:
            typeof z.geometry === "string"
              ? JSON.parse(z.geometry)
              : z.geometry,
        }))
      );
    };

    load();
  }, [operationId]);

  /* ---------------- LIVE MQTT POSITIONS ---------------- */
  useEffect(() => {
    if (!mqttDeviceLiveLocation?.length) return;

    setPositions((prev) => {
      const updated = [...prev];

      mqttDeviceLiveLocation.forEach(({ deviceId, value }) => {
        if (!value?.latitude || !value?.longitude) return;

        const idx = updated.findIndex((p) => p.flespiDeviceId === deviceId);

        const newPos = {
          flespiDeviceId: deviceId,
          lat: value.latitude,
          lon: value.longitude,
          direction: value.direction || 0,
          timestamp: Date.now(),
        };

        if (idx !== -1) updated[idx] = newPos;
        else updated.push(newPos);
      });

      return updated;
    });
  }, [mqttDeviceLiveLocation]);

  const devicesWithPos = devices.map((d) => {
    const live = positions.find((p) => p.flespiDeviceId === d.flespi_device_id);

    return {
      ...d,
      lat: live?.lat || d.lat,
      lon: live?.lon || d.lon,
      direction: live?.direction || d.direction || 0,
    };
  });

  /* ---------------- INIT MAP ---------------- */
  useEffect(() => {
    if (!operation?.geometry) return;

    if (!mapRef.current) {
      const map = L.map("operation-map", { zoom: 14 });

      const baseLayers = createBaseLayers();
      baseLayers["OpenStreetMap"].addTo(map);
      L.control.layers(baseLayers, {}, { collapsed: true }).addTo(map);

      mapRef.current = map;
    }

    drawAll();
  }, [operation, zones, devicesWithPos, activeZone]);

  /* ---------------- FOCUS ZONE ---------------- */
  const focusZone = (zone) => {
    const map = mapRef.current;
    if (!map) return;

    const layer = layersRef.current[`zone-${zone.id}`];
    if (layer) {
      map.fitBounds(layer.getBounds(), { padding: [40, 40] });
      setActiveZone(zone.id);
    }
  };

  /* ---------------- DRAW EVERYTHING ---------------- */
  const drawAll = () => {
    const map = mapRef.current;

    Object.values(layersRef.current).forEach((l) => map.removeLayer(l));
    layersRef.current = {};

    /* ---------------- OPERATION LAYER ---------------- */
    const opLayer = L.geoJSON(operation.geometry, {
      style: { color: "#8e44ad", weight: 3, fillOpacity: 0.05 },
    }).addTo(map);

    if (!hasFitBounds.current) {
      map.fitBounds(opLayer.getBounds());
      hasFitBounds.current = true;
    }

    layersRef.current.operation = opLayer;

    /* ---------------- OPERATION NAME LABEL ---------------- */
    const center = getPolygonCenter(operation.geometry);
    if (center) {
      const nameLabel = L.divIcon({
        html: `<div style="
          background: rgba(0,0,0,0.55);
          color: white;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 15px;
          font-weight: bold;
          pointer-events: none;
          white-space: nowrap;
        ">
          ${operation.name || `Operation`}
        </div>`,
        className: "",
      });

      const marker = L.marker(center, { icon: nameLabel }).addTo(map);
      layersRef.current.operationName = marker;
    }

    /* ---------------- ZONE LAYERS ---------------- */
    zones.forEach((zone) => {
      const layer = L.geoJSON(zone.geometry, {
        style: {
          color: activeZone === zone.id ? "#000" : colors[zone.zoneType],
          weight: activeZone === zone.id ? 4 : 2,
          fillOpacity: 0.25,
        },
      }).addTo(map);

      layersRef.current[`zone-${zone.id}`] = layer;

      /* ⭐ ZONE LABEL INSIDE POLYGON ⭐ */
      const center = getPolygonCenter(zone.geometry);
      if (center) {
        const zoneLabel = L.divIcon({
          html: `
        <div style="
          background: rgba(0,0,0,0.55);
          color: white;
          padding: 4px 8px;
          border-radius: 5px;
          font-size: 13px;
          text-align:center;
          pointer-events: none;
          white-space: nowrap;
        ">
          ${zone.name}
        </div>
      `,
          className: "",
        });

        const marker = L.marker(center, { icon: zoneLabel }).addTo(map);
        layersRef.current[`zone-label-${zone.id}`] = marker;
      }
    });


    /* ---------------- DEVICE MARKERS ---------------- */
    devicesWithPos.forEach((dev) => {
      if (!dev.lat || !dev.lon) return;

      const elId = `dev-${dev.id}`;
      const icon = L.divIcon({
        html: `<div id="${elId}" style="transform: translate(-50%, -50%)"></div>`,
        className: "",
        iconSize: [50, 50],
      });

      let marker = layersRef.current[`dev-${dev.id}`];

      if (!marker) {
        marker = L.marker([dev.lat, dev.lon], { icon }).addTo(map);
        layersRef.current[`dev-${dev.id}`] = marker;
      } else {
        marker.setLatLng([dev.lat, dev.lon]);
      }

      setTimeout(() => {
        const el = document.getElementById(elId);
        if (!el) return;

        if (!el._reactRoot) el._reactRoot = createRoot(el);

        el._reactRoot.render(
          <div
            style={{
              position: "relative",
              transform: "translate(-50%, -100%)",
              textAlign: "center",
            }}
            onMouseEnter={() => setHoveredDevice(dev)}
            onMouseLeave={() => setHoveredDevice(null)}
          >
            {hoveredDevice?.id === dev.id && (
              <div
                style={{
                  marginBottom: 8,
                  pointerEvents: "none",
                  zIndex: 9999,
                  transform: "translateY(-10px)",
                }}
              >
                <TruckInfoCard
                  device={dev}
                  kpi={deviceKPI[dev.flespi_device_id]}
                />
              </div>
            )}

            <VehicleMarker
              type={dev.category}
              deviceName={dev.device_name}
              direction={dev.direction}
            />
          </div>
        );
      }, 0);
    });
  };

  /* ---------------- DELETE ZONE ---------------- */
  const handleDeleteZone = (id) => {
    Swal.fire({
      title: "Delete Zone?",
      icon: "warning",
      showCancelButton: true,
    }).then(async (res) => {
      if (!res.isConfirmed) return;
      await deleteZone(id);
      setZones((z) => z.filter((x) => x.id !== id));
    });
  };

  return (
    <>
      <div style={{ display: "flex", height: "100vh" }}>
        {/* Sidebar */}
        <div
          style={{
            width: 320,
            padding: 15,
            borderRight: "1px solid #ccc",
            overflowY: "auto",
          }}
        >
          <button
            onClick={() => window.history.back()}
            style={{
              marginBottom: 10,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          >
            ← Back
          </button>

          <h3>Zones in Operation #{operationId}</h3>

          {zones.map((zone) => (
            <div
              key={zone.id}
              onClick={() => focusZone(zone)}
              style={{
                padding: 12,
                marginBottom: 12,
                borderRadius: 8,
                cursor: "pointer",
                borderLeft: `6px solid ${colors[zone.zoneType]}`,
                boxShadow:
                  activeZone === zone.id
                    ? "0 0 6px rgba(0,0,0,0.2)"
                    : "0 1px 2px rgba(0,0,0,0.1)",
                transition: "0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{zone.name}</strong>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {zone.zoneType.replace("_", " ")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditZone(zone.id);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>

                  <IconButton
                    size="small"
                    sx={{ color: "#c0392b" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteZone(zone.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{ flex: 1 }}>
          <div id="operation-map" style={{ height: "100%", width: "100%" }} />
        </div>
      </div>

      {/* Alerts Panel */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999 }}>
        <AlertsPanel mqttMessages={mqttMessages} />
      </div>
    </>
  );
}
