import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-geometryutil";
import Swal from "sweetalert2";

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
const GeofenceZoneEditor = ({ value, parentBoundary, onChange }) => {
    const mapRef = useRef(null);
    const drawnItems = useRef(null);

    const parseGeo = (geo) => {
        if (!geo) return null;
        if (typeof geo === "string") {
            try { return JSON.parse(geo); } catch (err) { return null; }
        }
        return geo;
    };

    /* Circle → Polygon */
    const circleToPolygon = (circle, points = 60) => {
        const center = circle.getLatLng();
        const radius = circle.getRadius();
        const coords = [];

        for (let i = 0; i < points; i++) {
            const angle = (i * 360) / points;
            const dest = L.GeometryUtil.destination(center, angle, radius);
            coords.push([dest.lng, dest.lat]);
        }
        coords.push(coords[0]);
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
            let parentPoly = null;

            if (parentGeo?.type === "Polygon") {
                const ll = parentGeo.coordinates[0].map(
                    ([lng, lat]) => L.latLng(Number(lat), Number(lng))
                );

                parentPoly = L.polygon(ll, {
                    color: "#FF9800",
                    weight: 2,
                    fillOpacity: 0.1,
                }).addTo(mapRef.current);

                mapRef.current.fitBounds(parentPoly.getBounds());
            }

            /* ------------------ PARENT CHECK ------------------ */
            const isInsideParent = (geo) => {
                if (!parentPoly || !geo?.coordinates) return true;

                const pts = geo.coordinates[0].map(
                    ([lng, lat]) => L.latLng(lat, lng)
                );

                const parentPts = parentPoly.getLatLngs()[0];

                return pts.every((pt) =>
                    isPointInsidePolygon(pt, parentPts)
                );
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
                drawnItems.current.addLayer(layer);
                mapRef.current.fitBounds(layer.getBounds());
            }
        }
    }, [value, parentBoundary, onChange]);

    return (
        <div style={{ marginTop: 20 }}>
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
