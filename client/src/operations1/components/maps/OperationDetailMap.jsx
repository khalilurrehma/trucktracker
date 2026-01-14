import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createRoot } from "react-dom/client";
import { cn } from "../../lib/utils";
import { Maximize2, Layers, Bell, Eye, EyeOff, Radio, Trash2, Check, Map as MapIcon, Columns2 } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "../ui/dropdown-menu";
import { zoneTypeColors } from "../operations/ZonesSidebar";
import VehiclePopup from "../operations/VehiclePopup";
import { getDumpTruckSvgString, getLoaderSvgString } from "../icons/VehicleIcons";
import "./OperationDetailMap.css";
import { useAppContext } from "../../../AppContext";
import { getDevicesByPositionOperation, fetchOperationKPI } from "../../../apis/deviceAssignmentApi";
import {
    getOperationLayers,
    createOperationLayer,
    updateOperationLayer,
    deleteOperationLayer,
} from "../../../apis/operationLayersApi";
import { useNavigate } from "react-router-dom";
import LayersPanel from "./LayersPanel";
import POILayerWizard from "./POILayerWizard";
import { getCategoryIcon } from "../../services/poiService";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
const mapStyles = [
    { id: "satellite-streets", name: "Satellite Streets", url: "mapbox://styles/mapbox/satellite-streets-v12" },
    { id: "satellite", name: "Satellite", url: "mapbox://styles/mapbox/satellite-v9" },
    { id: "dark", name: "Dark", url: "mapbox://styles/mapbox/dark-v11" },
    { id: "light", name: "Light", url: "mapbox://styles/mapbox/light-v11" },
    { id: "streets", name: "Streets", url: "mapbox://styles/mapbox/streets-v12" },
    { id: "outdoors", name: "Outdoors", url: "mapbox://styles/mapbox/outdoors-v12" },
];
const OperationDetailMap = ({ className, zones, selectedZoneId, center = [-76.9, -15.5], zoom = 12, onAlertsToggle, alertsOpen, operationId, operationGeofenceId, operationPolygon, }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef(new Map());
    const poiMarkersRef = useRef(new Map());
    const popupRef = useRef(null);
    const popupRootRef = useRef(null);
    const navigate = useNavigate();
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapStyle, setMapStyle] = useState("satellite-streets");
    const [showLabels, setShowLabels] = useState(true);
    const [showTracks, setShowTracks] = useState(true);
    const [showZones, setShowZones] = useState(true);
    const [showVehicles, setShowVehicles] = useState(true);
    const [apiVehicles, setApiVehicles] = useState([]);
    const [positions, setPositions] = useState([]);
    const [deviceKPI, setDeviceKPI] = useState({});
    const clearTracks = () => { };
    const [layersPanelOpen, setLayersPanelOpen] = useState(false);
    const [poiWizardOpen, setPOIWizardOpen] = useState(false);
    const [pickedPoint, setPickedPoint] = useState(null);
    const [isPickingPoint, setIsPickingPoint] = useState(false);
    const [mapLayers, setMapLayers] = useState([]);
    const [systemLayers, setSystemLayers] = useState([
        { id: "zones", name: "Zones", visible: true },
        { id: "vehicles", name: "Vehicles", visible: true },
        { id: "tracks", name: "Tracks", visible: true },
    ]);
    const { mqttDeviceLiveLocation, mqttCalculatorIntervals, mqttDeviceConnected } = useAppContext();
    const isConnected = Boolean(mqttDeviceConnected?.length);
    const connectionStatus = isConnected ? "connected" : "disconnected";
    const displayVehicles = apiVehicles;
    // Calculate polygon center
    const calculatePolygonCenter = (coords) => {
        let sumLng = 0;
        let sumLat = 0;
        const len = coords.length - 1;
        for (let i = 0; i < len; i++) {
            sumLng += coords[i][0];
            sumLat += coords[i][1];
        }
        return [sumLng / len, sumLat / len];
    };
    // Generate mock polygon for demo
    const generateMockPolygon = useCallback((zone, index) => {
        const baseCenter = center;
        const offset = (index - 1.5) * 0.015;
        const size = zone.type === "ZONE_AREA" ? 0.05 : 0.018;
        let coords;
        if (zone.type === "QUEUE_AREA" || zone.type === "DUMP_AREA") {
            const points = 36;
            coords = [];
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * 2 * Math.PI;
                coords.push([
                    baseCenter[0] + offset * 1.5 + size * Math.cos(angle),
                    baseCenter[1] + offset * 0.8 + size * 0.75 * Math.sin(angle),
                ]);
            }
            coords.push(coords[0]);
        }
        else if (zone.type === "LOAD_PAD") {
            const rectSize = size * 0.8;
            coords = [
                [baseCenter[0] + offset - rectSize, baseCenter[1] - rectSize * 0.6],
                [baseCenter[0] + offset + rectSize, baseCenter[1] - rectSize * 0.6],
                [baseCenter[0] + offset + rectSize, baseCenter[1] + rectSize * 0.6],
                [baseCenter[0] + offset - rectSize, baseCenter[1] + rectSize * 0.6],
                [baseCenter[0] + offset - rectSize, baseCenter[1] - rectSize * 0.6],
            ];
        }
        else {
            coords = [
                [baseCenter[0] - size * 1.2, baseCenter[1] - size],
                [baseCenter[0] + size * 1.5, baseCenter[1] - size * 0.8],
                [baseCenter[0] + size * 1.8, baseCenter[1] + size * 0.3],
                [baseCenter[0] + size * 1.2, baseCenter[1] + size * 1.1],
                [baseCenter[0] - size * 0.3, baseCenter[1] + size * 1.2],
                [baseCenter[0] - size * 1.5, baseCenter[1] + size * 0.4],
                [baseCenter[0] - size * 1.2, baseCenter[1] - size],
            ];
        }
        return {
            type: "Feature",
            properties: { name: zone.name, type: zone.type },
            geometry: {
                type: "Polygon",
                coordinates: [coords],
            },
        };
    }, [center]);
    // Add zones (geofences) to map
    const addZonesToMap = useCallback(() => {
        if (!map.current || !map.current.isStyleLoaded())
            return;
        const features = zones.map((zone, index) => {
            const polygon = zone.polygon || generateMockPolygon(zone, index);
            return {
                type: "Feature",
                properties: {
                    zoneId: zone.id,
                    name: zone.name,
                    zoneType: zone.type,
                },
                geometry: polygon.geometry,
            };
        });
        const sourceId = "zones-geo";
        const fillId = "zones-fill";
        const lineId = "zones-line";
        const labelId = "zones-label";
        const data = { type: "FeatureCollection", features };
        if (map.current.getSource(sourceId)) {
            map.current.getSource(sourceId).setData(data);
        }
        else {
            map.current.addSource(sourceId, { type: "geojson", data });
        }
        if (!map.current.getLayer(fillId)) {
            map.current.addLayer({
                id: fillId,
                type: "fill",
                source: sourceId,
                paint: {
                    "fill-color": [
                        "match",
                        ["get", "zoneType"],
                        "QUEUE_AREA",
                        zoneTypeColors.QUEUE_AREA,
                        "LOAD_PAD",
                        zoneTypeColors.LOAD_PAD,
                        "DUMP_AREA",
                        zoneTypeColors.DUMP_AREA,
                        "ZONE_AREA",
                        zoneTypeColors.ZONE_AREA,
                        "#999999",
                    ],
                    "fill-opacity": [
                        "case",
                        ["==", ["get", "zoneId"], selectedZoneId],
                        0.45,
                        0.3,
                    ],
                },
            });
        }
        if (!map.current.getLayer(lineId)) {
            map.current.addLayer({
                id: lineId,
                type: "line",
                source: sourceId,
                paint: {
                    "line-color": [
                        "match",
                        ["get", "zoneType"],
                        "QUEUE_AREA",
                        zoneTypeColors.QUEUE_AREA,
                        "LOAD_PAD",
                        zoneTypeColors.LOAD_PAD,
                        "DUMP_AREA",
                        zoneTypeColors.DUMP_AREA,
                        "ZONE_AREA",
                        zoneTypeColors.ZONE_AREA,
                        "#999999",
                    ],
                    "line-width": [
                        "case",
                        ["==", ["get", "zoneId"], selectedZoneId],
                        4,
                        2.5,
                    ],
                    "line-opacity": 1,
                },
            });
        }
        if (!map.current.getLayer(labelId)) {
            map.current.addLayer({
                id: labelId,
                type: "symbol",
                source: sourceId,
                layout: {
                    "text-field": ["get", "name"],
                    "text-size": 13,
                    "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
                    "text-anchor": "center",
                    "text-allow-overlap": true,
                    "visibility": showLabels ? "visible" : "none",
                },
                paint: {
                    "text-color": "#ffffff",
                    "text-halo-color": "#0f172a",
                    "text-halo-width": 2,
                },
            });
        }
        else {
            map.current.setLayoutProperty(labelId, "visibility", showLabels ? "visible" : "none");
        }
    }, [zones, selectedZoneId, showLabels, generateMockPolygon]);

    const addOperationToMap = useCallback(() => {
        var _a, _b, _c, _d;
        if (!map.current || !operationPolygon) {
            console.log("addOperationToMap: missing map or polygon", {
                hasMap: Boolean(map.current),
                hasPolygon: Boolean(operationPolygon),
            });
            return;
        }
        if (!map.current.isStyleLoaded()) {
            console.log("addOperationToMap: defer until idle");
            map.current.once("idle", addOperationToMap);
            return;
        }
        const sourceId = "operation-geo";
        const fillId = "operation-fill";
        const lineId = "operation-line";
        const feature = operationPolygon.type === "Feature"
            ? operationPolygon
            : { type: "Feature", properties: {}, geometry: operationPolygon };
        console.log("addOperationToMap: feature", {
            type: feature?.geometry?.type,
            coords: feature?.geometry?.coordinates?.[0]?.length,
        });
        try {
            if ((_a = map.current) === null || _a === void 0 ? void 0 : _a.getLayer(lineId))
                map.current.removeLayer(lineId);
            if ((_b = map.current) === null || _b === void 0 ? void 0 : _b.getLayer(fillId))
                map.current.removeLayer(fillId);
            if ((_c = map.current) === null || _c === void 0 ? void 0 : _c.getSource(sourceId))
                map.current.removeSource(sourceId);
        }
        catch (e) {
            console.log("Error removing operation layers:", e);
        }
        if ((_d = map.current) === null || _d === void 0 ? void 0 : _d.getSource(sourceId)) {
            map.current.getSource(sourceId).setData(feature);
        }
        else {
            map.current.addSource(sourceId, {
                type: "geojson",
                data: feature,
            });
        }
        if (!map.current.getLayer(fillId)) {
            map.current.addLayer({
                id: fillId,
                type: "fill",
                source: sourceId,
                paint: {
                    "fill-color": "#facc15",
                    "fill-opacity": 0.1,
                },
            });
        }
        if (!map.current.getLayer(lineId)) {
            map.current.addLayer({
                id: lineId,
                type: "line",
                source: sourceId,
                paint: {
                    "line-color": "#facc15",
                    "line-width": 6,
                    "line-opacity": 1,
                    "line-dasharray": [2, 1],
                },
            });
        }
        try {
            map.current.moveLayer(fillId);
            map.current.moveLayer(lineId);
        }
        catch (e) {
            // Ignore move errors if layer order changes
        }
        console.log("addOperationToMap: layers", {
            hasFill: Boolean(map.current.getLayer(fillId)),
            hasLine: Boolean(map.current.getLayer(lineId)),
        });
    }, [operationPolygon]);
    const reapplyGeofences = useCallback(() => {
        if (!map.current)
            return;
        console.log("reapplyGeofences: start", {
            hasMap: Boolean(map.current),
            hasOperationPolygon: Boolean(operationPolygon),
            zonesCount: zones.length,
        });
        const renderAll = () => {
            console.log("reapplyGeofences: renderAll");
            addZonesToMap();
            console.log("renderAll: addOperationToMap", typeof addOperationToMap);
            try {
                addOperationToMap();
            }
            catch (error) {
                console.error("addOperationToMap error:", error);
            }
            console.log("reapplyGeofences: after render", {
                hasOperationFill: Boolean(map.current?.getLayer("operation-fill")),
                hasOperationLine: Boolean(map.current?.getLayer("operation-line")),
                hasOperationSource: Boolean(map.current?.getSource("operation-geo")),
            });
        };
        if (map.current.isStyleLoaded()) {
            renderAll();
        }
        else {
            map.current.once("idle", renderAll);
        }
    }, [addZonesToMap, addOperationToMap, operationPolygon, zones.length]);
    // Add vehicle tracks to map
    const addTracksToMap = useCallback(() => {
        if (!map.current || !showTracks || !map.current.isStyleLoaded())
            return;
        const tracksSourceId = "vehicle-tracks";
        const tracksLayerId = "vehicle-tracks-layer";
        try {
            if (map.current.getLayer(tracksLayerId)) {
                map.current.removeLayer(tracksLayerId);
            }
            if (map.current.getSource(tracksSourceId)) {
                map.current.removeSource(tracksSourceId);
            }
        }
        catch (e) {
            // Ignore
        }
    }, [showTracks]);

    useEffect(() => {
        if (!operationId)
            return;
        const loadLayers = async () => {
            try {
                const data = await getOperationLayers(operationId);
                const mapped = (Array.isArray(data) ? data : []).map((layer) => ({
                    id: layer.id,
                    name: layer.name,
                    type: layer.type,
                    visible: layer.visible !== false,
                    opacity: Number(layer.opacity ?? 1),
                    data: layer.data ?? null,
                }));
                setMapLayers(mapped);
            }
            catch (error) {
                console.error("Failed to load layers:", error);
            }
        };
        loadLayers();
    }, [operationId]);

    const handlePickPoint = () => {
        setIsPickingPoint(true);
        setPOIWizardOpen(false);
        if (map.current) {
            map.current.getCanvas().style.cursor = "crosshair";
        }
    };

    useEffect(() => {
        if (!map.current || !isPickingPoint)
            return;
        const clickHandler = (event) => {
            setPickedPoint({ lat: event.lngLat.lat, lng: event.lngLat.lng });
            setIsPickingPoint(false);
            setPOIWizardOpen(true);
            if (map.current) {
                map.current.getCanvas().style.cursor = "";
            }
        };
        map.current.on("click", clickHandler);
        return () => {
            map.current?.off("click", clickHandler);
        };
    }, [isPickingPoint]);

    const showPOIPopup = (poi, layerName) => {
        if (!map.current)
            return;
        if (popupRef.current)
            popupRef.current.remove();
        popupRef.current = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            offset: 10,
        })
            .setLngLat([poi.lng, poi.lat])
            .setHTML(`
        <div class="poi-popup p-2">
          <div class="flex items-center gap-2 mb-1">
            <span style="font-size: 18px;">${getCategoryIcon(poi.categoryId)}</span>
            <strong>${poi.name}</strong>
          </div>
          <div class="text-xs text-gray-400">${layerName}</div>
          ${poi.address ? `<div class="text-xs mt-1">${poi.address}</div>` : ""}
          <div class="text-xs text-green-400 mt-1">${poi.distanceMeters}m away</div>
        </div>
      `)
            .addTo(map.current);
    };

    const addPOIMarkersToMap = useCallback(() => {
        if (!map.current)
            return;
        poiMarkersRef.current.forEach((marker) => marker.remove());
        poiMarkersRef.current.clear();
        mapLayers
            .filter((layer) => layer.type === "POI" && layer.visible && layer.data)
            .forEach((layer) => {
            const config = layer.data;
            const icon = config?.customIcon;
            (config?.pois || []).forEach((poi) => {
                const el = document.createElement("div");
                el.className = "poi-marker";
                if (icon) {
                    el.innerHTML = `<img src="${icon}" alt="POI" style="width: 24px; height: 24px; border-radius: 6px; object-fit: cover;" />`;
                }
                else {
                    el.innerHTML = `<span style="font-size: 20px;">${getCategoryIcon(poi.categoryId)}</span>`;
                }
                el.style.cursor = "pointer";
                el.style.opacity = String(layer.opacity ?? 1);
                el.addEventListener("click", (event) => {
                    event.stopPropagation();
                    showPOIPopup(poi, layer.name);
                });
                const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
                    .setLngLat([poi.lng, poi.lat])
                    .addTo(map.current);
                poiMarkersRef.current.set(poi.id, marker);
            });
        });
    }, [mapLayers]);

    const handleCreatePOILayer = useCallback(async (config) => {
        if (!operationId)
            return;
        try {
            const created = await createOperationLayer(operationId, {
                name: config.name || "POI Layer",
                type: "POI",
                visible: true,
                opacity: 1,
                data: config,
            });
            const newLayer = {
                id: created?.id ?? `poi-${Date.now()}`,
                name: created?.name ?? config.name ?? "POI Layer",
                type: "POI",
                visible: created?.visible ?? true,
                opacity: Number(created?.opacity ?? 1),
                data: created?.data ?? config,
            };
            setMapLayers((prev) => [...prev, newLayer]);
            setPickedPoint(null);
        }
        catch (error) {
            console.error("Failed to create POI layer:", error);
        }
    }, [operationId]);

    const addGeoJSONLayerToMap = useCallback((layer) => {
        if (!map.current || !layer.data)
            return;
        const sourceId = `geojson-source-${layer.id}`;
        const fillLayerId = `geojson-fill-${layer.id}`;
        const lineLayerId = `geojson-line-${layer.id}`;
        try {
            if (map.current.getLayer(lineLayerId))
                map.current.removeLayer(lineLayerId);
            if (map.current.getLayer(fillLayerId))
                map.current.removeLayer(fillLayerId);
            if (map.current.getSource(sourceId))
                map.current.removeSource(sourceId);
        }
        catch (e) {
            // ignore
        }
        map.current.addSource(sourceId, {
            type: "geojson",
            data: layer.data,
        });
        map.current.addLayer({
            id: fillLayerId,
            type: "fill",
            source: sourceId,
            paint: {
                "fill-color": "#8b5cf6",
                "fill-opacity": (layer.opacity ?? 1) * 0.3,
            },
        });
        map.current.addLayer({
            id: lineLayerId,
            type: "line",
            source: sourceId,
            paint: {
                "line-color": "#8b5cf6",
                "line-width": 2,
                "line-opacity": layer.opacity ?? 1,
            },
        });
    }, []);

    const removeGeoJSONLayerFromMap = useCallback((layerId) => {
        if (!map.current)
            return;
        const sourceId = `geojson-source-${layerId}`;
        const fillLayerId = `geojson-fill-${layerId}`;
        const lineLayerId = `geojson-line-${layerId}`;
        try {
            if (map.current.getLayer(lineLayerId))
                map.current.removeLayer(lineLayerId);
            if (map.current.getLayer(fillLayerId))
                map.current.removeLayer(fillLayerId);
            if (map.current.getSource(sourceId))
                map.current.removeSource(sourceId);
        }
        catch (e) {
            // ignore
        }
    }, []);

    const handleGeoJSONUpload = useCallback(async (file) => {
        try {
            const text = await file.text();
            const geojson = JSON.parse(text);
            if (!operationId)
                return;
            const created = await createOperationLayer(operationId, {
                name: file.name.replace(/\.(geo)?json$/i, "") || "GeoJSON Layer",
                type: "GeoJSON",
                visible: true,
                opacity: 1,
                data: geojson,
            });
            const newLayer = {
                id: created?.id ?? `geojson-${Date.now()}`,
                name: created?.name ?? file.name.replace(/\.(geo)?json$/i, ""),
                type: "GeoJSON",
                visible: created?.visible ?? true,
                opacity: Number(created?.opacity ?? 1),
                data: created?.data ?? geojson,
            };
            setMapLayers((prev) => [...prev, newLayer]);
            if (map.current && map.current.isStyleLoaded()) {
                addGeoJSONLayerToMap(newLayer);
            }
        }
        catch (error) {
            console.error("Error parsing GeoJSON:", error);
        }
    }, [addGeoJSONLayerToMap, operationId]);
    useEffect(() => {
        if (!operationId)
            return;
        const loadDevices = async () => {
            try {
                const response = await getDevicesByPositionOperation(operationId);
                const deviceList = response?.devices || response || [];
                const mapped = deviceList
                    .filter((device) => device?.lat != null && device?.lon != null)
                    .map((device) => ({
                        id: String(device.flespi_device_id ?? device.flespiId ?? device.device_id ?? device.id),
                        name: device.device_name || device.name || "Device",
                        device_name: device.device_name,
                        flespi_device_id: device.flespi_device_id ?? device.flespiId,
                        type: String(device.category || "")
                            .toLowerCase()
                            .includes("loader")
                            ? "loader"
                            : "truck",
                        position: [Number(device.lon), Number(device.lat)],
                        lastUpdate: new Date().toLocaleTimeString(),
                        efficiency: 0,
                        trips: 0,
                        fuelPerM3: 0,
                        volumeM3: 0,
                        cycleTime: "-",
                        queueTime: "-",
                        status: "active",
                    }));
                setApiVehicles(mapped);
                const kpiResults = await Promise.allSettled(mapped.map((device) => fetchOperationKPI(device.flespi_device_id)));
                const kpiMap = {};
                mapped.forEach((device, idx) => {
                    kpiMap[device.flespi_device_id] =
                        kpiResults[idx].status === "fulfilled" ? kpiResults[idx].value : null;
                });
                setDeviceKPI(kpiMap);
            }
            catch (error) {
                console.error("Failed to load operation devices:", error);
            }
        };
        loadDevices();
    }, [operationId]);
    const lastPositionUpdateRef = useRef(0);
    useEffect(() => {
        if (!mqttDeviceLiveLocation?.length)
            return;
        const now = Date.now();
        if (now - lastPositionUpdateRef.current < 200)
            return;
        lastPositionUpdateRef.current = now;
        setPositions((prev) => {
            const updated = [...prev];
            mqttDeviceLiveLocation.forEach(({ deviceId, value }) => {
                if (!value?.latitude || !value?.longitude)
                    return;
                const idx = updated.findIndex((p) => p.flespiDeviceId === deviceId);
                const newPos = {
                    flespiDeviceId: deviceId,
                    lat: value.latitude,
                    lon: value.longitude,
                    direction: value.direction || 0,
                    timestamp: Date.now(),
                };
                if (idx !== -1)
                    updated[idx] = newPos;
                else
                    updated.push(newPos);
            });
            return updated;
        });
    }, [mqttDeviceLiveLocation]);
    useEffect(() => {
        if (!mqttCalculatorIntervals?.length)
            return;
        console.log("[MQTT] calculator updates:", mqttCalculatorIntervals.length);
        setDeviceKPI((prev) => {
            const updated = { ...prev };
            mqttCalculatorIntervals.forEach((interval) => {
                if (!interval?.deviceId)
                    return;
                updated[interval.deviceId] = interval;
            });
            return updated;
        });
    }, [mqttCalculatorIntervals]);

    // Update vehicle markers on map
    const updateVehicleMarkers = useCallback(() => {
        if (!map.current)
            return;
        if (!showVehicles) {
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current.clear();
            return;
        }
        const vehiclesWithPos = displayVehicles.map((device) => {
            const live = positions.find((p) => p.flespiDeviceId === device.flespi_device_id);
            if (!live)
                return device;
            return {
                ...device,
                position: [Number(live.lon), Number(live.lat)],
                direction: live.direction || 0,
                lastUpdate: new Date(live.timestamp || Date.now()).toLocaleTimeString(),
            };
        });
        vehiclesWithPos.forEach((vehicle) => {
            const existingMarker = markersRef.current.get(vehicle.id);
            if (existingMarker) {
                existingMarker.setLngLat(vehicle.position);
            }
            else {
                const el = document.createElement("div");
                el.className = "vehicle-marker";
                el.style.cursor = "pointer";
                el.style.width = "48px";
                el.style.height = "32px";
                el.style.zIndex = "10";
                el.style.pointerEvents = "auto";
                el.style.transition = "transform 0.3s ease";
                el.style.filter = vehicle.status === "offline" ? "grayscale(1) opacity(0.5)" : "none";
                el.innerHTML = vehicle.type === "truck"
                    ? getDumpTruckSvgString("#ef4444")
                    : getLoaderSvgString("#f59e0b");
                el.addEventListener("click", (e) => {
                    e.stopPropagation();
                    showVehiclePopup(vehicle);
                });
                const marker = new mapboxgl.Marker({
                    element: el,
                    anchor: "center",
                })
                    .setLngLat(vehicle.position)
                    .addTo(map.current);
                markersRef.current.set(vehicle.id, marker);
            }
        });
        markersRef.current.forEach((marker, vehicleId) => {
            if (!vehiclesWithPos.find((v) => v.id === vehicleId)) {
                marker.remove();
                markersRef.current.delete(vehicleId);
            }
        });
    }, [displayVehicles, positions, showVehicles]);
    // Show vehicle popup with details
    const showVehiclePopup = (vehicle) => {
        if (!map.current)
            return;
        if (popupRef.current) {
            popupRef.current.remove();
        }
        if (popupRootRef.current) {
            popupRootRef.current.unmount();
            popupRootRef.current = null;
        }
        const kpi = deviceKPI[vehicle.flespi_device_id] || {};
        const popupVehicle = {
            id: vehicle.id,
            name: vehicle.device_name || vehicle.name || "Device",
            type: vehicle.type,
            position: vehicle.position,
            lastUpdate: kpi.timestamp
                ? new Date(kpi.timestamp).toLocaleTimeString()
                : vehicle.lastUpdate,
            efficiency: Number(kpi.efficiency ?? vehicle.efficiency ?? 0),
            trips: Number(kpi.trips ?? vehicle.trips ?? 0),
            fuelPerM3: Number(kpi.fuelPerM3 ?? vehicle.fuelPerM3 ?? 0),
            volumeM3: Number(kpi.avgVolumeM3 ?? vehicle.volumeM3 ?? 0),
            cycleTime: kpi.durationFormatted || vehicle.cycleTime || "-",
            queueTime: kpi.queueTimeFormatted || vehicle.queueTime || "-",
            status: vehicle.status || "active",
        };
        const flespiId = String(vehicle.flespi_device_id ?? vehicle.flespiId ?? vehicle.device_id ?? vehicle.id ?? "");
        const container = document.createElement("div");
        container.className = "operation-detail-popup";
        container.style.minWidth = "260px";
        popupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: true,
            offset: [0, -20],
            className: "vehicle-popup-wrapper",
            maxWidth: "320px",
        })
            .setLngLat(vehicle.position)
            .setDOMContent(container)
            .addTo(map.current);
        const root = createRoot(container);
        popupRootRef.current = root;
        root.render(_jsx(VehiclePopup, {
            vehicle: popupVehicle, onClose: () => {
                if (popupRef.current) {
                    popupRef.current.remove();
                    popupRef.current = null;
                }
            }, onLocate: () => {
                if (!map.current)
                    return;
                map.current.flyTo({ center: vehicle.position, zoom: Math.max(map.current.getZoom(), 16) });
            }, onSettings: () => {
                if (flespiId) {
                    navigate(`/operations/geofence/settings/${flespiId}`);
                }
            }, onAlert: () => {
                if (onAlertsToggle) {
                    onAlertsToggle();
                }
            }, onDetails: () => {
                if (flespiId) {
                    navigate(`/operations/geofence/dashboard/${flespiId}`);
                }
            }
        }));
    };
    // Initialize map once
    useEffect(() => {
        var _a;
        if (!mapContainer.current)
            return;
        if (map.current)
            return;
        mapboxgl.accessToken = MAPBOX_TOKEN;
        const initialStyleUrl = ((_a = mapStyles.find((s) => s.id === mapStyle)) === null || _a === void 0 ? void 0 : _a.url) || mapStyles[0].url;
        const mapInstance = new mapboxgl.Map({
            container: mapContainer.current,
            style: initialStyleUrl,
            center: center,
            zoom: zoom,
            pitch: 0,
            bearing: 0,
            antialias: true,
            attributionControl: false,
        });
        mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-left");
        mapInstance.addControl(new mapboxgl.ScaleControl(), "bottom-left");
        mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
        mapInstance.on("load", () => {
            console.log("Map loaded successfully");
            setIsLoaded(true);
        });
        mapInstance.on("style.load", () => {
            reapplyGeofences();
            addTracksToMap();
        });
        mapInstance.on("error", (e) => {
            console.error("Map error:", e);
        });
        map.current = mapInstance;
        return () => {
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current.clear();
            if (popupRef.current)
                popupRef.current.remove();
            if (map.current) {
                map.current.remove();
                map.current = null;
                setIsLoaded(false);
            }
        };
    }, []);
    useEffect(() => {
        if (!map.current)
            return;
        const handleStyleLoad = () => {
            reapplyGeofences();
            addTracksToMap();
        };
        map.current.on("style.load", handleStyleLoad);
        return () => {
            if (!map.current)
                return;
            map.current.off("style.load", handleStyleLoad);
        };
    }, [reapplyGeofences, addTracksToMap]);
    // Add zones when map loads or zones change
useEffect(() => {
    console.log("geofences effect fired", {
        showLabels,
        zonesCount: zones.length,
        hasOperationPolygon: Boolean(operationPolygon),
    });
    reapplyGeofences();
}, [reapplyGeofences, showLabels, zones, operationPolygon]);
useEffect(() => {
    if (!map.current)
        return;
    const fillId = "zones-fill";
    const lineId = "zones-line";
    if (map.current.getLayer(fillId)) {
        map.current.setPaintProperty(fillId, "fill-opacity", [
            "case",
            ["==", ["get", "zoneId"], selectedZoneId],
            0.45,
            0.3,
        ]);
    }
    if (map.current.getLayer(lineId)) {
        map.current.setPaintProperty(lineId, "line-width", [
            "case",
            ["==", ["get", "zoneId"], selectedZoneId],
            4,
            2.5,
        ]);
    }
}, [selectedZoneId]);
    // Update vehicles when they change
    useEffect(() => {
        var _a;
        if (isLoaded) {
            updateVehicleMarkers();
            if ((_a = map.current) === null || _a === void 0 ? void 0 : _a.isStyleLoaded()) {
                addTracksToMap();
            }
        }
    }, [isLoaded, updateVehicleMarkers, addTracksToMap]);
    useEffect(() => {
        if (!map.current || !isLoaded || !map.current.isStyleLoaded())
            return;
        addPOIMarkersToMap();
        mapLayers
            .filter((layer) => layer.type === "GeoJSON")
            .forEach((layer) => {
            if (layer.visible) {
                addGeoJSONLayerToMap(layer);
            }
            else {
                removeGeoJSONLayerFromMap(layer.id);
            }
        });
    }, [isLoaded, mapLayers, addPOIMarkersToMap, addGeoJSONLayerToMap, removeGeoJSONLayerFromMap]);
    useEffect(() => {
        if (!map.current || !isLoaded)
            return;
        if (operationPolygon && operationPolygon.geometry && operationPolygon.geometry.type === "Polygon") {
            const coords = operationPolygon.geometry.coordinates[0];
            const bounds = coords.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(coords[0], coords[0]));
            map.current.fitBounds(bounds, { padding: 80, duration: 500 });
            return;
        }
        map.current.flyTo({ center, zoom, duration: 500 });
    }, [center, zoom, isLoaded, operationPolygon]);
    // Change map style
    const changeMapStyle = (styleId) => {
        const style = mapStyles.find((s) => s.id === styleId);
        if (!style || !map.current)
            return;
        setMapStyle(styleId);
        map.current.setStyle(style.url);
        const reapplyLayers = () => {
            reapplyGeofences();
            addTracksToMap();
            addPOIMarkersToMap();
            mapLayers
                .filter((layer) => layer.type === "GeoJSON" && layer.visible)
                .forEach((layer) => addGeoJSONLayerToMap(layer));
        };
        map.current.once("style.load", reapplyLayers);
        map.current.once("idle", reapplyLayers);
    };
    const focusZone = useCallback((zone) => {
        if (!map.current || !zone?.polygon?.geometry)
            return;
        const geometry = zone.polygon.geometry;
        if (geometry.type !== "Polygon")
            return;
        const coords = geometry.coordinates?.[0] || [];
        if (!coords.length)
            return;
        const bounds = coords.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        map.current.fitBounds(bounds, { padding: 80, duration: 500 });
    }, []);
    useEffect(() => {
        if (!selectedZoneId)
            return;
        const zone = zones.find((item) => item.id === selectedZoneId);
        if (zone) {
            focusZone(zone);
        }
    }, [selectedZoneId, zones, focusZone]);
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
    const handleAddLayer = useCallback((type) => {
        if (type === "POI") {
            setLayersPanelOpen(false);
            setPOIWizardOpen(true);
        }
    }, []);
    const handleLayerToggle = useCallback((layerId) => {
        setMapLayers((prev) => prev.map((layer) => layer.id === layerId
            ? { ...layer, visible: !layer.visible }
            : layer));
        if (!operationId)
            return;
        const target = mapLayers.find((layer) => layer.id === layerId);
        if (target) {
            updateOperationLayer(operationId, layerId, {
                visible: !target.visible,
            }).catch((error) => {
                console.error("Failed to toggle layer:", error);
            });
        }
    }, [mapLayers, operationId]);
    const handleLayerDelete = useCallback((layerId) => {
        const layer = mapLayers.find((item) => item.id === layerId);
        if (layer?.type === "GeoJSON") {
            removeGeoJSONLayerFromMap(layerId);
        }
        setMapLayers((prev) => prev.filter((item) => item.id !== layerId));
        if (!operationId)
            return;
        deleteOperationLayer(operationId, layerId).catch((error) => {
            console.error("Failed to delete layer:", error);
        });
    }, [mapLayers, operationId, removeGeoJSONLayerFromMap]);
    const handleLayerRename = useCallback((layerId, name) => {
        setMapLayers((prev) => prev.map((layer) => layer.id === layerId
            ? { ...layer, name }
            : layer));
        if (!operationId)
            return;
        updateOperationLayer(operationId, layerId, { name }).catch((error) => {
            console.error("Failed to rename layer:", error);
        });
    }, [operationId]);
    const handleLayerOpacityChange = useCallback((layerId, opacity) => {
        setMapLayers((prev) => prev.map((layer) => layer.id === layerId
            ? { ...layer, opacity }
            : layer));
        if (!operationId)
            return;
        updateOperationLayer(operationId, layerId, { opacity }).catch((error) => {
            console.error("Failed to update layer opacity:", error);
        });
    }, [operationId]);
    const setLayerVisibility = useCallback((layerId, visibility) => {
        if (!map.current || !map.current.getLayer(layerId))
            return;
        map.current.setLayoutProperty(layerId, "visibility", visibility);
    }, []);
    const toggleZonesVisibility = useCallback((visible) => {
        const visibility = visible ? "visible" : "none";
        setLayerVisibility("zones-fill", visibility);
        setLayerVisibility("zones-line", visibility);
        setLayerVisibility("zones-label", visibility);
        setLayerVisibility("operation-fill", visibility);
        setLayerVisibility("operation-line", visibility);
    }, [setLayerVisibility]);
    const handleSystemLayerToggle = useCallback((layerId) => {
        setSystemLayers((prev) => prev.map((layer) => layer.id === layerId
            ? { ...layer, visible: !layer.visible }
            : layer));
        if (layerId === "tracks") {
            setShowTracks((prev) => !prev);
        }
        if (layerId === "vehicles") {
            setShowVehicles((prev) => !prev);
        }
        if (layerId === "zones") {
            setShowZones((prev) => !prev);
        }
    }, []);
    useEffect(() => {
        toggleZonesVisibility(showZones);
    }, [showZones, toggleZonesVisibility]);
    return (_jsxs("div", {
        className: cn("relative h-full", className), children: [_jsx("div", { ref: mapContainer, className: "absolute inset-0" }), !isLoaded && (_jsx("div", { className: "absolute inset-0 bg-background/80 flex items-center justify-center z-50", children: _jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "text-sm text-muted-foreground", children: "Loading map..." })] }) })), _jsx("div", {
            className: "absolute bottom-16 left-3 z-20", children: _jsxs("div", {
                className: cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm", isConnected
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"), children: [_jsx(Radio, { className: cn("w-3 h-3", isConnected && "animate-pulse") }), _jsx("span", { children: connectionStatus === "connected" ? "Live Tracking" : "Connecting..." })]
            })
        }), _jsxs("div", {
        className: "absolute top-3 right-80 flex gap-2 z-20", children: [_jsx(Button, { variant: "icon", size: "iconSm", onClick: () => {
                    const isSplitView = window.location.pathname.includes("/split");
                    const splitPath = operationGeofenceId
                        ? `/operations/${operationId}/split?geofenceId=${operationGeofenceId}`
                        : `/operations/${operationId}/split`;
                    navigate(isSplitView ? `/operations/${operationId}` : splitPath);
                }, className: "bg-card/90 border border-border shadow-lg backdrop-blur-sm", title: "Split view", children: _jsx(Columns2, { className: "w-4 h-4" }) }), _jsx(Button, { variant: layersPanelOpen ? "default" : "icon", size: "iconSm", onClick: () => {
                    setLayersPanelOpen(!layersPanelOpen);
                    setPOIWizardOpen(false);
                    setIsPickingPoint(false);
                    if (map.current) {
                        map.current.getCanvas().style.cursor = "";
                    }
                }, className: cn("shadow-lg backdrop-blur-sm", layersPanelOpen
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/90 border border-border"), title: "Layers", children: _jsx(Layers, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: () => setShowLabels(!showLabels), className: "bg-card/90 border border-border shadow-lg backdrop-blur-sm", title: showLabels ? "Hide labels" : "Show labels", children: showLabels ? _jsx(Eye, { className: "w-4 h-4" }) : _jsx(EyeOff, { className: "w-4 h-4" }) }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "icon", size: "iconSm", className: "bg-card/90 border border-border shadow-lg backdrop-blur-sm", title: "Map style", children: _jsx(MapIcon, { className: "w-4 h-4" }) }) }), _jsx(DropdownMenuContent, { align: "end", className: "w-44", children: mapStyles.map((style) => (_jsxs(DropdownMenuItem, { onClick: () => changeMapStyle(style.id), className: "flex items-center justify-between", children: [_jsx("span", { children: style.name }), mapStyle === style.id && _jsx(Check, { className: "w-4 h-4 text-primary" })] }, style.id))) })] }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: handleFullscreen, className: "bg-card/90 border border-border shadow-lg backdrop-blur-sm", title: "Fullscreen", children: _jsx(Maximize2, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: clearTracks, className: "bg-card/90 border border-border shadow-lg backdrop-blur-sm", title: "Clear tracks", children: _jsx(Trash2, { className: "w-4 h-4" }) }), _jsx(Button, {
                variant: alertsOpen ? "default" : "icon", size: "iconSm", onClick: onAlertsToggle, className: cn("shadow-lg backdrop-blur-sm", alertsOpen
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/90 border border-border"), title: "Toggle alerts", children: _jsx(Bell, { className: "w-4 h-4" })
            })]
        }), isPickingPoint && (_jsx("div", { className: "absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg", children: "Click on the map to pick a location" })), _jsx(LayersPanel, { isOpen: layersPanelOpen, onClose: () => setLayersPanelOpen(false), layers: mapLayers, systemLayers: systemLayers, onSystemLayerToggle: handleSystemLayerToggle, onAddLayer: handleAddLayer, onLayerToggle: handleLayerToggle, onLayerDelete: handleLayerDelete, onLayerRename: handleLayerRename, onLayerOpacityChange: handleLayerOpacityChange, onGeoJSONUpload: handleGeoJSONUpload }), _jsx(POILayerWizard, { isOpen: poiWizardOpen, onClose: () => {
                setPOIWizardOpen(false);
                setPickedPoint(null);
                setIsPickingPoint(false);
                if (map.current) {
                    map.current.getCanvas().style.cursor = "";
                }
            }, onCreateLayer: handleCreatePOILayer, onPickPoint: handlePickPoint, pickedPoint: pickedPoint })]
    }));
};
export default OperationDetailMap;
