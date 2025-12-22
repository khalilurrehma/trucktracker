import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import {
  area as turfArea,
  bbox as turfBbox,
  circle as turfCircle,
  distance as turfDistance,
  point as turfPoint,
} from "@turf/turf";
import LocationSearchBox from "@/operations/components/LocationSearchBox";
import drawTheme from "@/map/draw/theme";


const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
const DEFAULT_CENTER = [-77.0429985, -12.021129];
const STYLE_PRESETS = [
  { id: "streets", label: "Streets", style: "mapbox://styles/mapbox/streets-v12" },
  { id: "light", label: "Light", style: "mapbox://styles/mapbox/light-v11" },
  { id: "dark", label: "Dark", style: "mapbox://styles/mapbox/dark-v11" },
  { id: "outdoors", label: "Outdoors", style: "mapbox://styles/mapbox/outdoors-v12" },
  { id: "satellite", label: "Satellite", style: "mapbox://styles/mapbox/satellite-streets-v12" },
];

const AdvancedGeofenceEditor = ({ value, onChange, circle }) => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const drawRef = useRef(null);
  const circleModeRef = useRef({ active: false, center: null });
  const [activeStyleId, setActiveStyleId] = useState("satellite");
  const [showBuildings, setShowBuildings] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  const activeStyle = useMemo(
    () => STYLE_PRESETS.find((item) => item.id === activeStyleId)?.style,
    [activeStyleId]
  );

  const parseGeo = (geo) => {
    if (!geo) return null;
    if (typeof geo === "string") {
      try {
        return JSON.parse(geo);
      } catch (e) {
        return null;
      }
    }
    return geo;
  };

  const fitToGeometry = (geometry) => {
    if (!mapRef.current || !geometry) return;
    const [minLng, minLat, maxLng, maxLat] = turfBbox(geometry);
    mapRef.current.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 60, duration: 700 }
    );
  };

  const setDrawnGeometry = useCallback((geometry) => {
    if (!drawRef.current || !geometry) return;
    drawRef.current.deleteAll();
    drawRef.current.add({
      type: "Feature",
      properties: {},
      geometry,
    });
    fitToGeometry(geometry);
  }, []);

  const emitGeometryChange = useCallback((geometry) => {
    if (!geometry) {
      onChange({ geometry: null, area_sqm: null, area_ha: null });
      return;
    }
    const area_sqm = turfArea(geometry);
    onChange({
      geometry,
      area_sqm,
      area_ha: area_sqm / 10000,
    });
  }, [onChange]);

  const handleCircleMove = useCallback((event) => {
    const map = mapRef.current;
    if (!map || !circleModeRef.current.active || !circleModeRef.current.center) return;
    const { lng, lat } = event.lngLat;
    const [centerLng, centerLat] = circleModeRef.current.center;
    const radius = turfDistance(
      turfPoint([centerLng, centerLat]),
      turfPoint([lng, lat]),
      { units: "meters" }
    );
    const geometry = turfCircle([centerLng, centerLat], radius, {
      units: "meters",
      steps: 80,
    });
    if (!map.getSource("circle-preview")) {
      map.addSource("circle-preview", {
        type: "geojson",
        data: geometry,
      });
      map.addLayer({
        id: "circle-preview",
        type: "fill",
        source: "circle-preview",
        paint: {
          "fill-color": "#38bdf8",
          "fill-opacity": 0.2,
        },
      });
    } else {
      map.getSource("circle-preview").setData(geometry);
    }
  }, []);

  const handleCircleClick = useCallback((event) => {
    const map = mapRef.current;
    if (!map || !circleModeRef.current.active) return;
    const { lng, lat } = event.lngLat;
    if (!circleModeRef.current.center) {
      circleModeRef.current.center = [lng, lat];
      return;
    }

    const [centerLng, centerLat] = circleModeRef.current.center;
    const radius = turfDistance(
      turfPoint([centerLng, centerLat]),
      turfPoint([lng, lat]),
      { units: "meters" }
    );
    const geometry = turfCircle([centerLng, centerLat], radius, {
      units: "meters",
      steps: 80,
    }).geometry;

    setDrawnGeometry(geometry);
    emitGeometryChange(geometry);
    circleModeRef.current = { active: false, center: null };
    map.getCanvas().style.cursor = "";
    map.off("mousemove", handleCircleMove);
    map.off("click", handleCircleClick);
    if (map.getLayer("circle-preview")) map.removeLayer("circle-preview");
    if (map.getSource("circle-preview")) map.removeSource("circle-preview");
  }, [emitGeometryChange, handleCircleMove, setDrawnGeometry]);

  useEffect(() => {
    setPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!drawRef.current) return;
    const g = parseGeo(value?.geometry);
    if (g?.type === "Polygon" || g?.type === "MultiPolygon") {
      setDrawnGeometry(g);
    }
  }, [value, setDrawnGeometry]);

  useEffect(() => {
    if (!circle) return;

    const { lat, lng, radius } = circle;
    if (!lat || !lng || !radius) return;

    const geometry = turfCircle([lng, lat], radius, { units: "meters", steps: 80 })
      .geometry;
    setDrawnGeometry(geometry);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, speed: 0.9 });
    emitGeometryChange(geometry);
  }, [circle, emitGeometryChange, setDrawnGeometry]);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: activeStyle || "mapbox://styles/mapbox/satellite-streets-v12",
      center: DEFAULT_CENTER,
      zoom: 15.5,
      pitch: 58,
      bearing: -18,
      antialias: true,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-left");

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      styles: drawTheme,
    });

    map.addControl(draw, "top-left");
    drawRef.current = draw;

    const attachCircleButton = () => {
      const container = map.getContainer();
      if (!container) return;
      const groups = container.querySelectorAll(
        ".mapboxgl-ctrl-top-left .mapboxgl-ctrl-group"
      );
      const drawGroup = groups[groups.length - 1];
      if (!drawGroup || drawGroup.querySelector(".circle-draw-button")) return;

      const button = document.createElement("button");
      button.type = "button";
      button.title = "Draw circle";
      button.className = "circle-draw-button";
      button.style.display = "grid";
      button.style.placeItems = "center";
      button.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="1.5"><circle cx="12" cy="12" r="6.5" /><path d="M6 17l6-10 6 10z" fill="none" /></svg>';
      button.onclick = () => {
        if (circleModeRef.current.active) {
          cancelCircleMode();
        } else {
          startCircleMode();
        }
      };

      drawGroup.appendChild(button);
    };

    const removeControlGroup = (group) => {
      const parent = group.parentElement;
      group.remove();
      if (parent && parent.classList.contains("mapboxgl-ctrl")) {
        if (parent.childElementCount === 0) {
          parent.remove();
        }
      }
    };

    const mergeControlGroups = () => {
      const container = map.getContainer();
      if (!container) return;
      const groups = container.querySelectorAll(
        ".mapboxgl-ctrl-top-left .mapboxgl-ctrl-group"
      );
      if (groups.length < 2) return;
      const firstGroup = groups[0];
      for (let i = 1; i < groups.length; i += 1) {
        const group = groups[i];
        while (group.firstChild) {
          firstGroup.appendChild(group.firstChild);
        }
        removeControlGroup(group);
      }
    };
    const mergeControlGroupsWithRetry = () => {
      mergeControlGroups();
      setTimeout(mergeControlGroups, 0);
      setTimeout(mergeControlGroups, 50);
    };

    const startControlObserver = () => {
      const container = map.getContainer();
      if (!container) return null;
      const target = container.querySelector(".mapboxgl-ctrl-top-left");
      if (!target) return null;
      const observer = new MutationObserver(() => {
        mergeControlGroups();
        attachCircleButton();
      });
      observer.observe(target, { childList: true, subtree: true });
      return observer;
    };

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
          layout: {
            visibility: showBuildings ? "visible" : "none",
          },
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

    let controlObserver = null;

    map.on("load", () => {
      addBuildingLayer();
      attachCircleButton();
      mergeControlGroupsWithRetry();
      controlObserver = startControlObserver();
      const g = parseGeo(value?.geometry);
      if (g?.type === "Polygon" || g?.type === "MultiPolygon") {
        setDrawnGeometry(g);
      }
    });

    const syncDraw = () => {
      const data = draw.getAll();
      const feature = data.features[0];
      emitGeometryChange(feature?.geometry || null);
    };

    const handleDrawCreate = (event) => {
      const created = event.features?.[0];
      const all = draw.getAll();
      if (created && all.features.length > 1) {
        all.features
          .filter((feature) => feature.id !== created.id)
          .forEach((feature) => draw.delete(feature.id));
      }
      syncDraw();
    };

    map.on("draw.create", handleDrawCreate);
    map.on("draw.update", syncDraw);
    map.on("draw.delete", syncDraw);

    map.on("style.load", () => {
      addBuildingLayer();
      attachCircleButton();
      mergeControlGroupsWithRetry();
      if (map.getLayer("3d-buildings")) {
        map.setLayoutProperty(
          "3d-buildings",
          "visibility",
          showBuildings ? "visible" : "none"
        );
      }
    });

    return () => {
      controlObserver?.disconnect();
      map.off("draw.create", handleDrawCreate);
      map.off("draw.update", syncDraw);
      map.off("draw.delete", syncDraw);
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [onChange, value]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeStyle) return;
    map.setStyle(activeStyle);
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

  const startCircleMode = () => {
    const map = mapRef.current;
    if (!map) return;
    if (circleModeRef.current.active) return;
    drawRef.current?.changeMode("simple_select");
    circleModeRef.current = { active: true, center: null };
    map.getCanvas().style.cursor = "crosshair";
    map.on("click", handleCircleClick);
    map.on("mousemove", handleCircleMove);
  };

  const cancelCircleMode = () => {
    const map = mapRef.current;
    if (!map) return;
    circleModeRef.current = { active: false, center: null };
    map.getCanvas().style.cursor = "";
    map.off("click", handleCircleClick);
    map.off("mousemove", handleCircleMove);
    if (map.getLayer("circle-preview")) map.removeLayer("circle-preview");
    if (map.getSource("circle-preview")) map.removeSource("circle-preview");
  };

  const toggleFullscreen = () => {
    const container = mapRef.current?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    container.requestFullscreen?.();
  };

  return (
    <div
      style={{
        marginTop: 20,
        position: "relative",
        borderRadius: 16,
        padding: 10,
        background:
          "linear-gradient(145deg, rgba(16,24,40,0.8), rgba(15,23,42,0.9))",
        boxShadow: "0 14px 30px rgba(15,23,42,0.35)",
      }}
    >
      <style>
        {`
          .mapboxgl-ctrl-top-left {
            margin: 8px !important;
          }
          .mapboxgl-ctrl-group {
            border-radius: 10px !important;
            box-shadow: 0 10px 22px rgba(15,23,42,0.3);
          }
          .mapboxgl-ctrl-top-left .mapboxgl-ctrl-group {
            margin: 0 !important;
          }
          .mapboxgl-ctrl-top-left .mapboxgl-ctrl-group + .mapboxgl-ctrl-group {
            border-top-left-radius: 0 !important;
            border-top-right-radius: 0 !important;
            box-shadow: none;
            border-top: 1px solid rgba(148,163,184,0.35);
          }
          .mapboxgl-ctrl-top-left .mapboxgl-ctrl-group:not(:last-child) {
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
          }
          .mapboxgl-ctrl-group .circle-draw-button {
            border-top: 1px solid rgba(148,163,184,0.35);
          }
        `}
      </style>
      <LocationSearchBox mapRef={mapRef} />

      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 99999,
          width: panelOpen ? 220 : 96,
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
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Fullscreen"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.8)",
              color: "#e2e8f0",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 9V4h5" />
              <path d="M20 9V4h-5" />
              <path d="M4 15v5h5" />
              <path d="M20 15v5h-5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setPanelOpen((prev) => !prev)}
            title="Layers"
            style={{
              flex: 1,
              height: 32,
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.8)",
              color: "#e2e8f0",
              fontWeight: 600,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3 3 8l9 5 9-5-9-5z" />
              <path d="M3 12l9 5 9-5" />
              <path d="M3 16l9 5 9-5" />
            </svg>
          </button>
        </div>

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

      <div
        ref={mapContainerRef}
        style={{
          height: 560,
          borderRadius: 16,
          border: "1px solid rgba(148,163,184,0.25)",
          overflow: "hidden",
        }}
      />
    </div>
  );
};

export default AdvancedGeofenceEditor;
