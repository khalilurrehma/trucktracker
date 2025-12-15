import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-geometryutil";
import Swal from "sweetalert2";
import LocationSearchBox from "@/operations/components/LocationSearchBox";
/* ---------------- Satellite Tiles ---------------- */
const GOOGLE_SAT = "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
const GOOGLE_HYBRID = "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
const GOOGLE_TERRAIN = "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}";
const ESRI_SAT =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_TOPO =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
const DARK =
    "https://tiles.stadiamaps.com/tiles/alidade_dark/{z}/{x}/{y}{r}.png";
const LIGHT =
    "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";
const ZONE_COLORS = {
    QUEUE_AREA: "#2196F3",
    LOAD_PAD: "#4CAF50",
    DUMP_AREA: "#F44336",
    ZONE_AREA: "#9C27B0",
};
/* ========================================================================== */
/*              PURE JS — POINT IN POLYGON (never breaks in React)            */
/* ========================================================================== */
function isPointInsidePolygon(point, polygonLatLngs) {
    const x = point.lng;
    const y = point.lat;
    let inside = false;

    for (let i = 0, j = polygonLatLngs.length - 1; i < polygonLatLngs.length; j = i++) {
        const xi = polygonLatLngs[i].lng,
            yi = polygonLatLngs[i].lat;
        const xj = polygonLatLngs[j].lng,
            yj = polygonLatLngs[j].lat;

        const intersect =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0000001) + xi;

        if (intersect) inside = !inside;
    }
    return inside;
}

/* ========================================================================== */
/*                      FULLY STABLE GEOFENCE ZONE EDITOR                     */
/* ========================================================================== */
const GeofenceZoneEditor = ({ value, parentBoundary, otherGeofences = [], onChange, zoneType, circle }) => {
    const mapRef = useRef(null);
    const drawnItems = useRef(null);

    const parseGeo = (geo) => {
        if (!geo) return null;
        if (typeof geo === "string") {
            try { return JSON.parse(geo); } catch (err) { return null; }
        }
        return geo;
    };

    // Redraw when incoming value changes after mount
    useEffect(() => {
        if (!mapRef.current || !drawnItems.current) return;

        drawnItems.current.clearLayers();

        const g = parseGeo(value?.geometry);
        if (!g) return;

        const layer = L.geoJSON(g).getLayers()[0];
        if (!layer) return;

        const color = ZONE_COLORS[zoneType] || "#000";
        layer.setStyle({
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.25,
        });

        drawnItems.current.addLayer(layer);

        const center = layer.getBounds().getCenter();
        const label = L.marker(center, {
            icon: L.divIcon({
                className: "zone-label",
                html: `<div style="color:${color};font-size:16px;font-weight:bold;text-shadow:1px 1px 2px #000">${value?.name || ""}</div>`,
            }),
            interactive: false,
        });
        drawnItems.current.addLayer(label);

        mapRef.current.fitBounds(layer.getBounds());
    }, [value, zoneType]);

    useEffect(() => {
        if (!mapRef.current) return;
        if (!circle) return;

        const { lat, lng, radius } = circle;
        if (!lat || !lng || !radius) return;

        // Remove old shapes
        drawnItems.current.clearLayers();

        // Draw circle on map
        const layer = L.circle([lat, lng], {
            radius,
            color: "#2196F3",
            fillOpacity: 0.15,
            weight: 2
        });

        drawnItems.current.addLayer(layer);

        mapRef.current.setView([lat, lng], 16);

        // Convert circle to polygon (GeoJSON-friendly)
        const geometry = circleToPolygon(layer);

        onChange({
            geometry,
            area_sqm: Math.PI * radius * radius,
            area_ha: (Math.PI * radius * radius) / 10000
        });

    }, [circle]);
    /* -------------- Circle → Polygon conversion ---------------- */
    const circleToPolygon = (circle, points = 60) => {
        const center = circle.getLatLng();
        const radius = circle.getRadius();
        const coords = [];

        for (let i = 0; i < points; i++) {
            const angle = (i * 360) / points;
            const dest = L.GeometryUtil.destination(center, angle, radius);
            coords.push([dest.lng, dest.lat]);
        }
        coords.push(coords[0]); // close ring

        return { type: "Polygon", coordinates: [coords] };
    };

    useEffect(() => {
        if (!mapRef.current) {
            /* ------------------ INIT MAP ------------------ */
            mapRef.current = L.map("editor-map", {
                center: [-12.19, -77.015],
                zoom: 16,
            });

            /* ------------------ LAYERS ------------------ */
            const layers = {
                OpenStreetMap: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
                "Google Satellite": L.tileLayer(GOOGLE_SAT, { subdomains: ["mt0", "mt1", "mt2", "mt3"] }),
                "Google Hybrid": L.tileLayer(GOOGLE_HYBRID, { subdomains: ["mt0", "mt1", "mt2", "mt3"] }),
                "Google Terrain": L.tileLayer(GOOGLE_TERRAIN, { subdomains: ["mt0", "mt1", "mt2", "mt3"] }),
                "ESRI Satellite": L.tileLayer(ESRI_SAT),
                "ESRI Topographic": L.tileLayer(ESRI_TOPO),
                Dark: L.tileLayer(DARK),
                Light: L.tileLayer(LIGHT),
            };

            layers.OpenStreetMap.addTo(mapRef.current);
            L.control.layers(layers, {}, { collapsed: true }).addTo(mapRef.current);

            /* ------------------ DRAW GROUP ------------------ */
            drawnItems.current = new L.FeatureGroup();
            mapRef.current.addLayer(drawnItems.current);

            const drawControl = new L.Control.Draw({
                draw: {
                    polygon: true,
                    circle: true,
                    polyline: false, // corridor
                    rectangle: false,
                    circlemarker: false,
                    marker: false,
                },
                edit: { featureGroup: drawnItems.current },
            });

            mapRef.current.addControl(drawControl);

            /* ------------------ LOAD PARENT BOUNDARY ------------------ */
            const parentGeo = parseGeo(parentBoundary);
            /* ------------------ LOAD PARENT BOUNDARY ------------------ */
            let parentPoly = null;

            if (parentGeo) {
                const zoneColor = "#FF9800";

                /* CASE 1: Polygon (standard) */
                if (parentGeo.type === "Polygon") {
                    const ll = parentGeo.coordinates[0].map(([lng, lat]) =>
                        L.latLng(Number(lat), Number(lng))
                    );

                    parentPoly = L.polygon(ll, {
                        color: zoneColor,
                        weight: 2,
                        fillOpacity: 0.1,
                    }).addTo(mapRef.current);

                    mapRef.current.fitBounds(parentPoly.getBounds());
                }

                /* CASE 2: Circle boundary */
                if (parentGeo.type === "Circle") {
                    const [lng, lat] = parentGeo.coordinates;

                    parentPoly = L.circle([lat, lng], {
                        radius: parentGeo.radius,
                        color: zoneColor,
                        weight: 2,
                        fillOpacity: 0.1,
                    }).addTo(mapRef.current);

                    mapRef.current.fitBounds(parentPoly.getBounds());
                }

                /* CASE 3: Point boundary (convert to small circle) */
                if (parentGeo.type === "Point") {
                    const [lng, lat] = parentGeo.coordinates;

                    // ASSUMED minimum boundary radius (you can adjust)
                    const fallbackRadius = 40; // meters

                    parentPoly = L.circle([lat, lng], {
                        radius: fallbackRadius,
                        color: zoneColor,
                        weight: 2,
                        fillOpacity: 0.1,
                    }).addTo(mapRef.current);

                    mapRef.current.fitBounds(parentPoly.getBounds());
                }
            }

            otherGeofences.forEach((gf) => {
                if (!gf) return;

                // Allow both formats:
                // 1) { geometry, zoneType }
                // 2) geometry-only objects 
                const geometry = gf.geometry || gf;
                const geo = parseGeo(geometry);

                if (!geo || geo.type !== "Polygon") return;

                // Try to get zoneType
                const zoneType = gf.zoneType || gf.zone_type || null;
                const zoneColor = ZONE_COLORS[zoneType] || "#999";

                const ll = geo.coordinates[0].map(([lng, lat]) =>
                    L.latLng(Number(lat), Number(lng))
                );

                L.polygon(ll, {
                    color: zoneColor,
                    weight: 2,
                    fillOpacity: 0.05,
                    dashArray: "4,4",
                }).addTo(mapRef.current);
            });

            /* ------------------ PARENT CHECK ------------------ */
            /* ------------------ PARENT CHECK ------------------ */
            const isInsideParent = (geo) => {
                if (!parentPoly || !geo?.coordinates) return true;

                // A) Parent is a POLYGON
                if (parentPoly instanceof L.Polygon && !(parentPoly instanceof L.Circle)) {
                    const parentPts = parentPoly.getLatLngs()[0];

                    const childPts = geo.coordinates[0].map(([lng, lat]) =>
                        L.latLng(lat, lng)
                    );

                    return childPts.every((pt) =>
                        isPointInsidePolygon(pt, parentPts)
                    );
                }

                // B) Parent is a CIRCLE
                if (parentPoly instanceof L.Circle) {
                    const center = parentPoly.getLatLng();
                    const radius = parentPoly.getRadius();

                    const childPts = geo.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng));

                    // every point of child polygon must be inside circle radius
                    return childPts.every((pt) => center.distanceTo(pt) <= radius);
                }

                // fallback: no validation
                return true;
            };

            /* ------------------ CREATED ------------------ */
            mapRef.current.on(L.Draw.Event.CREATED, (evt) => {
                const layer = evt.layer;

                let geo, area_sqm, area_ha;

                if (layer instanceof L.Circle) {
                    geo = circleToPolygon(layer);
                    const r = layer.getRadius();
                    area_sqm = Math.PI * r * r;
                    area_ha = area_sqm / 10000;
                } else {
                    geo = layer.toGeoJSON().geometry;
                    const latlngs = layer.getLatLngs()[0];
                    area_sqm = L.GeometryUtil.geodesicArea(latlngs);
                    area_ha = area_sqm / 10000;
                }
                const color = ZONE_COLORS[zoneType] || "#000";

                layer.setStyle({
                    color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.25,
                });

                /* check parent */
                if (!isInsideParent(geo)) {
                    Swal.fire({
                        icon: "error",
                        title: "Invalid Zone",
                        text: "Zone must be completely inside the Operation.",
                    });
                    return;
                }

                drawnItems.current.clearLayers();
                drawnItems.current.addLayer(layer);

                onChange({ geometry: geo, area_sqm, area_ha });
            });

            /* ------------------ EDITED ------------------ */
            mapRef.current.on(L.Draw.Event.EDITED, (e) => {
                const layer = Object.values(e.layers._layers)[0];

                let geo, area_sqm, area_ha;

                if (layer instanceof L.Circle) {
                    geo = circleToPolygon(layer);
                    const r = layer.getRadius();
                    area_sqm = Math.PI * r * r;
                    area_ha = area_sqm / 10000;
                } else {
                    geo = layer.toGeoJSON().geometry;
                    const latlngs = layer.getLatLngs()[0];
                    area_sqm = L.GeometryUtil.geodesicArea(latlngs);
                    area_ha = area_sqm / 10000;
                }

                if (!isInsideParent(geo)) {
                    Swal.fire({
                        icon: "error",
                        title: "Invalid Zone",
                        text: "Zone must be completely inside the Operation.",
                    });
                    return;
                }

                onChange({ geometry: geo, area_sqm, area_ha });
            });

            /* ------------------ LOAD EXISTING SHAPE ------------------ */
            if (value?.geometry) {
                const g = parseGeo(value.geometry);
                const layer = L.geoJSON(g).getLayers()[0];

                const color = ZONE_COLORS[zoneType] || "#000";

                layer.setStyle({
                    color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.25,
                });

                drawnItems.current.addLayer(layer);

                /* add label */
                const center = layer.getBounds().getCenter();
                const label = L.marker(center, {
                    icon: L.divIcon({
                        className: "zone-label",
                        html: `<div style="color:${color};font-size:16px;font-weight:bold;text-shadow:1px 1px 2px #000">${value.name}</div>`,
                    }),
                    interactive: false,
                });
                drawnItems.current.addLayer(label);

                mapRef.current.fitBounds(layer.getBounds());
            }
        }
    }, [value, parentBoundary, onChange, zoneType]);
    /* ------------------ SHOW OTHER GEOFENCES (VISUAL ONLY) ------------------ */

    return (
        <div style={{ marginTop: 20, position: "relative" }}>
            <LocationSearchBox mapRef={mapRef} />
            <div
                id="editor-map"
                style={{
                    height: "500px",
                    border: "1px solid #ccc",
                    borderRadius: 8,
                }}
            />
        </div>
    );
};

export default GeofenceZoneEditor;
