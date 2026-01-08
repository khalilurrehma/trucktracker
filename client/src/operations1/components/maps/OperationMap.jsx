import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useCallback } from "react";
import booleanWithin from "@turf/boolean-within";
import booleanContains from "@turf/boolean-contains";
import Swal from "sweetalert2";
import mapboxDrawStyles from "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css?inline";
import geocoderStyles from "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css?inline";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { cn } from "../../lib/utils";
import { Maximize2, Layers, Circle, Pentagon, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "../ui/alert-dialog";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
// Circle drawing helper - creates a polygon approximating a circle
const createCircle = (center, radiusKm, points = 64) => {
    const coords = [];
    const distanceX = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
    const distanceY = radiusKm / 110.574;
    for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        coords.push([center[0] + x, center[1] + y]);
    }
    coords.push(coords[0]); // Close the polygon
    return {
        type: "Feature",
        properties: { isCircle: true, center, radiusKm },
        geometry: {
            type: "Polygon",
            coordinates: [coords],
        },
    };
};
const getDistanceKm = (start, end) => {
    const R = 6371;
    const dLat = ((end[1] - start[1]) * Math.PI) / 180;
    const dLon = ((end[0] - start[0]) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((start[1] * Math.PI) / 180) *
            Math.cos((end[1] * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
const OperationMap = ({ className, onPolygonChange, existingPolygon, referencePolygon, referencePolygons, referencePolygonColors, restrictionPolygon, center = [-77.0428, -12.0464], zoom = 13, drawMode = "polygon", height = "400px", circleCenter: circleCenterValue = null, circleRadiusMeters = null, }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const draw = useRef(null);
    const geocoder = useRef(null);
    const styleRef = useRef("satellite");
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [mapStyle, setMapStyle] = useState("satellite");
    const [activeDrawTool, setActiveDrawTool] = useState(null);
    const [hasShape, setHasShape] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const circleCenter = useRef(null);
    const circlePreviewSourceId = "circle-preview";
    const circlePreviewFillId = "circle-preview-fill";
    const circlePreviewLineId = "circle-preview-line";
    const referenceFitKey = useRef("");
    const circleFocusKey = useRef("");
    const lastViewRef = useRef({ center, zoom });
    const setInteractionEnabled = useCallback((enabled) => {
        if (!map.current)
            return;
        if (enabled) {
            map.current.dragPan.enable();
            map.current.doubleClickZoom.enable();
            map.current.scrollZoom.enable();
            map.current.boxZoom.enable();
            map.current.keyboard.enable();
            map.current.touchZoomRotate.enable();
        }
        else {
            map.current.dragPan.disable();
            map.current.doubleClickZoom.disable();
            map.current.scrollZoom.disable();
            map.current.boxZoom.disable();
            map.current.keyboard.disable();
            map.current.touchZoomRotate.disable();
        }
    }, []);
    const onPolygonChangeRef = useRef(onPolygonChange);
    const referenceRef = useRef({
        referencePolygon,
        referencePolygons,
        referencePolygonColors,
        restrictionPolygon,
    });
    useEffect(() => {
        onPolygonChangeRef.current = onPolygonChange;
    }, [onPolygonChange]);
    useEffect(() => {
        referenceRef.current = {
            referencePolygon,
            referencePolygons,
            referencePolygonColors,
            restrictionPolygon,
        };
    }, [referencePolygon, referencePolygons, referencePolygonColors, restrictionPolygon]);
    const normalizeGeoJson = (feature) => {
        if (!feature)
            return null;
        if (feature.type === "FeatureCollection") {
            return feature;
        }
        if (feature.type === "Feature") {
            return {
                type: "FeatureCollection",
                features: [feature],
            };
        }
        if (feature.type === "Polygon" || feature.type === "MultiPolygon") {
            return {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        properties: {},
                        geometry: feature,
                    },
                ],
            };
        }
        if (feature.geometry && feature.geometry.type) {
            return {
                type: "FeatureCollection",
                features: [
                    {
                        type: "Feature",
                        properties: feature.properties || {},
                        geometry: feature.geometry,
                    },
                ],
            };
        }
        return null;
    };
    const getRestrictionFeature = useCallback(() => {
        const { restrictionPolygon, referencePolygons, referencePolygon } = referenceRef.current || {};
        const candidate = restrictionPolygon || (referencePolygons && referencePolygons[0]) || referencePolygon;
        const normalized = normalizeGeoJson(candidate);
        return normalized && normalized.features ? normalized.features[0] : null;
    }, []);
    const emitPolygonChange = useCallback((value) => {
        if (onPolygonChangeRef.current) {
            onPolygonChangeRef.current(value);
        }
    }, []);
    const fitToFeature = (feature) => {
        if (!map.current || !feature)
            return;
        const geometry = feature.type === "FeatureCollection"
            ? feature.features[0]?.geometry
            : feature.type === "Feature"
                ? feature.geometry
                : null;
        if (!geometry || geometry.type !== "Polygon")
            return;
        const coords = geometry.coordinates?.[0] || [];
        if (!coords.length)
            return;
        let minLng = coords[0][0];
        let minLat = coords[0][1];
        let maxLng = coords[0][0];
        let maxLat = coords[0][1];
        for (const [lng, lat] of coords) {
            minLng = Math.min(minLng, lng);
            minLat = Math.min(minLat, lat);
            maxLng = Math.max(maxLng, lng);
            maxLat = Math.max(maxLat, lat);
        }
        map.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 0 });
    };
    const addReferenceLayer = useCallback(() => {
        const { referencePolygon, referencePolygons, referencePolygonColors, restrictionPolygon } = referenceRef.current || {};
        const basePolygons = referencePolygons && referencePolygons.length
            ? referencePolygons
            : referencePolygon
                ? [referencePolygon]
                : restrictionPolygon
                    ? [restrictionPolygon]
                    : [];
        if (!map.current || basePolygons.length === 0) {
            console.log("[OperationMap] addReferenceLayer skipped", {
                hasMap: Boolean(map.current),
                hasReferencePolygon: Boolean(referencePolygon),
                referencePolygonsCount: referencePolygons ? referencePolygons.length : 0,
                hasRestrictionPolygon: Boolean(restrictionPolygon),
                isLoaded,
                mapReady,
            });
            return;
        }
        const normalizedPolygons = basePolygons
            .map((poly) => normalizeGeoJson(poly))
            .filter(Boolean);
        if (normalizedPolygons.length === 0) {
            console.log("[OperationMap] addReferenceLayer no normalized polygons", {
                baseCount: basePolygons.length,
                isLoaded,
                mapReady,
            });
            return;
        }
        const run = () => {
            if (!map.current)
                return;
            if (!map.current.isStyleLoaded()) {
                map.current.once("idle", run);
                return;
            }
            console.log("[OperationMap] addReferenceLayer run", {
                normalizedCount: normalizedPolygons.length,
                isStyleLoaded: map.current.isStyleLoaded(),
            });
            normalizedPolygons.forEach((normalized, index) => {
                const color = (referencePolygonColors && referencePolygonColors[index]) || (index === 0 ? "#22d3ee" : "#38bdf8");
                const sourceId = `operation-boundary-${index}`;
                const fillId = `operation-boundary-fill-${index}`;
                const lineId = `operation-boundary-line-${index}`;
                const existingSource = map.current.getSource(sourceId);
                if (existingSource) {
                    existingSource.setData(normalized);
                    const drawFillId = "gl-draw-polygon-fill";
                    if (map.current.getLayer(fillId)) {
                        map.current.moveLayer(fillId, map.current.getLayer(drawFillId) ? drawFillId : undefined);
                    }
                    if (map.current.getLayer(lineId)) {
                        map.current.moveLayer(lineId);
                    }
                    return;
                }
                map.current.addSource(sourceId, {
                    type: "geojson",
                    data: normalized,
                });
                map.current.addLayer({
                    id: fillId,
                    type: "fill",
                    source: sourceId,
                    paint: {
                        "fill-color": color,
                        "fill-opacity": 0.18,
                    },
                    layout: {
                        "fill-sort-key": 10,
                    },
                });
                const drawFillId = "gl-draw-polygon-fill";
                const beforeId = map.current.getLayer(drawFillId) ? drawFillId : undefined;
                map.current.addLayer({
                    id: lineId,
                    type: "line",
                    source: sourceId,
                    paint: {
                        "line-color": color,
                        "line-width": 3,
                        "line-dasharray": [2, 1],
                    },
                    layout: {
                        "line-sort-key": 10,
                    },
                }, beforeId);
                map.current.moveLayer(lineId);
                if (index === 0) {
                    const feature = normalized.features && normalized.features[0];
                    const geometryKey = feature && feature.geometry
                        ? JSON.stringify(feature.geometry)
                        : "";
                    if (geometryKey && geometryKey !== referenceFitKey.current) {
                        referenceFitKey.current = geometryKey;
                        fitToFeature(normalized);
                    }
                }
            });
        };
        if (!map.current.isStyleLoaded()) {
            map.current.once("idle", run);
            return;
        }
        run();
    }, []);
    const updatePolygon = useCallback(() => {
        if (!draw.current)
            return;
        const data = draw.current.getAll();
        if (data.features.length > 0) {
            const restriction = getRestrictionFeature();
            if (restriction &&
                !booleanWithin(data.features[0], restriction) &&
                !booleanContains(restriction, data.features[0])) {
                draw.current.deleteAll();
                setHasShape(false);
                emitPolygonChange(null);
                addReferenceLayer();
                Swal.fire("Outside Operation", "Zone must be inside the Operation geofence.", "warning");
                return;
            }
            setHasShape(true);
            emitPolygonChange(data.features[0]);
            if (map.current) {
                map.current.getCanvas().style.cursor = "";
            }
            setInteractionEnabled(true);
            setActiveDrawTool(null);
        }
        else {
            setHasShape(false);
            emitPolygonChange(null);
        }
        addReferenceLayer();
    }, [getRestrictionFeature, emitPolygonChange, addReferenceLayer, setInteractionEnabled]);
    const initializeMap = useCallback(() => {
        if (!mapContainer.current || map.current)
            return;
        mapboxgl.accessToken = MAPBOX_TOKEN;
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: mapStyle === "satellite"
                ? "mapbox://styles/mapbox/satellite-streets-v12"
                : "mapbox://styles/mapbox/dark-v11",
            center: center,
            zoom: zoom,
            pitch: 45,
            bearing: 0,
            antialias: true,
            attributionControl: false,
            preserveDrawingBuffer: true,
        });
        setMapReady(true);
        // Add navigation controls in bottom-left to avoid overlap
        map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
        // Add geocoder with proper configuration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geocoderOptions = {
            accessToken: MAPBOX_TOKEN,
            mapboxgl: mapboxgl,
            placeholder: "Search location in Lima, Peru...",
            collapsed: false,
            marker: true,
            proximity: { longitude: -77.0428, latitude: -12.0464 }, // Bias to Lima, Peru
            countries: "pe", // Prioritize Peru results
            flyTo: {
                speed: 1.5,
                zoom: 15,
            },
        };
        geocoder.current = new MapboxGeocoder(geocoderOptions);
        map.current.addControl(geocoder.current, "top-right");
        // Add draw controls (no visible controls - we use custom buttons)
        if (drawMode !== "none") {
            draw.current = new MapboxDraw({
                displayControlsDefault: false,
                controls: {
                    polygon: false,
                    trash: false,
                },
                defaultMode: "simple_select",
                styles: [
                    {
                        id: "gl-draw-polygon-fill",
                        type: "fill",
                        filter: ["all", ["==", "$type", "Polygon"]],
                        paint: {
                            "fill-color": "#22d3ee",
                            "fill-opacity": 0.25,
                        },
                    },
                    {
                        id: "gl-draw-polygon-stroke",
                        type: "line",
                        filter: ["all", ["==", "$type", "Polygon"]],
                        paint: {
                            "line-color": "#22d3ee",
                            "line-width": 3,
                            "line-dasharray": [2, 1],
                        },
                    },
                    {
                        id: "gl-draw-polygon-midpoint",
                        type: "circle",
                        filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
                        paint: {
                            "circle-radius": 5,
                            "circle-color": "#22d3ee",
                        },
                    },
                    {
                        id: "gl-draw-polygon-vertex",
                        type: "circle",
                        filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
                        paint: {
                            "circle-radius": 7,
                            "circle-color": "#ffffff",
                            "circle-stroke-color": "#22d3ee",
                            "circle-stroke-width": 2,
                        },
                    },
                    {
                        id: "gl-draw-line",
                        type: "line",
                        filter: ["all", ["==", "$type", "LineString"]],
                        paint: {
                            "line-color": "#22d3ee",
                            "line-width": 2,
                        },
                    },
                    {
                        id: "gl-draw-point",
                        type: "circle",
                        filter: ["all", ["==", "$type", "Point"], ["!=", "meta", "midpoint"], ["!=", "meta", "vertex"]],
                        paint: {
                            "circle-radius": 8,
                            "circle-color": "#22d3ee",
                            "circle-stroke-color": "#ffffff",
                            "circle-stroke-width": 2,
                        },
                    },
                ],
            });
            // Add draw control to map (hidden default controls)
            map.current.addControl(draw.current);
        }
        // Add custom CSS so draw/geocoder styles are scoped to this map container
        const styleEl = document.createElement("style");
        styleEl.setAttribute("data-mapbox-scope", "operations1-map");
        styleEl.textContent = `${mapboxDrawStyles}\n${geocoderStyles}`;
        mapContainer.current.appendChild(styleEl);
        // Add scale control
        map.current.addControl(new mapboxgl.ScaleControl(), "bottom-left");
        // Add attribution control
        map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
        map.current.on("load", () => {
            var _a, _b, _c, _d;
            setIsLoaded(true);
            console.log("[OperationMap] map loaded");
            // Add 3D buildings
            const layers = (_b = (_a = map.current) === null || _a === void 0 ? void 0 : _a.getStyle()) === null || _b === void 0 ? void 0 : _b.layers;
            const labelLayerId = (_c = layers === null || layers === void 0 ? void 0 : layers.find((layer) => { var _a; return layer.type === "symbol" && ((_a = layer.layout) === null || _a === void 0 ? void 0 : _a["text-field"]); })) === null || _c === void 0 ? void 0 : _c.id;
            if (labelLayerId) {
                (_d = map.current) === null || _d === void 0 ? void 0 : _d.addLayer({
                    id: "3d-buildings",
                    source: "composite",
                    "source-layer": "building",
                    filter: ["==", "extrude", "true"],
                    type: "fill-extrusion",
                    minzoom: 15,
                    paint: {
                        "fill-extrusion-color": "#2a3346",
                        "fill-extrusion-height": ["get", "height"],
                        "fill-extrusion-base": ["get", "min_height"],
                        "fill-extrusion-opacity": 0.6,
                    },
                }, labelLayerId);
            }
            addReferenceLayer();
        });
        map.current.on("styledata", addReferenceLayer);
        if (drawMode !== "none") {
            map.current.on("draw.modechange", addReferenceLayer);
        }
        // Handle draw events
        if (drawMode !== "none") {
            map.current.on("draw.create", updatePolygon);
            map.current.on("draw.delete", updatePolygon);
            map.current.on("draw.update", updatePolygon);
        }
    }, []);
    useEffect(() => {
        initializeMap();
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
            if (mapContainer.current) {
                const styleEl = mapContainer.current.querySelector('style[data-mapbox-scope="operations1-map"]');
                if (styleEl) {
                    styleEl.remove();
                }
            }
        };
    }, [initializeMap]);
    useEffect(() => {
        if (!mapReady)
            return;
        addReferenceLayer();
    }, [mapReady, referencePolygon, referencePolygons, referencePolygonColors, addReferenceLayer]);
    useEffect(() => {
        if (!draw.current)
            return;
        if (existingPolygon) {
            draw.current.deleteAll();
            draw.current.add(existingPolygon);
            setHasShape(true);
        }
        else {
            draw.current.deleteAll();
            setHasShape(false);
        }
        addReferenceLayer();
    }, [existingPolygon, addReferenceLayer]);
    useEffect(() => {
        if (!draw.current || !map.current)
            return;
        if (!circleCenterValue || !circleRadiusMeters)
            return;
        const [lng, lat] = circleCenterValue;
        const radiusValue = Number(circleRadiusMeters);
        if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(radiusValue) || radiusValue <= 0)
            return;
        const circleFeature = createCircle([lng, lat], radiusValue / 1000);
        const restriction = getRestrictionFeature();
        if (restriction &&
            !booleanWithin(circleFeature, restriction) &&
            !booleanContains(restriction, circleFeature)) {
            Swal.fire("Outside Operation", "Zone must be inside the Operation geofence.", "warning");
            return;
        }
        draw.current.deleteAll();
        draw.current.add(circleFeature);
        setHasShape(true);
        emitPolygonChange(circleFeature);
        setActiveDrawTool(null);
        if (draw.current) {
            draw.current.changeMode("simple_select");
        }
        setInteractionEnabled(true);
        if (map.current) {
            const focusKey = `${lng},${lat},${radiusValue}`;
            if (circleFocusKey.current !== focusKey) {
                circleFocusKey.current = focusKey;
                map.current.easeTo({
                    center: [lng, lat],
                    zoom: Math.max(map.current.getZoom(), 14),
                    duration: 0,
                });
            }
            map.current.getCanvas().style.cursor = "";
            map.current.dragPan.enable();
            map.current.doubleClickZoom.enable();
            map.current.scrollZoom.enable();
            map.current.boxZoom.enable();
            map.current.keyboard.enable();
            map.current.touchZoomRotate.enable();
        }
    }, [circleCenterValue, circleRadiusMeters, emitPolygonChange, getRestrictionFeature]);
    useEffect(() => {
        if (activeDrawTool)
            return;
        setInteractionEnabled(true);
        if (map.current) {
            map.current.getCanvas().style.cursor = "";
        }
    }, [activeDrawTool, setInteractionEnabled]);
    useEffect(() => {
        if (!map.current)
            return;
        const [lng, lat] = center || [];
        const [prevLng, prevLat] = lastViewRef.current.center || [];
        if (lng === prevLng && lat === prevLat && zoom === lastViewRef.current.zoom) {
            return;
        }
        map.current.setCenter(center);
        map.current.setZoom(zoom);
        lastViewRef.current = { center, zoom };
    }, [center, zoom]);
    useEffect(() => {
        if (!map.current)
            return;
        const nextStyle = mapStyle === "satellite"
            ? "mapbox://styles/mapbox/satellite-streets-v12"
            : "mapbox://styles/mapbox/dark-v11";
        if (styleRef.current === nextStyle) {
            return;
        }
        styleRef.current = nextStyle;
        map.current.setStyle(nextStyle);
    }, [mapStyle]);
    useEffect(() => {
        addReferenceLayer();
    }, [addReferenceLayer]);
    const clearCirclePreview = useCallback(() => {
        if (!map.current)
            return;
        if (map.current.getLayer(circlePreviewLineId)) {
            map.current.removeLayer(circlePreviewLineId);
        }
        if (map.current.getLayer(circlePreviewFillId)) {
            map.current.removeLayer(circlePreviewFillId);
        }
        if (map.current.getSource(circlePreviewSourceId)) {
            map.current.removeSource(circlePreviewSourceId);
        }
    }, []);
    // Handle circle drawing mode
    useEffect(() => {
        if (!map.current || !draw.current || activeDrawTool !== "circle")
            return;
        const ensureCirclePreview = () => {
            if (!map.current)
                return;
            if (!map.current.getSource(circlePreviewSourceId)) {
                map.current.addSource(circlePreviewSourceId, {
                    type: "geojson",
                    data: {
                        type: "FeatureCollection",
                        features: [],
                    },
                });
            }
            const beforeId = map.current.getLayer("gl-draw-polygon-fill")
                ? "gl-draw-polygon-fill"
                : undefined;
            if (!map.current.getLayer(circlePreviewFillId)) {
                map.current.addLayer({
                    id: circlePreviewFillId,
                    type: "fill",
                    source: circlePreviewSourceId,
                    paint: {
                        "fill-color": "#22d3ee",
                        "fill-opacity": 0.15,
                    },
                }, beforeId);
            }
            if (!map.current.getLayer(circlePreviewLineId)) {
                map.current.addLayer({
                    id: circlePreviewLineId,
                    type: "line",
                    source: circlePreviewSourceId,
                    paint: {
                        "line-color": "#22d3ee",
                        "line-width": 2,
                        "line-dasharray": [2, 1],
                    },
                }, beforeId);
            }
        };
        const updateCirclePreview = (feature) => {
            var _a;
            ensureCirclePreview();
            (_a = map.current
                .getSource(circlePreviewSourceId)) === null || _a === void 0 ? void 0 : _a.setData({
                type: "FeatureCollection",
                features: feature ? [feature] : [],
            });
        };
        const handleClick = (e) => {
            var _a, _b;
            if (!circleCenter.current) {
                // First click - set center
                circleCenter.current = [e.lngLat.lng, e.lngLat.lat];
            }
            else {
                // Second click - calculate radius and create circle
                const center = circleCenter.current;
                const endPoint = [e.lngLat.lng, e.lngLat.lat];
                // Calculate distance in km
                const radiusKm = getDistanceKm(center, endPoint);
                // Create circle polygon
                const circleFeature = createCircle(center, radiusKm);
                const restriction = getRestrictionFeature();
                if (restriction && !booleanWithin(circleFeature, restriction) && !booleanContains(restriction, circleFeature)) {
                    setInteractionEnabled(true);
                    if (map.current) {
                        map.current.getCanvas().style.cursor = "";
                    }
                    circleCenter.current = null;
                    setActiveDrawTool(null);
                    updateCirclePreview(null);
                    Swal.fire("Outside Operation", "Zone must be inside the Operation geofence.", "warning");
                    return;
                }
                // Clear existing and add new circle
                (_a = draw.current) === null || _a === void 0 ? void 0 : _a.deleteAll();
                (_b = draw.current) === null || _b === void 0 ? void 0 : _b.add(circleFeature);
                // Update polygon
                emitPolygonChange(circleFeature);
                setInteractionEnabled(true);
                if (map.current) {
                    map.current.getCanvas().style.cursor = "";
                }
                updateCirclePreview(null);
                // Reset
                circleCenter.current = null;
                setActiveDrawTool(null);
            }
        };
        const handleMove = (e) => {
            if (!circleCenter.current)
                return;
            const center = circleCenter.current;
            const endPoint = [e.lngLat.lng, e.lngLat.lat];
            const radiusKm = getDistanceKm(center, endPoint);
            if (!radiusKm || Number.isNaN(radiusKm))
                return;
            updateCirclePreview(createCircle(center, radiusKm));
        };
        map.current.on("click", handleClick);
        map.current.on("mousemove", handleMove);
        map.current.getCanvas().style.cursor = "crosshair";
        return () => {
            var _a;
            (_a = map.current) === null || _a === void 0 ? void 0 : _a.off("click", handleClick);
            (_a = map.current) === null || _a === void 0 ? void 0 : _a.off("mousemove", handleMove);
            if (map.current) {
                map.current.getCanvas().style.cursor = "";
            }
            updateCirclePreview(null);
            clearCirclePreview();
        };
    }, [activeDrawTool, emitPolygonChange, getRestrictionFeature, setInteractionEnabled, clearCirclePreview]);
    const toggleMapStyle = () => {
        var _a;
        const newStyle = mapStyle === "satellite" ? "streets" : "satellite";
        setMapStyle(newStyle);
        if (map.current) {
            const currentPolygon = (_a = draw.current) === null || _a === void 0 ? void 0 : _a.getAll();
            map.current.setStyle(newStyle === "satellite"
                ? "mapbox://styles/mapbox/satellite-streets-v12"
                : "mapbox://styles/mapbox/dark-v11");
            // Restore polygon after style change
            map.current.once("style.load", () => {
                if (currentPolygon && draw.current && currentPolygon.features.length > 0) {
                    draw.current.add(currentPolygon.features[0]);
                }
                addReferenceLayer();
            });
        }
    };
    const handleFullscreen = () => {
        if (mapContainer.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            else {
                mapContainer.current.requestFullscreen();
            }
        }
    };
    const startPolygonDraw = () => {
        if (draw.current) {
            setActiveDrawTool("polygon");
            circleCenter.current = null;
            draw.current.changeMode("draw_polygon");
            setInteractionEnabled(false);
            if (map.current) {
                map.current.getCanvas().style.cursor = "crosshair";
            }
        }
    };
    const startCircleDraw = () => {
        setActiveDrawTool("circle");
        circleCenter.current = null;
        setInteractionEnabled(false);
        if (map.current) {
            map.current.getCanvas().style.cursor = "crosshair";
        }
    };
    const handleDeleteClick = () => {
        if (hasShape) {
            setShowDeleteDialog(true);
        }
    };
    const confirmDelete = () => {
        if (draw.current) {
            draw.current.deleteAll();
            setHasShape(false);
            emitPolygonChange(null);
        }
        setShowDeleteDialog(false);
    };
    return (_jsxs("div", { className: cn("relative rounded-xl overflow-hidden border border-border", className), children: [_jsx("div", { ref: mapContainer, className: "w-full", style: { height } }), !isLoaded && (_jsx("div", { className: "absolute inset-0 bg-background/80 flex items-center justify-center", children: _jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "text-sm text-muted-foreground", children: "Loading map..." })] }) })), drawMode !== "none" && (_jsxs("div", { className: "absolute top-3 left-3 flex flex-col gap-2 z-20", children: [_jsx(Button, { variant: activeDrawTool === "polygon" ? "default" : "icon", size: "iconSm", onClick: startPolygonDraw, className: cn("bg-card border border-border shadow-lg", activeDrawTool === "polygon" && "bg-primary text-primary-foreground"), title: "Draw Polygon", children: _jsx(Pentagon, { className: "w-4 h-4" }) }), _jsx(Button, { variant: activeDrawTool === "circle" ? "default" : "icon", size: "iconSm", onClick: startCircleDraw, className: cn("bg-card border border-border shadow-lg", activeDrawTool === "circle" && "bg-primary text-primary-foreground"), title: "Draw Circle (click center, then edge)", children: _jsx(Circle, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: handleDeleteClick, disabled: !hasShape, className: cn("bg-card border border-border shadow-lg", hasShape && "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive", !hasShape && "opacity-50 cursor-not-allowed"), title: "Delete Geofence", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })), _jsx(AlertDialog, { open: showDeleteDialog, onOpenChange: setShowDeleteDialog, children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Delete Geofence" }), _jsx(AlertDialogDescription, { children: "Are you sure you want to delete this geofence? This action cannot be undone." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: confirmDelete, className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", children: "Delete" })] })] }) }), activeDrawTool === "polygon" && (_jsx("div", { className: "absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border", children: _jsx("p", { className: "text-sm text-foreground", children: "Click to add points, double-click to finish polygon" }) })), activeDrawTool === "circle" && (_jsx("div", { className: "absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border", children: _jsx("p", { className: "text-sm text-foreground", children: !circleCenter.current
                        ? "Click to set circle center"
                        : "Click to set circle radius" }) })), _jsxs("div", { className: "absolute top-16 right-3 flex flex-col gap-2 z-10", children: [_jsx(Button, { variant: "icon", size: "iconSm", onClick: handleFullscreen, className: "bg-card border border-border shadow-lg", title: "Fullscreen", children: _jsx(Maximize2, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: toggleMapStyle, className: "bg-card border border-border shadow-lg", title: "Toggle Map Style", children: _jsx(Layers, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/30 to-transparent pointer-events-none" })] }));
};
export default OperationMap;
