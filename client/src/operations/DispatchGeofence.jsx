import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createRoot } from "react-dom/client";
import { bbox as turfBbox, circle as turfCircle, featureCollection } from "@turf/turf";

import TruckInfoCard from "@/operations/components/TruckInfoCard";
import VehicleMarker from "@/operations/components/VehicleMarker";
import AlertsPanel from "@/operations/components/AlertsPanel";

import { getOperationById } from "@/apis/operationApi";
import { getZonesByOperationId } from "@/apis/zoneApi";
import {
  getDevicesByPositionOperation,
  fetchOperationKPI,
} from "@/apis/deviceAssignmentApi";

import { useAppContext } from "@/AppContext";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

const STYLE_PRESETS = [
  { id: "streets", label: "Streets", style: "mapbox://styles/mapbox/streets-v12" },
  { id: "light", label: "Light", style: "mapbox://styles/mapbox/light-v11" },
  { id: "dark", label: "Dark", style: "mapbox://styles/mapbox/dark-v11" },
  { id: "outdoors", label: "Outdoors", style: "mapbox://styles/mapbox/outdoors-v12" },
  { id: "satellite", label: "Satellite", style: "mapbox://styles/mapbox/satellite-streets-v12" },
];

const colors = {
  QUEUE_AREA: "#e67e22",
  LOAD_PAD: "#27ae60",
  DUMP_AREA: "#c0392b",
  ZONE_AREA: "#3498db",
};

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const closeRing = (ring) => {
  if (!ring.length) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first];
  }
  return ring;
};

const polygonFromPath = (path) => {
  if (!Array.isArray(path) || !path.length) return null;
  const ring = path
    .map((point) => {
      if (Array.isArray(point)) {
        const lng = toFiniteNumber(point[0]);
        const lat = toFiniteNumber(point[1]);
        if (lng === null || lat === null) return null;
        return [lng, lat];
      }
      if (!point || typeof point !== "object") return null;
      const lng = toFiniteNumber(point.lon ?? point.lng);
      const lat = toFiniteNumber(point.lat);
      if (lng === null || lat === null) return null;
      return [lng, lat];
    })
    .filter(Boolean);
  if (!ring.length) return null;
  return {
    type: "Polygon",
    coordinates: [closeRing(ring)],
  };
};

const circleFromCenter = (center, radius, units = "meters") => {
  if (!center) return null;
  let lng = null;
  let lat = null;
  if (Array.isArray(center)) {
    lng = toFiniteNumber(center[0]);
    lat = toFiniteNumber(center[1]);
  } else if (typeof center === "object") {
    lng = toFiniteNumber(center.lon ?? center.lng);
    lat = toFiniteNumber(center.lat);
  }
  const rad = toFiniteNumber(radius);
  if (lng === null || lat === null || rad === null) return null;
  return turfCircle([lng, lat], rad, { units, steps: 80 }).geometry;
};

const normalizeCoordinatePair = (pair) => {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  const lng = toFiniteNumber(pair[0]);
  const lat = toFiniteNumber(pair[1]);
  if (lng === null || lat === null) return null;
  return [lng, lat];
};

const normalizeRing = (ring) => {
  if (!Array.isArray(ring)) return null;
  const cleaned = ring.map(normalizeCoordinatePair).filter(Boolean);
  if (cleaned.length < 3) return null;
  return closeRing(cleaned);
};

const normalizePolygonCoords = (coords) => {
  if (!Array.isArray(coords) || !coords.length) return null;
  const rings = coords.map(normalizeRing).filter(Boolean);
  return rings.length ? rings : null;
};

const normalizeMultiPolygonCoords = (coords) => {
  if (!Array.isArray(coords) || !coords.length) return null;
  const polygons = coords
    .map((polygon) => normalizePolygonCoords(polygon))
    .filter(Boolean);
  return polygons.length ? polygons : null;
};

const normalizeGeometry = (geo) => {
  if (!geo || typeof geo !== "object") return null;
  const type = typeof geo.type === "string" ? geo.type.toLowerCase() : "";
  if (type === "point") {
    const coord = normalizeCoordinatePair(geo.coordinates);
    return coord ? { ...geo, coordinates: coord } : null;
  }
  if (type === "linestring") {
    const coords = Array.isArray(geo.coordinates)
      ? geo.coordinates.map(normalizeCoordinatePair).filter(Boolean)
      : null;
    return coords && coords.length >= 2 ? { ...geo, coordinates: coords } : null;
  }
  if (type === "polygon") {
    const coords = normalizePolygonCoords(geo.coordinates);
    return coords ? { ...geo, coordinates: coords } : null;
  }
  if (type === "multipolygon") {
    const coords = normalizeMultiPolygonCoords(geo.coordinates);
    return coords ? { ...geo, coordinates: coords } : null;
  }
  return geo;
};

const toGeometry = (value) => {
  if (!value) return null;
  let geo = value;
  if (typeof geo === "string") {
    try {
      geo = JSON.parse(geo);
    } catch {
      return null;
    }
  }
  if (typeof geo === "string") {
    try {
      geo = JSON.parse(geo);
    } catch {
      return null;
    }
  }
  if (geo?.type === "Feature") return toGeometry(geo.geometry);
  if (geo?.type === "FeatureCollection") return toGeometry(geo.features?.[0]?.geometry);
  if (geo?.type === "GeometryCollection") return toGeometry(geo.geometries?.[0]);
  if (geo?.geometry) return toGeometry(geo.geometry);
  if (geo?.path) return normalizeGeometry(polygonFromPath(geo.path));

  const type = typeof geo?.type === "string" ? geo.type.toLowerCase() : "";
  if (type === "circle" || geo?.center || geo?.centre) {
    const center = geo.center || geo.centre || geo.coordinates;
    const units = geo.units || "meters";
    return normalizeGeometry(circleFromCenter(center, geo.radius, units));
  }
  if (type === "polygon" || type === "multipolygon") return normalizeGeometry(geo);
  return normalizeGeometry(geo);
};

export default function OperationWithZonesMap() {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef(new Map());
  const hasFitBounds = useRef(false);
  const renderLayersRef = useRef(null);
  const renderMarkersRef = useRef(null);
  const [activeStyleId, setActiveStyleId] = useState("satellite");
  const [showBuildings, setShowBuildings] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [operation, setOperation] = useState(null);
  const [zones, setZones] = useState([]);
  const [devices, setDevices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [deviceKPI, setDeviceKPI] = useState({});
  const [hoveredDeviceId, setHoveredDeviceId] = useState(null);
  const [activeZone, setActiveZone] = useState(null);
  const [deviceRenderTick, setDeviceRenderTick] = useState(0);

  const { mqttDeviceLiveLocation, mqttMessages } = useAppContext();
  const operationId = new URLSearchParams(window.location.search).get("id");

  const activeStyle = useMemo(
    () => STYLE_PRESETS.find((item) => item.id === activeStyleId)?.style,
    [activeStyleId]
  );

  useEffect(() => {
    hasFitBounds.current = false;
  }, [operationId]);

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    const load = async () => {
      if (!operationId) return;

      const op = await getOperationById(operationId);
      const zoneList = await getZonesByOperationId(operationId);
      const deviceList = await getDevicesByPositionOperation(op.id);

      const devicesArray = deviceList?.devices || [];
      setDevices(devicesArray);

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

      setOperation({
        ...op,
        geometry: toGeometry(op.geometry),
      });

      setZones(
        zoneList.map((z) => ({
          ...z,
          geometry: toGeometry(z.geometry),
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
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: activeStyle || "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-77.0429985, -12.021129],
      zoom: 12,
      pitch: 52,
      bearing: -18,
      antialias: true,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-left");

    const addBuildingLayer = () => {
      if (map.getLayer("3d-buildings")) return;
      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          layout: { visibility: showBuildings ? "visible" : "none" },
          paint: {
            "fill-extrusion-color": "#cdd6e0",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.72,
          },
        },
        "waterway-label"
      );
    };

    const handleLoad = () => {
      addBuildingLayer();
      setMapReady(true);
      setDeviceRenderTick((prev) => prev + 1);
    };

    map.on("load", handleLoad);

    const handleStyleLoad = () => {
      addBuildingLayer();
      setDeviceRenderTick((prev) => prev + 1);
    };

    map.on("style.load", handleStyleLoad);

    return () => {
      map.off("load", handleLoad);
      map.off("style.load", handleStyleLoad);
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [showBuildings]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeStyle) return;
    hasFitBounds.current = false;
    map.setStyle(activeStyle);
    const handleStyleLoad = () => {
      hasFitBounds.current = false;
      renderLayersRef.current?.();
      renderMarkersRef.current?.();
    };
    map.once("style.load", handleStyleLoad);
    return () => {
      map.off("style.load", handleStyleLoad);
    };
  }, [activeStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("3d-buildings")) return;
    map.setLayoutProperty(
      "3d-buildings",
      "visibility",
      showBuildings ? "visible" : "none"
    );
  }, [showBuildings]);

  /* ---------------- DRAW OPERATION + ZONES ---------------- */
  useEffect(() => {
    const map = mapRef.current;
    const opGeometry = toGeometry(operation?.geometry);
    if (!opGeometry || !map || !mapReady) return;

    const renderLayers = () => {
      const operationFeature = {
        type: "Feature",
        properties: { name: operation.name || "Operation" },
        geometry: opGeometry,
      };

      const zoneFeatures = zones
        .map((zone) => ({
          ...zone,
          geometry: toGeometry(zone.geometry),
        }))
        .filter((zone) => zone.geometry)
        .map((zone) => ({
          type: "Feature",
          properties: { zoneId: zone.id, zoneType: zone.zoneType, name: zone.name },
          geometry: zone.geometry,
        }));

      const opData = featureCollection([operationFeature]);
      const zoneData = featureCollection(zoneFeatures);

      if (!map.getSource("operation-boundary")) {
        map.addSource("operation-boundary", { type: "geojson", data: opData });
      } else {
        map.getSource("operation-boundary").setData(opData);
      }
      if (!map.getLayer("operation-boundary-fill")) {
        map.addLayer({
          id: "operation-boundary-fill",
          type: "fill",
          source: "operation-boundary",
          paint: { "fill-color": "#8e44ad", "fill-opacity": 0.12 },
        });
      }
      if (!map.getLayer("operation-boundary-line")) {
        map.addLayer({
          id: "operation-boundary-line",
          type: "line",
          source: "operation-boundary",
          paint: { "line-color": "#8e44ad", "line-width": 3, "line-opacity": 0.9 },
        });
      }
      if (!map.getLayer("operation-boundary-label")) {
        map.addLayer({
          id: "operation-boundary-label",
          type: "symbol",
          source: "operation-boundary",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 14,
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": "#f8fafc",
            "text-halo-color": "#0f172a",
            "text-halo-width": 1.5,
          },
        });
      }

      if (!map.getSource("operation-zones")) {
        map.addSource("operation-zones", { type: "geojson", data: zoneData });
      } else {
        map.getSource("operation-zones").setData(zoneData);
      }
      if (!map.getLayer("operation-zones-fill")) {
        map.addLayer({
          id: "operation-zones-fill",
          type: "fill",
          source: "operation-zones",
          paint: {
            "fill-color": [
              "match",
              ["get", "zoneType"],
              "QUEUE_AREA",
              colors.QUEUE_AREA,
              "LOAD_PAD",
              colors.LOAD_PAD,
              "DUMP_AREA",
              colors.DUMP_AREA,
              "ZONE_AREA",
              colors.ZONE_AREA,
              "#999999",
            ],
            "fill-opacity": [
              "case",
              ["==", ["get", "zoneId"], activeZone],
              0.35,
              0.22,
            ],
          },
        });
      }
      if (!map.getLayer("operation-zones-line")) {
        map.addLayer({
          id: "operation-zones-line",
          type: "line",
          source: "operation-zones",
          paint: {
            "line-color": [
              "match",
              ["get", "zoneType"],
              "QUEUE_AREA",
              colors.QUEUE_AREA,
              "LOAD_PAD",
              colors.LOAD_PAD,
              "DUMP_AREA",
              colors.DUMP_AREA,
              "ZONE_AREA",
              colors.ZONE_AREA,
              "#999999",
            ],
            "line-width": [
              "case",
              ["==", ["get", "zoneId"], activeZone],
              4,
              2,
            ],
          },
        });
      }
      if (!map.getLayer("operation-zones-label")) {
        map.addLayer({
          id: "operation-zones-label",
          type: "symbol",
          source: "operation-zones",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 12,
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": "#f8fafc",
            "text-halo-color": "#0f172a",
            "text-halo-width": 1.25,
          },
        });
      }
      if (map.getLayer("operation-boundary-line")) {
        map.moveLayer("operation-boundary-line");
      }
      if (map.getLayer("operation-boundary-label")) {
        map.moveLayer("operation-boundary-label");
      }

      if (!hasFitBounds.current) {
        const bounds = turfBbox(opGeometry);
        map.fitBounds(
          [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]],
          ],
          { padding: 80, duration: 700 }
        );
        hasFitBounds.current = true;
      }
    };

    renderLayersRef.current = renderLayers;
    renderLayers();
    map.on("style.load", renderLayers);

    return () => {
      map.off("style.load", renderLayers);
    };
  }, [operation, zones, activeZone, mapReady]);

  /* ---------------- DEVICE MARKERS ---------------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const renderMarkers = () => {
      if (!map.isStyleLoaded()) {
        map.once("idle", renderMarkers);
        return;
      }

      const nextIds = new Set(devicesWithPos.map((dev) => `dev-${dev.id}`));
      markersRef.current.forEach((marker, id) => {
        if (!nextIds.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      });

      devicesWithPos.forEach((dev) => {
        if (!dev.lat || !dev.lon) return;
        const id = `dev-${dev.id}`;
        let marker = markersRef.current.get(id);

        if (!marker) {
          const el = document.createElement("div");
          marker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([dev.lon, dev.lat])
            .addTo(map);
          markersRef.current.set(id, marker);

          const root = createRoot(el);
          el._reactRoot = root;
        } else {
          marker.setLngLat([dev.lon, dev.lat]);
        }

        const el = marker.getElement();
        const root = el._reactRoot;
        if (!root) return;

        root.render(
          <div
            style={{
              position: "relative",
              width: 60,
              height: 80,
              textAlign: "center",
            }}
            onMouseEnter={() => setHoveredDeviceId(dev.id)}
            onMouseLeave={() => setHoveredDeviceId(null)}
          >
            {hoveredDeviceId === dev.id && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translate(-50%, -12px)",
                  pointerEvents: "none",
                  zIndex: 9999,
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
              heading={dev.direction || 0}
              direction={dev.direction}
            />
          </div>
        );
      });
    };

    renderMarkersRef.current = renderMarkers;
    renderMarkers();
  }, [devicesWithPos, hoveredDeviceId, deviceKPI, deviceRenderTick]);

  /* ---------------- FOCUS ZONE ---------------- */
  const focusZone = (zone) => {
    const map = mapRef.current;
    const geometry = toGeometry(zone?.geometry);
    if (!map || !geometry) return;
    const bounds = turfBbox(geometry);
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      { padding: 60, duration: 600 }
    );
    setActiveZone(zone.id);
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
            Back
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
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <div
            ref={mapContainerRef}
            style={{ height: "100%", width: "100%" }}
          />

          <div
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              zIndex: 9999,
              width: panelOpen ? 220 : 44,
              padding: panelOpen ? 12 : 6,
              borderRadius: 14,
              background: "rgba(15,23,42,0.65)",
              border: "1px solid rgba(148,163,184,0.2)",
              backdropFilter: "blur(10px)",
              color: "#e2e8f0",
              fontSize: 13,
              transition: "width 0.2s ease",
            }}
          >
            <button
              type="button"
              onClick={() => setPanelOpen((prev) => !prev)}
              style={{
                width: "100%",
                height: 32,
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(15,23,42,0.8)",
                color: "#e2e8f0",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {panelOpen ? "Hide" : "Layers"}
            </button>

            {panelOpen && (
              <>
                <div style={{ fontWeight: 600, margin: "10px 0 8px" }}>Map Styles</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {STYLE_PRESETS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveStyleId(item.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid rgba(148,163,184,0.3)",
                        background:
                          activeStyleId === item.id
                            ? "linear-gradient(120deg, #38bdf8, #0ea5e9)"
                            : "rgba(15,23,42,0.8)",
                        color: activeStyleId === item.id ? "#0f172a" : "#e2e8f0",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 12, fontWeight: 600 }}>Layers</div>
                <label
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showBuildings}
                    onChange={(event) => setShowBuildings(event.target.checked)}
                  />
                  3D Buildings
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999 }}>
        <AlertsPanel mqttMessages={mqttMessages} />
      </div>
    </>
  );
}
