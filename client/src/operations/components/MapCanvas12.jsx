// src/operations/components/MapCanvas.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  GoogleMap,
  Polygon,
  Circle,
  OverlayView,
  TrafficLayer,
  TransitLayer,
  BicyclingLayer,
  useJsApiLoader,
} from "@react-google-maps/api";
import TruckInfoCard from "./TruckInfoCard";
import VehicleMarker from "./VehicleMarker";
import LayerTogglesPanel from "./LayerTogglesPanel";
import MapControlRail from "./MapControlRail";
import { Box } from "@mui/material";
import { fetchOperationKPI, getDevicePositions, getDevicesByGeofence } from "../../apis/deviceAssignmentApi";

const LIBS = ["drawing", "geometry"];
const MAP_STYLE = { width: "100%", height: "74vh" };
const CENTER = { lat: -12.308503, lng: -76.826321 };

const COLORS = {
  DUMP_AREA: "#ab47bc",
  LOAD_PAD: "#ef5350",
  QUEUE_AREA: "#fbc02d",
  ZONE_AREA: "#42a5f5",
  OP_AREA: "#00c853",
  SELECTED_OPERATION: "#64ffda",
};

export default function MapCanvas({ ops, allDevices, mqttDeviceLiveLocation, mqttOperationStats, mqttGeofences }) {
  const key = import.meta.env.VITE_GOOGLE_MAP_API;
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: key, libraries: LIBS });

  const [devices, setDevices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [deviceKPI, setDeviceKPI] = useState({});
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const [mapMode, setMapMode] = useState("google_roadmap");
  const mapRef = useRef(null);
  const polygonRefs = useRef({});
  const circleRefs = useRef({});
  const [geofences, setGeofences] = useState([]);
  // toggles
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [showBicycling, setShowBicycling] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [showTrucks, setShowTrucks] = useState(true);

  const selectedOperation = useMemo(
    () => ops.operations.find((p) => p.id === ops.selectedOperationId),
    [ops.operations, ops.selectedOperationId]
  );

  // Load devices & KPIs
  useEffect(() => {
    const loadDevicesAndPositions = async () => {
      if (!selectedOperation || !allDevices?.length) return;
      try {
        const geofenceDevices = await getDevicesByGeofence(selectedOperation.id);
        const mergedDevices = geofenceDevices.map((gdev) => {
          const fullInfo = allDevices.find((d) => Number(d.flespiId) === Number(gdev.device_id));
          return { ...gdev, ...fullInfo };
        });
        setDevices(mergedDevices);

        const ids = mergedDevices.map((d) => d?.flespiId || d?.device_id);
        if (!ids.length) return;

        const pos = await getDevicePositions(ids);
        setPositions(pos);

        const kpiPromises = ids.map((id) => fetchOperationKPI(id));
        const kpiResults = await Promise.allSettled(kpiPromises);
        const kpiMap = {};
        ids.forEach((id, i) => {
          if (kpiResults[i].status === "fulfilled") kpiMap[id] = kpiResults[i].value;
        });
        setDeviceKPI(kpiMap);
      } catch (err) {
        console.error("❌ Failed to load geofence devices:", err.message);
      }
    };
    loadDevicesAndPositions();
  }, [selectedOperation, allDevices]);

  // Live MQTT locations
  useEffect(() => {
    console.log(123);
    if (!mqttDeviceLiveLocation?.length) return;
    console.log(mqttDeviceLiveLocation);
    setPositions((prev) => {
      
      const updated = [...prev];
      mqttDeviceLiveLocation.forEach(({ deviceId, value }) => {
        if (!value?.latitude || !value?.longitude) return;
        const newPos = {
          flespiDeviceId: deviceId,
          latitude: value.latitude,
          longitude: value.longitude,
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

  // Live KPI updates
  useEffect(() => {
    if (!mqttOperationStats?.length) return;
    setDeviceKPI((prev) => {
      const updated = { ...prev };
      mqttOperationStats.forEach(({ flespiDeviceId, value }) => {
        if (!flespiDeviceId || !value) return;
        updated[flespiDeviceId] = { ...updated[flespiDeviceId], ...value };
      });
      return updated;
    });
  }, [mqttOperationStats]);
  // ✅ Handle incoming MQTT geofence updates (create or update)
  useEffect(() => {
    if (!mqttGeofences) return;

    const list = Array.isArray(mqttGeofences) ? mqttGeofences : [mqttGeofences];

    // Update operations directly
    ops.setOperations?.((prevOps) => {
      const updatedOps = [...prevOps];

      list.forEach((msg) => {
        if (!msg) return;
        const gf = msg.data || msg;
        const action = msg.action || "updated";
        if (!gf?.id) return;

        // find operation with same ID
        const idx = updatedOps.findIndex((op) => Number(op.id) === Number(gf.id));

        if (action === "deleted") {
          // 🗑 remove if exists
          if (idx !== -1) updatedOps.splice(idx, 1);
          return;
        }

        if (idx !== -1) {
          // 🔵 update geometry in existing operation
          updatedOps[idx] = {
            ...updatedOps[idx],
            geometry: gf.geometry,
            name: gf.name || updatedOps[idx].name,
            _ts: Date.now(),
          };
        } else {
          // 🟢 create new operation/geofence if not found
          updatedOps.push({
            id: gf.id,
            name: gf.name || `GEOFENCE_${gf.id}`,
            geometry: gf.geometry,
            type: gf.geometry?.type,
            _ts: Date.now(),
          });
        }
      });

      return updatedOps;
    });
  }, [mqttGeofences]);

  // Auto fit to operation
  useEffect(() => {
    if (!mapRef.current || !selectedOperation) return;
    const g = window.google;
    const geometry =
      typeof selectedOperation.geometry === "string"
        ? JSON.parse(selectedOperation.geometry)
        : selectedOperation.geometry;

    const bounds = new g.maps.LatLngBounds();
    if (geometry?.path?.length) geometry.path.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lon }));
    if (geometry?.center) {
      const { lat, lon } = geometry.center;
      const radiusDeg = geometry.radius / 111;
      bounds.extend({ lat: lat + radiusDeg, lng: lon + radiusDeg });
      bounds.extend({ lat: lat - radiusDeg, lng: lon - radiusDeg });
    }
    mapRef.current.fitBounds(bounds);
  }, [selectedOperation]);

  const getColor = (eff) => (eff >= 85 ? "#00e676" : eff >= 70 ? "#ffb300" : "#ff5252");

  // Register external basemaps after map loads
  const handleMapLoad = (map) => {
    mapRef.current = map;
    if (!window.google || !window.google.maps) return;
    const g = window.google;

    const osmMap = new g.maps.ImageMapType({
      getTileUrl: (coord, zoom) => `https://tile.openstreetmap.org/${zoom}/${coord.x}/${coord.y}.png`,
      tileSize: new g.maps.Size(256, 256),
      name: "OpenStreetMap",
      maxZoom: 19,
    });

    const topoMap = new g.maps.ImageMapType({
      getTileUrl: (coord, zoom) => `https://a.tile.opentopomap.org/${zoom}/${coord.x}/${coord.y}.png`,
      tileSize: new g.maps.Size(256, 256),
      name: "OpenTopoMap",
      maxZoom: 17,
    });

    const locIQ = new g.maps.ImageMapType({
      getTileUrl: (coord, zoom) =>
        `https://tiles.locationiq.com/v3/streets/${zoom}/${coord.x}/${coord.y}.png?key=${import.meta.env.VITE_LOCATIONIQ_KEY}`,
      tileSize: new g.maps.Size(256, 256),
      name: "LocationIQ Streets",
      maxZoom: 18,
    });

    const cartoLight = new g.maps.ImageMapType({
      getTileUrl: (coord, zoom) =>
        `https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/${zoom}/${coord.x}/${coord.y}.png`,
      tileSize: new g.maps.Size(256, 256),
      name: "Carto Light",
      maxZoom: 19,
    });

    map.mapTypes.set("osm", osmMap);
    map.mapTypes.set("topo", topoMap);
    map.mapTypes.set("locIQ", locIQ);
    map.mapTypes.set("carto", cartoLight);
  };

  // Basemap cycle
  const cycleMapType = () => {
    const sequence = [
      "google_roadmap",
      "google_satellite",
      "google_hybrid",
      "google_terrain",
      "osm",
      "topo",
      "locIQ",
      "carto",
    ];
    const next = sequence[(sequence.indexOf(mapMode) + 1) % sequence.length];
    setMapMode(next);
    const typeId = next.replace("google_", "");
    mapRef.current?.setMapTypeId(typeId);
  };

  // Control rail actions
  const centerOnOperation = () => {
    if (!mapRef.current || !selectedOperation) return;
    const g = window.google;
    const geometry =
      typeof selectedOperation.geometry === "string"
        ? JSON.parse(selectedOperation.geometry)
        : selectedOperation.geometry;
    const bounds = new g.maps.LatLngBounds();
    if (geometry?.path) geometry.path.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lon }));
    if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds);
  };

  const zoomIn = () => mapRef.current?.setZoom(mapRef.current.getZoom() + 1);
  const zoomOut = () => mapRef.current?.setZoom(mapRef.current.getZoom() - 1);

  const toggle3D = () => {
    const tilt = mapRef.current?.getTilt?.() || 0;
    if (tilt === 0) {
      mapRef.current?.setMapTypeId("satellite");
      setMapMode("google_satellite");
      mapRef.current?.setTilt(45);
    } else {
      mapRef.current?.setTilt(0);
      mapRef.current?.setHeading(0);
    }
  };

  const rotate3D = () => {
    const tilt = mapRef.current?.getTilt?.() || 0;
    if (tilt === 0) return;
    const current = mapRef.current.getHeading?.() || 0;
    mapRef.current.setHeading(current + 90);
  };

  if (loadError) return <div>Map failed to load.</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <Box sx={{ position: "relative" }}>
      <LayerTogglesPanel
        showTraffic={showTraffic} setShowTraffic={setShowTraffic}
        showTransit={showTransit} setShowTransit={setShowTransit}
        showBicycling={showBicycling} setShowBicycling={setShowBicycling}
        showZones={showZones} setShowZones={setShowZones}
        showTrucks={showTrucks} setShowTrucks={setShowTrucks}
      />

      <GoogleMap
        onLoad={handleMapLoad}
        mapContainerStyle={MAP_STYLE}
        center={CENTER}
        zoom={15}
        options={{
          mapTypeId: mapMode.replace("google_", ""),
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
        }}
      >
        {showTraffic && <TrafficLayer />}
        {showTransit && <TransitLayer />}
        {showBicycling && <BicyclingLayer />}

        {/* Zones */}

        {showZones && ops.operations.map((op) => {
          const geometry = typeof op.geometry === "string" ? JSON.parse(op.geometry) : op.geometry;
          if (!geometry) return null;

          const isSelected = op.id === ops.selectedOperationId;
          const color = isSelected ? COLORS.SELECTED_OPERATION : COLORS[op.name] || "#9e9e9e";
          const strokeWeight = isSelected ? 5 : 2;
          const fillOpacity = isSelected ? 0.35 : 0.25;

          // helper to get center for label
          const getCenter = (geom) => {
            if (geom.type === "circle" && geom.center) return geom.center;
            if (geom.type === "polygon" && geom.path?.length) {
              const latSum = geom.path.reduce((sum, p) => sum + p.lat, 0);
              const lonSum = geom.path.reduce((sum, p) => sum + p.lon, 0);
              return { lat: latSum / geom.path.length, lng: lonSum / geom.path.length };
            }
            return null;
          };

          const center = getCenter(geometry);

          if (geometry.type === "polygon" && geometry.path?.length) {
            return (
              <React.Fragment key={`op-${op.id}`}>
                <Polygon
                  paths={geometry.path.map((p) => ({ lat: p.lat, lng: p.lon }))}
                  options={{ strokeColor: color, strokeWeight, fillColor: color, fillOpacity }}
                />
                {center && (
                  <OverlayView
                    position={center}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <div
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        color: "rgba(0,0,0,0.6)",
                        fontWeight: "bold",
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {op.name}
                    </div>
                  </OverlayView>
                )}
              </React.Fragment>
            );
          }

          if (geometry.type === "circle" && geometry.center) {
            return (
              <React.Fragment key={`op-${op.id}`}>
                <Circle
                  center={{ lat: geometry.center.lat, lng: geometry.center.lon }}
                  radius={geometry.radius * 1000}
                  options={{ strokeColor: color, strokeWeight, fillColor: color, fillOpacity }}
                />
                <OverlayView
                  position={{ lat: geometry.center.lat, lng: geometry.center.lon }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div
                     style={{
                        background: "rgba(0,0,0,0.6)",
                        color: "rgba(0,0,0,0.6)",
                        fontWeight: "bold",
                        transform: "translate(-50%, -50%)",
                      }}
                  >
                    {op.name}
                  </div>
                </OverlayView>
              </React.Fragment>
            );
          }

          return null;
        })}
        {/* ✅ ---- LIVE MQTT GEOFENCES ---- */}
        {Array.isArray(geofences) &&
          geofences.map((gf) => {
            const { id, name, geometry, _ts } = gf || {};
            if (!geometry) return null;

            const color = COLORS?.[name] || "#26c6da"; // default color
            const key = id ? `gf-${id}-${_ts || 0}` : `gf-${Date.now()}`;

            // Circle
            if (geometry.type === "circle" && geometry.center) {
              return (
                <Circle
                  key={key}
                  onLoad={(c) => (circleRefs.current[id] = c)}
                  center={{ lat: geometry.center.lat, lng: geometry.center.lon }}
                  radius={Number(geometry.radius) * 1000 || 0}
                  options={{
                    strokeColor: color,
                    strokeWeight: 2,
                    fillColor: color,
                    fillOpacity: 0.25,
                  }}
                />
              );
            }

            // Polygon
            if (geometry.type === "polygon" && Array.isArray(geometry.path)) {
              const path = geometry.path.map((p) => ({ lat: p.lat, lng: p.lon }));
              return (
                <Polygon
                  key={key}
                  onLoad={(p) => (polygonRefs.current[id] = p)}
                  paths={path}
                  options={{
                    strokeColor: color,
                    strokeWeight: 2,
                    fillColor: color,
                    fillOpacity: 0.25,
                  }}
                />
              );
            }
            return null;
          })}

        {/* Trucks */}
        {showTrucks && positions.map((pos) => {
          const device = devices.find((d) => Number(d.flespiId || d.device_id) === Number(pos.flespiDeviceId));
          if (!device) return null;
          const kpi = deviceKPI[device.flespiId || device.device_id];
          const eff = kpi?.efficiency || 0;
          const markerSize = 34;
          const cardOffset = markerSize / 2 + 18;
          const markerOffset = useCallback(() => ({
            x: -(markerSize + 18) / 2,
            y: -(markerSize + 24) / 2,
          }), []);

          return (
            <OverlayView
              key={device.flespiId || device.device_id}
              position={{ lat: pos.latitude, lng: pos.longitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={markerOffset}
            >
              <div
                onMouseEnter={() => setHoveredDevice(device)}
                onMouseLeave={() => setHoveredDevice(null)}
                style={{
                  position: "relative",
                  width: markerSize + 18,
                  height: markerSize + 24,
                  overflow: "visible",
                  pointerEvents: "auto",
                }}
              >
                {console.log(pos.direction)}
                
                <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}>
                  <VehicleMarker
                    type={device.category}
                    size={markerSize}
                    fill={getColor(eff)}
                    heading={pos.direction || 0}
                    label={eff ? `${eff}%` : "0"}
                  />
                </div>

                {hoveredDevice?.flespiId === device.flespiId && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: `${cardOffset}px`,
                      transform: "translate(-50%, 0)",
                      pointerEvents: "auto",
                    }}
                  >
                    <TruckInfoCard device={device} kpi={kpi} />
                  </div>
                )}
              </div>
            </OverlayView>
          );
        })}
      </GoogleMap>

      <MapControlRail
        cycleMapType={cycleMapType}
        centerOnOperation={centerOnOperation}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        toggle3D={toggle3D}
        rotate3D={rotate3D}
      />
    </Box>
  );
}
