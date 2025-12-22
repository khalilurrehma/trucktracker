import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import Swal from "sweetalert2";
import {
  area as turfArea,
  bbox as turfBbox,
  booleanPointInPolygon,
  center as turfCenter,
  circle as turfCircle,
  distance as turfDistance,
  featureCollection as turfFeatureCollection,
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
const ZONE_COLORS = {
  QUEUE_AREA: "#2196F3",
  LOAD_PAD: "#4CAF50",
  DUMP_AREA: "#F44336",
  ZONE_AREA: "#9C27B0",
};

const GeofenceZoneEditor = ({
  value,
  parentBoundary,
  otherGeofences = [],
  onChange,
  zoneType,
  circle,
}) => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const drawRef = useRef(null);
  const circleModeRef = useRef({ active: false, center: null });
  const labelRef = useRef(null);
  const lastValidGeometryRef = useRef(null);
  const parentDebugMarkerRef = useRef(null);
  const hasFitBoundsRef = useRef(false);
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

  const normalizeGeometry = (geo) => {
    if (!geo) return null;
    if (geo.type === "Feature") return geo.geometry || null;
    if (geo.type === "FeatureCollection") {
      return geo.features?.[0]?.geometry || null;
    }
    if (geo.geometry) return geo.geometry;
    if (geo.geofence?.geometry) return geo.geofence.geometry;
    return geo;
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

  const circleFromCenter = (center, radius, units) => {
    if (!center) return null;
    const lng = toFiniteNumber(center.lon ?? center.lng ?? center[0]);
    const lat = toFiniteNumber(center.lat ?? center[1]);
    const rad = toFiniteNumber(radius);
    if (lng === null || lat === null || rad === null) return null;
    return turfCircle([lng, lat], rad, { units, steps: 80 }).geometry;
  };

  const extractGeofenceGeometries = (geo) => {
    if (!geo) return [];
    if (geo.type === "FeatureCollection") {
      return (geo.features || []).flatMap((feature) =>
        extractGeofenceGeometries(feature)
      );
    }
    if (geo.type === "Feature") {
      return extractGeofenceGeometries(geo.geometry);
    }
    if (geo.type === "GeometryCollection") {
      return (geo.geometries || []).flatMap((geometry) =>
        extractGeofenceGeometries(geometry)
      );
    }

    if (geo.path) {
      const polygon = polygonFromPath(geo.path);
      return polygon ? [polygon] : [];
    }

    const type = typeof geo.type === "string" ? geo.type.toLowerCase() : "";
    if (type === "polygon" || type === "multipolygon") {
      return [geo];
    }

    if (type === "circle" || geo.center || geo.centre) {
      const center = geo.center || geo.centre;
      const circleGeo = center
        ? circleFromCenter(center, geo.radius, "kilometers")
        : circleFromCenter(geo.coordinates, geo.radius, "meters");
      return circleGeo ? [circleGeo] : [];
    }

    if (geo.type === "Point" && Array.isArray(geo.coordinates)) {
      const pointCircle = circleFromCenter(geo.coordinates, 40, "meters");
      return pointCircle ? [pointCircle] : [];
    }

    if (geo.geometry) return extractGeofenceGeometries(geo.geometry);
    if (geo.geofence?.geometry) return extractGeofenceGeometries(geo.geofence.geometry);
    return [];
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
      properties: { zoneType },
      geometry,
    });
    fitToGeometry(geometry);
  }, [zoneType]);

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

  const updateLabel = useCallback((geometry, name, color) => {
    const map = mapRef.current;
    if (!map || !geometry) return;
    const center = turfCenter(geometry).geometry.coordinates;
    if (labelRef.current) labelRef.current.remove();

    const markerEl = document.createElement("div");
    markerEl.style.color = color;
    markerEl.style.fontSize = "16px";
    markerEl.style.fontWeight = "700";
    markerEl.style.textShadow = "1px 1px 2px #000";
    markerEl.textContent = name || "";

    labelRef.current = new mapboxgl.Marker({
      element: markerEl,
      anchor: "center",
    })
      .setLngLat(center)
      .addTo(map);
  }, []);

  const buildParentFeatureCollection = useCallback(() => {
    const rawParent = parseGeo(parentBoundary);
    const parentGeo = normalizeGeometry(rawParent);
    console.log("[GeofenceZoneEditor] parentBoundary raw:", parentBoundary);
    console.log("[GeofenceZoneEditor] parentBoundary parsed:", rawParent);
    console.log("[GeofenceZoneEditor] parentBoundary normalized:", parentGeo);
    if (!parentGeo) return null;
    const features = [];
    if (parentGeo.type === "Polygon" || parentGeo.type === "MultiPolygon") {
      features.push({ type: "Feature", geometry: parentGeo, properties: {} });
    } else if (parentGeo.type === "Circle") {
      const [lng, lat] = parentGeo.coordinates;
      features.push(
        turfCircle([lng, lat], parentGeo.radius, { units: "meters", steps: 80 })
      );
    } else if (parentGeo.type === "Point") {
      const [lng, lat] = parentGeo.coordinates;
      features.push(turfCircle([lng, lat], 40, { units: "meters", steps: 80 }));
    }
    const featureCollection = features.length ? turfFeatureCollection(features) : null;
    console.log("[GeofenceZoneEditor] parentBoundary featureCollection:", featureCollection);
    return featureCollection;
  }, [parentBoundary]);

  const buildParentVertexCollection = useCallback(() => {
    const parentGeo = normalizeGeometry(parseGeo(parentBoundary));
    if (!parentGeo) return null;
    let coords = [];
    if (parentGeo.type === "Polygon") {
      coords = parentGeo.coordinates?.[0] || [];
    } else if (parentGeo.type === "MultiPolygon") {
      coords = parentGeo.coordinates?.[0]?.[0] || [];
    }
    if (!coords.length) return null;
    return turfFeatureCollection(
      coords.map((coord) => ({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: coord },
      }))
    );
  }, [parentBoundary]);

  const buildOtherGeofencesFeatureCollection = useCallback(() => {
    const features = otherGeofences.flatMap((gf) => {
      const geometry = parseGeo(gf?.geometry || gf?.geofence?.geometry || gf);
      if (!geometry) return [];
      const zone = gf.zoneType || gf.zone_type || null;
      return extractGeofenceGeometries(geometry).map((item) => ({
        type: "Feature",
        properties: { zoneType: zone },
        geometry: item,
      }));
    });
    const collection = features.length ? turfFeatureCollection(features) : null;
    console.log("[GeofenceZoneEditor] otherGeofences input:", otherGeofences);
    console.log(
      "[GeofenceZoneEditor] otherGeofences features:",
      collection?.features?.length || 0
    );
    return collection;
  }, [otherGeofences]);

  const updateParentBoundaryLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      setTimeout(() => {
        if (mapRef.current) updateParentBoundaryLayer();
      }, 100);
      return;
    }
    const data = buildParentFeatureCollection();
    if (!data) return;
    const vertexData = buildParentVertexCollection();
    const source = map.getSource("parent-boundary");
    if (!source) {
      map.addSource("parent-boundary", { type: "geojson", data });
    } else {
      source.setData(data);
    }

    const beforeId = map.getLayer("waterway-label") ? "waterway-label" : undefined;

    if (!map.getLayer("parent-boundary-fill")) {
      map.addLayer({
        id: "parent-boundary-fill",
        type: "fill",
        source: "parent-boundary",
        paint: {
          "fill-color": "#f97316",
          "fill-opacity": 0.24,
        },
      }, beforeId);
    }

    if (!map.getLayer("parent-boundary-line")) {
      map.addLayer({
        id: "parent-boundary-line",
        type: "line",
        source: "parent-boundary",
        paint: {
          "line-color": "#fbbf24",
          "line-width": 5,
          "line-opacity": 1,
        },
      }, beforeId);
    }

    if (vertexData) {
      const vertexSource = map.getSource("parent-boundary-vertices");
      if (!vertexSource) {
        map.addSource("parent-boundary-vertices", {
          type: "geojson",
          data: vertexData,
        });
      } else {
        vertexSource.setData(vertexData);
      }
      if (!map.getLayer("parent-boundary-vertices")) {
        map.addLayer({
          id: "parent-boundary-vertices",
          type: "circle",
          source: "parent-boundary-vertices",
          paint: {
            "circle-radius": 4,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#f59e0b",
            "circle-stroke-width": 2,
          },
        }, beforeId);
      }
    }
    const otherData = buildOtherGeofencesFeatureCollection() || turfFeatureCollection([]);
    if (!map.getSource("other-geofences")) {
      map.addSource("other-geofences", { type: "geojson", data: otherData });
      map.addLayer({
        id: "other-geofences-fill",
        type: "fill",
        source: "other-geofences",
        paint: {
          "fill-color": [
            "match",
            ["get", "zoneType"],
            "QUEUE_AREA",
            ZONE_COLORS.QUEUE_AREA,
            "LOAD_PAD",
            ZONE_COLORS.LOAD_PAD,
            "DUMP_AREA",
            ZONE_COLORS.DUMP_AREA,
            "ZONE_AREA",
            ZONE_COLORS.ZONE_AREA,
            "#999999",
          ],
          "fill-opacity": 0.12,
        },
      }, beforeId);
      map.addLayer({
        id: "other-geofences-line",
        type: "line",
        source: "other-geofences",
        paint: {
          "line-color": [
            "match",
            ["get", "zoneType"],
            "QUEUE_AREA",
            ZONE_COLORS.QUEUE_AREA,
            "LOAD_PAD",
            ZONE_COLORS.LOAD_PAD,
            "DUMP_AREA",
            ZONE_COLORS.DUMP_AREA,
            "ZONE_AREA",
            ZONE_COLORS.ZONE_AREA,
            "#999999",
          ],
          "line-width": 3,
          "line-opacity": 0.9,
          "line-dasharray": [2, 2],
        },
      }, beforeId);
    } else {
      map.getSource("other-geofences").setData(otherData);
    }
    const parentGeo = normalizeGeometry(parseGeo(parentBoundary));
    if (parentGeo?.type === "Polygon" && parentGeo.coordinates?.[0]?.[0]) {
      const [lng, lat] = parentGeo.coordinates[0][0];
      if (parentDebugMarkerRef.current) {
        parentDebugMarkerRef.current.setLngLat([lng, lat]);
      } else {
        const el = document.createElement("div");
        el.style.width = "10px";
        el.style.height = "10px";
        el.style.borderRadius = "50%";
        el.style.background = "#f97316";
        el.style.boxShadow = "0 0 0 6px rgba(249,115,22,0.25)";
        parentDebugMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    }
    if (!hasFitBoundsRef.current) {
      const bounds = turfBbox(data);
      map.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        { padding: 80, duration: 700 }
      );
      hasFitBoundsRef.current = true;
    }
  }, [buildOtherGeofencesFeatureCollection, buildParentFeatureCollection, buildParentVertexCollection, parentBoundary]);

  const getVertices = (geometry) => {
    if (!geometry?.coordinates) return [];
    if (geometry.type === "Polygon") return geometry.coordinates[0] || [];
    if (geometry.type === "MultiPolygon") return geometry.coordinates[0]?.[0] || [];
    return [];
  };

  const isInsideParent = useCallback((geometry) => {
    const rawParent = parseGeo(parentBoundary);
    const parentGeo = normalizeGeometry(rawParent);
    console.log("[GeofenceZoneEditor] isInsideParent raw:", parentBoundary);
    console.log("[GeofenceZoneEditor] isInsideParent parsed:", rawParent);
    console.log("[GeofenceZoneEditor] isInsideParent normalized:", parentGeo);
    if (!parentGeo || !geometry) return true;
    const points = getVertices(geometry);
    if (!points.length) return true;

    if (parentGeo.type === "Polygon") {
      return points.every((pt) => booleanPointInPolygon(turfPoint(pt), parentGeo));
    }

    if (parentGeo.type === "Circle") {
      const [lng, lat] = parentGeo.coordinates;
      const radius = parentGeo.radius;
      return points.every((pt) =>
        turfDistance(turfPoint([lng, lat]), turfPoint(pt), { units: "meters" }) <=
        radius
      );
    }

    if (parentGeo.type === "Point") {
      const [lng, lat] = parentGeo.coordinates;
      const radius = 40;
      return points.every((pt) =>
        turfDistance(turfPoint([lng, lat]), turfPoint(pt), { units: "meters" }) <=
        radius
      );
    }

    return true;
  },  [parentBoundary, value]);

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

    if (!isInsideParent(geometry)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Zone",
        text: "Zone must be completely inside the Operation.",
      });
      return;
    }

    setDrawnGeometry(geometry);
    emitGeometryChange(geometry);
    lastValidGeometryRef.current = geometry;
    updateLabel(geometry, value?.name, ZONE_COLORS[zoneType] || "#fff");

    circleModeRef.current = { active: false, center: null };
    map.getCanvas().style.cursor = "";
    map.off("mousemove", handleCircleMove);
    map.off("click", handleCircleClick);
    if (map.getLayer("circle-preview")) map.removeLayer("circle-preview");
    if (map.getSource("circle-preview")) map.removeSource("circle-preview");
  }, [emitGeometryChange, handleCircleMove, isInsideParent, setDrawnGeometry, updateLabel, value?.name, zoneType]);

  useEffect(() => {
    setPanelOpen(false);
  }, []);

  useEffect(() => {
    hasFitBoundsRef.current = false;
  }, [parentBoundary]);



  useEffect(() => {
    if (!drawRef.current) return;
    const g = parseGeo(value?.geometry);
    if (g?.type === "Polygon" || g?.type === "MultiPolygon") {
      setDrawnGeometry(g);
      lastValidGeometryRef.current = g;
      updateLabel(g, value?.name, ZONE_COLORS[zoneType] || "#fff");
    }
  }, [value, setDrawnGeometry, updateLabel, zoneType]);

  useEffect(() => {
    if (!circle) return;

    const { lat, lng, radius } = circle;
    if (!lat || !lng || !radius) return;

    const geometry = turfCircle([lng, lat], radius, { units: "meters", steps: 80 })
      .geometry;
    if (!isInsideParent(geometry)) {
      return;
    }
    setDrawnGeometry(geometry);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, speed: 0.9 });
    emitGeometryChange(geometry);
    lastValidGeometryRef.current = geometry;
    updateLabel(geometry, value?.name, ZONE_COLORS[zoneType] || "#fff");
  }, [circle, emitGeometryChange, isInsideParent, setDrawnGeometry, updateLabel, value?.name, zoneType]);

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

    const attachCircleButton = () => {
      const container = map.getContainer();
      if (!container) return;
      const group = container.querySelector(".mapboxgl-ctrl-top-left .mapboxgl-ctrl-group");
      if (!group || group.querySelector(".circle-draw-button")) return;

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

      group.appendChild(button);
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
      updateParentBoundaryLayer();
      mergeControlGroupsWithRetry();
      attachCircleButton();
      controlObserver = startControlObserver();
      const g = parseGeo(value?.geometry);
      if (g?.type === "Polygon" || g?.type === "MultiPolygon") {
        setDrawnGeometry(g);
        lastValidGeometryRef.current = g;
        updateLabel(g, value?.name, ZONE_COLORS[zoneType] || "#fff");
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
      const geometry = created?.geometry;
      if (geometry && !isInsideParent(geometry)) {
        Swal.fire({
          icon: "error",
          title: "Invalid Zone",
          text: "Zone must be completely inside the Operation.",
        });
        draw.delete(created.id);
        return;
      }
      if (geometry) {
        lastValidGeometryRef.current = geometry;
        updateLabel(geometry, value?.name, ZONE_COLORS[zoneType] || "#fff");
      }
      syncDraw();
    };

    const handleDrawUpdate = (event) => {
      const updated = event.features?.[0];
      const geometry = updated?.geometry;
      if (geometry && !isInsideParent(geometry)) {
        Swal.fire({
          icon: "error",
          title: "Invalid Zone",
          text: "Zone must be completely inside the Operation.",
        });
        if (lastValidGeometryRef.current) {
          setDrawnGeometry(lastValidGeometryRef.current);
        }
        return;
      }
      if (geometry) {
        lastValidGeometryRef.current = geometry;
        updateLabel(geometry, value?.name, ZONE_COLORS[zoneType] || "#fff");
      }
      syncDraw();
    };

    map.on("draw.create", handleDrawCreate);
    map.on("draw.update", handleDrawUpdate);
    map.on("draw.delete", syncDraw);

    map.on("style.load", () => {
      addBuildingLayer();
      updateParentBoundaryLayer();
      mergeControlGroupsWithRetry();
      attachCircleButton();
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
      map.off("draw.update", handleDrawUpdate);
      map.off("draw.delete", syncDraw);
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [onChange, setDrawnGeometry, updateLabel, value, zoneType, updateParentBoundaryLayer]);

  useEffect(() => {
    updateParentBoundaryLayer();
  }, [updateParentBoundaryLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !parentBoundary) return;
    if (map.isStyleLoaded()) {
      updateParentBoundaryLayer();
      return;
    }
    const onLoad = () => updateParentBoundaryLayer();
    map.once("load", onLoad);
    map.once("style.load", onLoad);
    return () => {
      map.off("load", onLoad);
      map.off("style.load", onLoad);
    };
  }, [parentBoundary, updateParentBoundaryLayer]);

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

export default GeofenceZoneEditor;
