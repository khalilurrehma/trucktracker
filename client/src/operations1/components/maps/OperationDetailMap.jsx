import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createRoot } from "react-dom/client";
import { cn } from "../../lib/utils";
import { Maximize2, Layers, Bell, Eye, EyeOff, Radio, Trash2, Check } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "../ui/dropdown-menu";
import { zoneTypeColors } from "../operations/ZonesSidebar";
import VehicleMarker from "../../../operations/components/VehicleMarker";
import TruckInfoCard from "../../../operations/components/TruckInfoCard";
import "../../../operations/components/TruckInfoCard.css";
import "./OperationDetailMap.css";
import { useAppContext } from "../../../AppContext";
import { getDevicesByPositionOperation, fetchOperationKPI } from "../../../apis/deviceAssignmentApi";
const MAPBOX_TOKEN = "pk.eyJ1IjoibmV4dG9wbGRhIiwiYSI6ImNtamJndjZ5ajBka3MzZHJ6c2hycmR3MGgifQ.zFdt6Si2E-Yc92j93x2phA";
const mapStyles = [
    { id: "satellite-streets", name: "Satellite Streets", url: "mapbox://styles/mapbox/satellite-streets-v12" },
    { id: "satellite", name: "Satellite", url: "mapbox://styles/mapbox/satellite-v9" },
    { id: "dark", name: "Dark", url: "mapbox://styles/mapbox/dark-v11" },
    { id: "light", name: "Light", url: "mapbox://styles/mapbox/light-v11" },
    { id: "streets", name: "Streets", url: "mapbox://styles/mapbox/streets-v12" },
    { id: "outdoors", name: "Outdoors", url: "mapbox://styles/mapbox/outdoors-v12" },
];
const OperationDetailMap = ({ className, zones, selectedZoneId, center = [-76.9, -15.5], zoom = 12, onAlertsToggle, alertsOpen, operationId, operationPolygon, }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef(new Map());
    const popupRef = useRef(null);
    const popupRootRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mapStyle, setMapStyle] = useState("satellite-streets");
    const [showLabels, setShowLabels] = useState(true);
    const [showTracks, setShowTracks] = useState(true);
    const [apiVehicles, setApiVehicles] = useState([]);
    const [positions, setPositions] = useState([]);
    const [deviceKPI, setDeviceKPI] = useState({});
    const clearTracks = () => {};
    const { mqttDeviceLiveLocation, mqttCalculatorIntervals, mqttDeviceConnected } = useAppContext();
    const isConnected = Boolean(mqttDeviceConnected?.length);
    const connectionStatus = isConnected ? "connected" : "disconnected";
    useEffect(() => {
        console.log("[MQTT] connection:", { isConnected, connectionStatus, mqttDeviceConnected });
    }, [isConnected, connectionStatus, mqttDeviceConnected]);
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
        zones.forEach((zone, index) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const sourceId = `zone-${zone.id}`;
            const fillId = `zone-fill-${zone.id}`;
            const lineId = `zone-line-${zone.id}`;
            const labelId = `zone-label-${zone.id}`;
            const labelSourceId = `label-source-${zone.id}`;
            // Remove existing layers/sources if they exist
            try {
                if ((_a = map.current) === null || _a === void 0 ? void 0 : _a.getLayer(labelId))
                    map.current.removeLayer(labelId);
                if ((_b = map.current) === null || _b === void 0 ? void 0 : _b.getLayer(lineId))
                    map.current.removeLayer(lineId);
                if ((_c = map.current) === null || _c === void 0 ? void 0 : _c.getLayer(fillId))
                    map.current.removeLayer(fillId);
                if ((_d = map.current) === null || _d === void 0 ? void 0 : _d.getSource(labelSourceId))
                    map.current.removeSource(labelSourceId);
                if ((_e = map.current) === null || _e === void 0 ? void 0 : _e.getSource(sourceId))
                    map.current.removeSource(sourceId);
            }
            catch (e) {
                console.log("Error removing layers:", e);
            }
            const polygon = zone.polygon || generateMockPolygon(zone, index);
            const color = zoneTypeColors[zone.type];
            // Add source
            (_f = map.current) === null || _f === void 0 ? void 0 : _f.addSource(sourceId, {
                type: "geojson",
                data: polygon,
            });
            // Add fill layer
            (_g = map.current) === null || _g === void 0 ? void 0 : _g.addLayer({
                id: fillId,
                type: "fill",
                source: sourceId,
                paint: {
                    "fill-color": color,
                    "fill-opacity": selectedZoneId === zone.id ? 0.45 : 0.3,
                },
            });
            // Add line layer
            (_h = map.current) === null || _h === void 0 ? void 0 : _h.addLayer({
                id: lineId,
                type: "line",
                source: sourceId,
                paint: {
                    "line-color": color,
                    "line-width": selectedZoneId === zone.id ? 4 : 2.5,
                    "line-opacity": 1,
                },
            });
            // Add label
            if (showLabels && polygon.geometry.type === "Polygon") {
                const coords = polygon.geometry.coordinates[0];
                const centerPoint = calculatePolygonCenter(coords);
                (_j = map.current) === null || _j === void 0 ? void 0 : _j.addSource(labelSourceId, {
                    type: "geojson",
                    data: {
                        type: "Feature",
                        properties: { name: zone.name },
                        geometry: {
                            type: "Point",
                            coordinates: centerPoint,
                        },
                    },
                });
                (_k = map.current) === null || _k === void 0 ? void 0 : _k.addLayer({
                    id: labelId,
                    type: "symbol",
                    source: labelSourceId,
                    layout: {
                        "text-field": ["get", "name"],
                        "text-size": 13,
                        "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
                        "text-anchor": "center",
                        "text-allow-overlap": true,
                    },
                    paint: {
                        "text-color": "#ffffff",
                        "text-halo-color": color,
                        "text-halo-width": 2,
                    },
                });
            }
        });
    }, [zones, selectedZoneId, showLabels, generateMockPolygon]);

    const addOperationToMap = useCallback(() => {
        var _a, _b, _c, _d;
        if (!map.current || !operationPolygon) {
            return;
        }
        if (map.current.getLayer("operation-line") && map.current.getSource("operation-geo")) {
            return;
        }
        const sourceId = "operation-geo";
        const fillId = "operation-fill";
        const lineId = "operation-line";
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
        (_d = map.current) === null || _d === void 0 ? void 0 : _d.addSource(sourceId, {
            type: "geojson",
            data: operationPolygon,
        });
        map.current.addLayer({
            id: fillId,
            type: "fill",
            source: sourceId,
            paint: {
                "fill-color": "#facc15",
                "fill-opacity": 0.05,
            },
        });
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
        try {
            map.current.moveLayer(lineId);
        }
        catch (e) {
            // Ignore move errors if layer order changes
        }
    }, [operationPolygon]);
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
                el.style.width = "60px";
                el.style.height = "80px";
                el.style.zIndex = "10";
                el.style.pointerEvents = "auto";
                el.style.transition = "transform 0.3s ease";
                el.style.filter = vehicle.status === "offline" ? "grayscale(1) opacity(0.5)" : "none";
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
                const root = createRoot(el);
                el._reactRoot = root;
            }
            const el = markersRef.current.get(vehicle.id)?.getElement();
            const root = el?._reactRoot;
            if (root) {
                root.render(_jsx("div", { style: { width: "60px", height: "80px", pointerEvents: "auto" }, children: _jsx(VehicleMarker, { type: vehicle.type, deviceName: vehicle.name, heading: vehicle.heading || 0, direction: vehicle.direction || 0 }) }));
            }
        });
        markersRef.current.forEach((marker, vehicleId) => {
            if (!vehiclesWithPos.find((v) => v.id === vehicleId)) {
                marker.remove();
                markersRef.current.delete(vehicleId);
            }
        });
    }, [displayVehicles, positions]);
    // Show vehicle popup with details
    const showVehiclePopup = (vehicle) => {
        if (!map.current) return;
        if (popupRef.current) {
            popupRef.current.remove();
        }
        if (popupRootRef.current) {
            popupRootRef.current.unmount();
            popupRootRef.current = null;
        }
        const container = document.createElement("div");
        container.className = "operation-detail-popup";
        container.style.minWidth = "260px";
        popupRef.current = new mapboxgl.Popup({
            closeButton: true,
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
        root.render(_jsx(TruckInfoCard, { device: {
                device_name: vehicle.device_name || vehicle.name,
                name: vehicle.name,
                flespi_device_id: vehicle.flespi_device_id,
            }, kpi: {
                efficiency: vehicle.efficiency,
                trips: vehicle.trips,
                fuelPerM3: vehicle.fuelPerM3,
                avgVolumeM3: vehicle.volumeM3,
                durationFormatted: vehicle.cycleTime,
                queueTimeFormatted: vehicle.queueTime,
                timestamp: vehicle.lastUpdate,
            } }));
    };
    // Initialize map on mount
    useEffect(() => {
        var _a;
        if (!mapContainer.current)
            return;
        // Skip if already initialized
        if (map.current)
            return;
        mapboxgl.accessToken = MAPBOX_TOKEN;
        const currentStyleUrl = ((_a = mapStyles.find((s) => s.id === mapStyle)) === null || _a === void 0 ? void 0 : _a.url) || mapStyles[0].url;
        const mapInstance = new mapboxgl.Map({
            container: mapContainer.current,
            style: currentStyleUrl,
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
    }, [center, zoom, mapStyle]);
    // Add zones when map loads or zones change
    useEffect(() => {
        if (!map.current)
            return;
        const handleIdle = () => {
            addZonesToMap();
            addOperationToMap();
        };
        map.current.once("idle", handleIdle);
        return () => {
            if (!map.current)
                return;
            map.current.off("idle", handleIdle);
        };
    }, [addZonesToMap, addOperationToMap]);
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
        map.current.once("style.load", () => {
            addZonesToMap();
            addOperationToMap();
            addTracksToMap();
        });
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
    return (_jsxs("div", { className: cn("relative h-full", className), children: [_jsx("div", { ref: mapContainer, className: "absolute inset-0" }), !isLoaded && (_jsx("div", { className: "absolute inset-0 bg-background/80 flex items-center justify-center z-50", children: _jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "text-sm text-muted-foreground", children: "Loading map..." })] }) })), _jsx("div", { className: "absolute bottom-16 left-3 z-20", children: _jsxs("div", { className: cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm", isConnected
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"), children: [_jsx(Radio, { className: cn("w-3 h-3", isConnected && "animate-pulse") }), _jsx("span", { children: connectionStatus === "connected" ? "Live Tracking" : "Connecting..." })] }) }), _jsxs("div", { className: "absolute top-3 right-80 flex gap-2 z-20", children: [_jsx(Button, { variant: "icon", size: "iconSm", onClick: () => setShowLabels(!showLabels), className: "bg-card/90 border border-border shadow-lg backdrop-blur-sm", title: showLabels ? "Hide labels" : "Show labels", children: showLabels ? _jsx(Eye, { className: "w-4 h-4" }) : _jsx(EyeOff, { className: "w-4 h-4" }) }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "icon", size: "iconSm", className: "bg-card/90 border border-border shadow-lg backdrop-blur-sm", title: "Map layers", children: _jsx(Layers, { className: "w-4 h-4" }) }) }), _jsx(DropdownMenuContent, { align: "end", className: "w-44", children: mapStyles.map((style) => (_jsxs(DropdownMenuItem, { onClick: () => changeMapStyle(style.id), className: "flex items-center justify-between", children: [_jsx("span", { children: style.name }), mapStyle === style.id && _jsx(Check, { className: "w-4 h-4 text-primary" })] }, style.id))) })] }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: handleFullscreen, className: "bg-card/90 border border-border shadow-lg backdrop-blur-sm", title: "Fullscreen", children: _jsx(Maximize2, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: clearTracks, className: "bg-card/90 border border-border shadow-lg backdrop-blur-sm", title: "Clear tracks", children: _jsx(Trash2, { className: "w-4 h-4" }) }), _jsx(Button, { variant: alertsOpen ? "default" : "icon", size: "iconSm", onClick: onAlertsToggle, className: cn("shadow-lg backdrop-blur-sm", alertsOpen
                            ? "bg-primary text-primary-foreground"
                            : "bg-card/90 border border-border"), title: "Toggle alerts", children: _jsx(Bell, { className: "w-4 h-4" }) })] })] }));
};
export default OperationDetailMap;

