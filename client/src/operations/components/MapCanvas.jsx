import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  Polygon,
  OverlayView,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  fetchOperationKPI,
  getDevicesByOperation,
  getDevicePositions,
} from "../../apis/deviceAssignmentApi";
import { GiTruck } from "react-icons/gi";
import TruckInfoCard from "../components/TruckInfoCard";

const LIBS = ["drawing", "geometry"];
const MAP_STYLE = { width: "100%", height: "74vh" };
const CENTER = { lat: -12.0464, lng: -77.0428 };

const COLORS = {
  OPERATION: "#00c853",
  SELECTED_OPERATION: "#64ffda",
  QUEUE_AREA: "#fbc02d",
  LOAD_PAD: "#ef5350",
  DUMP_AREA: "#ab47bc",
  ZONE_AREA: "#42a5f5",
  INVALID: "#ff1744",
};

export default function MapCanvas({
  ops,
  zones,
  drawing,
  mqttDeviceLiveLocation,
  mqttOperationStats,
}) {
  const key = import.meta.env.VITE_GOOGLE_MAP_API;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: key,
    libraries: LIBS,
  });

  const [assignedDevices, setAssignedDevices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const [deviceKPI, setDeviceKPI] = useState({});
  const mapRef = useRef(null);
  const overlayRef = useRef(null);

  // --- Load operation & KPI data
  const loadData = async () => {
    if (!ops.selectedOperationId) return;
    try {
      const devices = await getDevicesByOperation(ops.selectedOperationId);
      setAssignedDevices(devices);

      const flespiIds = devices.map((d) => d.flespiId).filter(Boolean);
      if (flespiIds.length) {
        const pos = await getDevicePositions(flespiIds);
        setPositions(pos);
      } else setPositions([]);

      const kpiPromises = devices.map((d) => fetchOperationKPI(d.flespiId));
      const kpiResults = await Promise.allSettled(kpiPromises);
      const kpiMap = {};
      devices.forEach((d, i) => {
        if (kpiResults[i].status === "fulfilled") {
          kpiMap[d.flespiId] = kpiResults[i].value;
        }
      });
      setDeviceKPI(kpiMap);
    } catch (err) {
      console.error("Error loading data:", err.message);
    }
  };

  // --- Update positions live from MQTT
  useEffect(() => {
    if (!mqttDeviceLiveLocation?.length) return;
    setPositions((prev) => {
      const updated = [...prev];
      mqttDeviceLiveLocation.forEach(({ deviceId, value }) => {
        if (!value?.latitude || !value?.longitude) return;
        const idx = updated.findIndex((p) => p.flespiDeviceId === deviceId);
        const newPos = {
          flespiDeviceId: deviceId,
          latitude: value.latitude,
          longitude: value.longitude,
        };
        if (idx !== -1) updated[idx] = newPos;
        else updated.push(newPos);
      });
      return updated;
    });
  }, [mqttDeviceLiveLocation]);
// 🧠 Live update KPIs from MQTT operation stats
useEffect(() => {
  if (!mqttOperationStats?.length) return;

  setDeviceKPI((prev) => {
    const updated = { ...prev };

    mqttOperationStats.forEach((msg) => {
      const { flespiDeviceId, value } = msg;
      if (!flespiDeviceId || !value) return;

      // Merge live KPI data with previous one (keep timestamp if new)
      updated[flespiDeviceId] = {
        ...updated[flespiDeviceId],
        ...value,
        timestamp: new Date().toISOString(),
      };
    });

    return updated;
  });
}, [mqttOperationStats]);

  useEffect(() => {
    loadData();
  }, [ops.selectedOperationId]);

  useEffect(() => {
    const interval = setInterval(() => loadData(), 15000);
    return () => clearInterval(interval);
  }, [ops.selectedOperationId]);

  const selectedOperation = useMemo(
    () => ops.operations.find((p) => p.id === ops.selectedOperationId),
    [ops.operations, ops.selectedOperationId]
  );

  // --- Fit map to selected operation
  useEffect(() => {
    if (!mapRef.current || !selectedOperation) return;
    const geometry =
      typeof selectedOperation.geometry === "string"
        ? JSON.parse(selectedOperation.geometry)
        : selectedOperation.geometry;
    if (!geometry?.coordinates?.[0]) return;

    const g = window.google;
    const bounds = new g.maps.LatLngBounds();
    geometry.coordinates[0].forEach(([lng, lat]) => bounds.extend({ lat, lng }));
    mapRef.current.fitBounds(bounds);
  }, [selectedOperation]);

  // --- Initialize drawing manager
  const onMapLoad = (map) => {
    mapRef.current = map;
    const g = window.google;
    if (!g?.maps?.drawing) return;

    const dm = new g.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: g.maps.ControlPosition.TOP_LEFT,
        drawingModes: ["polygon"],
      },
      polygonOptions: {
        fillColor: COLORS[ops.mode === "OPERATION" ? "OPERATION" : "ZONE_AREA"],
        fillOpacity: 0.3,
        strokeColor: COLORS[ops.mode === "OPERATION" ? "OPERATION" : "ZONE_AREA"],
        strokeWeight: 2,
        editable: true,
      },
    });

    dm.setMap(map);
    g.maps.event.addListener(dm, "overlaycomplete", (e) => {
      if (overlayRef.current) overlayRef.current.setMap(null);
      overlayRef.current = e.overlay;
      const path = e.overlay.getPath().getArray();
      const sqm = g.maps.geometry.spherical.computeArea(path);
      const coords = path.map((p) => [p.lng(), p.lat()]);
      drawing.setGeometry(closeRing(coords), sqm);
    });
  };

  if (loadError) return <div>Map failed to load.</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  // --- Helpers
  const getColor = (eff) =>
    eff >= 85 ? "#00e676" : eff >= 70 ? "#ffb300" : "#ff5252";

  const getPolygonCenter = (coords) => {
    if (!coords?.length) return null;
    let latSum = 0,
      lngSum = 0;
    coords.forEach(([lng, lat]) => {
      latSum += lat;
      lngSum += lng;
    });
    return { lat: latSum / coords.length, lng: lngSum / coords.length };
  };

  return (
    <>
      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={CENTER}
        zoom={15}
        onLoad={onMapLoad}
        options={{
          mapTypeId: "satellite",
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          zoomControl: true,
        }}
      >
        {/* --- Operation polygons + labels --- */}
        {ops.operations.map((op) => {
          const geometry =
            typeof op.geometry === "string" ? JSON.parse(op.geometry) : op.geometry;
          const coords = geometry?.coordinates?.[0];
          if (!coords) return null;

          const center = getPolygonCenter(coords);
          const selected = op.id === ops.selectedOperationId;

          return (
            <React.Fragment key={op.id}>
              <Polygon
                paths={coords.map(([lng, lat]) => ({ lng, lat }))}
                onClick={() => ops.setSelectedOperationId(op.id)}
                options={{
                  strokeColor: selected ? COLORS.SELECTED_OPERATION : COLORS.OPERATION,
                  strokeWeight: selected ? 3 : 1.5,
                  fillColor: selected ? COLORS.SELECTED_OPERATION : COLORS.OPERATION,
                  fillOpacity: selected ? 0.25 : 0.1,
                }}
              />
              {center && (
                <OverlayView position={center} mapPaneName={OverlayView.OVERLAY_LAYER}>
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.55)",
                      color: "#fff",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      textAlign: "center",
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    🏗️ {op.name || "Operation"}
                  </div>
                </OverlayView>
              )}
            </React.Fragment>
          );
        })}

        {/* --- Zone polygons + labels --- */}
        {zones.zones.map((z) => {
          const geometry =
            typeof z.geometry === "string" ? JSON.parse(z.geometry) : z.geometry;
          const coords = geometry?.coordinates?.[0];
          if (!coords) return null;

          const center = getPolygonCenter(coords);

          return (
            <React.Fragment key={z.id}>
              <Polygon
                paths={coords.map(([lng, lat]) => ({ lng, lat }))}
                options={{
                  strokeColor: COLORS[z.zoneType] || COLORS.ZONE_AREA,
                  strokeWeight: 2,
                  fillColor: COLORS[z.zoneType] || COLORS.ZONE_AREA,
                  fillOpacity: 0.25,
                }}
              />
              {center && (
                <OverlayView position={center} mapPaneName={OverlayView.OVERLAY_LAYER}>
                  <div
                    style={{
                      background: "rgba(33, 33, 33, 0.7)",
                      color: "#fff",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      textAlign: "center",
                      border: `1px solid ${
                        COLORS[z.zoneType] || COLORS.ZONE_AREA
                      }`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    📍 {z.name || "Zone"}
                  </div>
                </OverlayView>
              )}
            </React.Fragment>
          );
        })}

        {/* --- Trucks --- */}
        {positions.map((pos) => {
          const device = assignedDevices.find(
            (d) => Number(d.flespiId) === Number(pos.flespiDeviceId)
          );
          if (!device) return null;

          const kpi = deviceKPI[device.flespiId];
          const eff = kpi?.efficiency || 0;
          const color = getColor(eff);

          return (
            <OverlayView
              key={device.flespiId}
              position={{ lat: pos.latitude, lng: pos.longitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div
                className="truck-marker"
                onMouseEnter={() => setHoveredDevice(device)}
                onMouseLeave={() => setHoveredDevice(null)}
              >
                <div
                  className="efficiency-badge"
                  style={{
                    background: kpi ? color : "#9e9e9e",
                    fontSize: "11px",
                    padding: "2px 5px",
                    borderRadius: "4px",
                    marginBottom: "2px",
                    textAlign: "center",
                  }}
                >
                  {kpi ? `${eff}%` : "…"}
                </div>
                <GiTruck
                  size={34}
                  color={
                    kpi
                      ? eff >= 85
                        ? "#00e676"
                        : eff >= 70
                        ? "#ffb300"
                        : "#ff5252"
                      : "#757575"
                  }
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                />
                {hoveredDevice?.flespiId === device.flespiId && kpi && (
                  <TruckInfoCard device={device} kpi={kpi} />
                )}
              </div>
            </OverlayView>
          );
        })}
      </GoogleMap>

      {/* 🗺️ Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          background: "rgba(0,0,0,0.65)",
          padding: "14px 18px",
          borderRadius: "12px",
          color: "white",
          fontSize: "14px",
          lineHeight: "22px",
          zIndex: 9999,
        }}
      >
        <strong style={{ display: "block", marginBottom: "6px" }}>
          🗺️ Zone Legend
        </strong>
        {Object.entries({
          Operation: COLORS.OPERATION,
          "Queue Area": COLORS.QUEUE_AREA,
          "Load Pad": COLORS.LOAD_PAD,
          "Dump Area": COLORS.DUMP_AREA,
          "General Zone": COLORS.ZONE_AREA,
        }).map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{ width: 16, height: 16, background: color, borderRadius: 2 }}
            ></span>
            {label}
          </div>
        ))}
      </div>
    </>
  );
}

function closeRing(coords) {
  if (!coords.length) return coords;
  const [firstLng, firstLat] = coords[0];
  const [lastLng, lastLat] = coords[coords.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) coords.push(coords[0]);
  return coords;
}
