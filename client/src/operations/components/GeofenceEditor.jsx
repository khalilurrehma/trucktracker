import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-geometryutil";
import "leaflet-geosearch/dist/geosearch.css";
import LocationSearchBox from "@/operations/components/LocationSearchBox";
/* ---------------- Base Layers ---------------- */
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
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";

const AdvancedGeofenceEditor = ({ value, onChange, circle }) => {
  const mapRef = useRef(null);
  const drawnItems = useRef(null);

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
      mapRef.current = L.map("editor-map", {
        center: [-12.19, -77.015],
        zoom: 16,
      });

      /* ---- Basemap Layers ---- */
      const layers = {
        OpenStreetMap: L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ),
        "Google Satellite": L.tileLayer(GOOGLE_SAT, {
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }),
        "Google Hybrid": L.tileLayer(GOOGLE_HYBRID, {
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }),
        "Google Terrain": L.tileLayer(GOOGLE_TERRAIN, {
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }),
        "ESRI Satellite": L.tileLayer(ESRI_SAT),
        "ESRI Topographic": L.tileLayer(ESRI_TOPO),
        Dark: L.tileLayer(DARK),
        Light: L.tileLayer(LIGHT),
      };

      layers.OpenStreetMap.addTo(mapRef.current);
      L.control.layers(layers, {}, { collapsed: true }).addTo(mapRef.current);

      /* ---- Draw Controls ---- */
      drawnItems.current = new L.FeatureGroup();
      mapRef.current.addLayer(drawnItems.current);

      const drawControl = new L.Control.Draw({
        draw: {
          polygon: true,
          circle: true,
          rectangle: false,
          marker: false,
          polyline: false,
          circlemarker: false,
        },
        edit: { featureGroup: drawnItems.current },
      });

      mapRef.current.addControl(drawControl);

      /* ---- CREATE ---- */
      mapRef.current.on(L.Draw.Event.CREATED, (evt) => {
        const layer = evt.layer;

        let geo, area_sqm, area_ha;

        if (layer instanceof L.Circle) {
          geo = circleToPolygon(layer);
          const radius = layer.getRadius();
          area_sqm = Math.PI * radius * radius;
        } else {
          geo = layer.toGeoJSON().geometry;
          const latlngs = layer.getLatLngs()[0];
          area_sqm = L.GeometryUtil.geodesicArea(latlngs);
        }

        area_ha = area_sqm / 10000;

        drawnItems.current.clearLayers();
        drawnItems.current.addLayer(layer);

        onChange({
          geometry: geo,
          area_sqm,
          area_ha,
        });
      });

      /* ---- EDIT ---- */
      mapRef.current.on(L.Draw.Event.EDITED, (evt) => {
        const layer = Object.values(evt.layers._layers)[0];
        let geo = layer.toGeoJSON().geometry;

        let area_sqm = null;

        if (layer instanceof L.Circle) {
          geo = circleToPolygon(layer);
          const radius = layer.getRadius();
          area_sqm = Math.PI * radius * radius;
        } else {
          const latlngs = layer.getLatLngs()[0];
          area_sqm = L.GeometryUtil.geodesicArea(latlngs);
        }

        const area_ha = area_sqm / 10000;

        onChange({
          geometry: geo,
          area_sqm,
          area_ha,
        });
      });

      /* ---- Load Existing Shape ---- */
      if (value?.geometry) {
        const g = parseGeo(value.geometry);
        let layer = null;

        if (g.type === "Polygon" || g.type === "MultiPolygon") {
          layer = L.geoJSON(g).getLayers()[0];
        }

        if (layer) {
          drawnItems.current.addLayer(layer);
          mapRef.current.fitBounds(layer.getBounds());
        }
      }
    }
  }, [value, onChange]);

  return (
    <div style={{ marginTop: 20, position: "relative" }}>

      <LocationSearchBox mapRef={mapRef} />

      <div
        id="editor-map"
        style={{
          height: 500,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />
    </div>
  );

};

export default AdvancedGeofenceEditor;

