import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createRoot } from "react-dom/client";
import VehicleMarker from "@/operations/components/VehicleMarker";

import { getOperationById } from "@/apis/operationApi";
import { getZonesByOperationId, deleteZone } from "@/apis/zoneApi";
import { getDevicesByPositionOperation } from "@/apis/deviceAssignmentApi";

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

export default function OperationWithZonesMap() {
  const mapRef = useRef(null);
  const layersRef = useRef({});
  const hasFitBounds = useRef(false);   // <---- ADDED FIX

  const [operation, setOperation] = useState(null);
  const [zones, setZones] = useState([]);
  const [devices, setDevices] = useState([]);
  const [positions, setPositions] = useState([]);

  const { mqttDeviceLiveLocation } = useAppContext();

  const operationId = new URLSearchParams(window.location.search).get("id");

  /* ---------------- LOAD ALL DATA ---------------- */
  useEffect(() => {
    const loadData = async () => {
      if (!operationId) return;

      const op = await getOperationById(operationId);
      const zoneList = await getZonesByOperationId(operationId);
      const deviceList = await getDevicesByPositionOperation(op.id);

      setDevices(deviceList.devices);

      setOperation({
        ...op,
        geometry:
          typeof op.geometry === "string" ? JSON.parse(op.geometry) : op.geometry,
      });

      setZones(
        zoneList.map((z) => ({
          ...z,
          geometry: typeof z.geometry === "string" ? JSON.parse(z.geometry) : z.geometry,
        }))
      );
    };

    loadData();
  }, [operationId]);

  /* ---------------- MQTT LIVE POSITION UPDATES ---------------- */
  useEffect(() => {
    if (!mqttDeviceLiveLocation?.length) return;

    setPositions((prev) => {
      const updated = [...prev];

      mqttDeviceLiveLocation.forEach(({ deviceId, value }) => {
        if (!value?.latitude || !value?.longitude) return;

        const newPos = {
          flespiDeviceId: deviceId,
          lat: value.latitude,
          lon: value.longitude,
          direction: value.direction || 0,
          timestamp: Date.now(),
        };

        const idx = updated.findIndex((p) => p.flespiDeviceId === deviceId);

        if (idx !== -1) updated[idx] = { ...updated[idx], ...newPos };
        else updated.push(newPos);
      });

      return updated;
    });
  }, [mqttDeviceLiveLocation]);

  /* ---------------- MERGE LIVE POSITIONS ---------------- */
  const devicesWithPos = devices.map((d) => {
    const live = positions.find((p) => p.flespiDeviceId === d.flespi_device_id);

    return {
      ...d,
      lat: live?.lat || d.lat,
      lon: live?.lon || d.lon,
      direction: live?.direction || 0,
    };
  });

  /* ---------------- INIT MAP ---------------- */
  useEffect(() => {
    if (!operation || !operation.geometry) return;

    if (!mapRef.current) {
      mapRef.current = L.map("operation-map", {
        center: [-12.19, -77.015],
        zoom: 14,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
        mapRef.current
      );
    }

    drawEverything();
  }, [operation, zones, devicesWithPos]);

  /* ---------------- DRAW EVERYTHING ---------------- */
  const drawEverything = () => {
    const map = mapRef.current;

    Object.values(layersRef.current).forEach((layer) => map.removeLayer(layer));
    layersRef.current = {};

    /* ------ Draw Operation Boundary ------ */
    const opLayer = L.geoJSON(operation.geometry, {
      style: { color: "#8e44ad", weight: 3, fillOpacity: 0.05 },
    }).addTo(map);

    // FIX: only fitBounds ONCE
    if (!hasFitBounds.current) {
      map.fitBounds(opLayer.getBounds());
      hasFitBounds.current = true;
    }

    layersRef.current["operation"] = opLayer;

    /* ------ Draw Zones ------ */
    zones.forEach((zone) => {
      const color = colors[zone.zoneType] || "#2980b9";

      const layer = L.geoJSON(zone.geometry, {
        style: { color, weight: 2, fillOpacity: 0.25 },
      }).addTo(map);

      layersRef.current[zone.id] = layer;
    });

    /* ------ Draw Devices ------ */
    devicesWithPos.forEach((dev) => {
      if (!dev.lat || !dev.lon) return;

      const divId = `dev-marker-${dev.id}`;

      const icon = L.divIcon({
        html: `<div id="${divId}" style="transform: translate(-50%, -50%);"></div>`,
        className: "",
        iconSize: [50, 50],
      });

      let marker = layersRef.current[`device-${dev.id}`];

      if (!marker) {
        marker = L.marker([dev.lat, dev.lon], { icon }).addTo(map);
        layersRef.current[`device-${dev.id}`] = marker;
      } else {
        marker.setLatLng([dev.lat, dev.lon]);
      }

      setTimeout(() => {
        const el = document.getElementById(divId);
        if (el) {
          if (!el._reactRoot) el._reactRoot = createRoot(el);

          el._reactRoot.render(
            <VehicleMarker
              type={dev.category}
              deviceName={dev.device_name}
              direction={dev.direction}
            />
          );
        }
      }, 0);
    });
  };

  /* ---------------- DELETE ZONE ---------------- */
  const handleDeleteZone = async (zoneId) => {
    Swal.fire({
      title: "Delete Zone?",
      icon: "warning",
      showCancelButton: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        await deleteZone(zoneId);
        setZones((prev) => prev.filter((z) => z.id !== zoneId));
      }
    });
  };

  const handleEditZone = (zoneId) =>
    (window.location.href = `/operations/geofence/edit-zone/${zoneId}`);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div
        style={{
          width: "320px",
          padding: "15px",
          borderRight: "1px solid #ccc",
          overflowY: "auto",
        }}
      >
        <button
          onClick={() => window.history.back()}
          style={{
            marginBottom: "10px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <h3 style={{ marginBottom: 10 }}>
          Zones in Operation #{operationId}
        </h3>

        {zones.map((zone) => (
          <div
            key={zone.id}
            style={{
              padding: "12px",
              marginBottom: "12px",
              borderRadius: "8px",
              borderLeft: `6px solid ${colors[zone.zoneType]}`,
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong>{zone.name}</strong>
                <div style={{ fontSize: "12px", opacity: 0.7 }}>
                  {zone.zoneType.replace("_", " ")}
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <IconButton size="small" onClick={() => handleEditZone(zone.id)}>
                  <EditIcon fontSize="small" />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={() => handleDeleteZone(zone.id)}
                  sx={{ color: "#c0392b" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div id="operation-map" style={{ flex: 1 }} />
    </div>
  );
}
