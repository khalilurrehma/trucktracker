import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import "leaflet-geometryutil";

// satellite tiles
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

const AdvancedGeofenceEditor = ({ value, onChange }) => {
  const mapRef = useRef(null);
  const drawnItems = useRef(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("editor-map", {
        center: [-12.190, -77.015],
        zoom: 16,
      });

      /** BASEMAPS */
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
        "Dark Map": L.tileLayer(DARK),
        "Light Map": L.tileLayer(LIGHT),
      };

      layers.OpenStreetMap.addTo(mapRef.current);

      L.control.layers(layers, {}, { collapsed: true }).addTo(mapRef.current);

      /** DRAW TOOLS */
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
        edit: {
          featureGroup: drawnItems.current,
        },
      });

      mapRef.current.addControl(drawControl);

      /** ON CREATE */
      mapRef.current.on(L.Draw.Event.CREATED, (evt) => {
        drawnItems.current.clearLayers();
        drawnItems.current.addLayer(evt.layer);

        const geo = evt.layer.toGeoJSON().geometry;

        let area_sqm = null;
        let area_ha = null;

        // Only polygons have area
        if (geo.type === "Polygon") {
          const latlngs = evt.layer.getLatLngs()[0]; // outer ring
          area_sqm = L.GeometryUtil.geodesicArea(latlngs);
          area_ha = area_sqm / 10000;
        }

        onChange({
          geometry: geo,
          area_sqm,
          area_ha,
        });
      });

      /** ON EDIT */
      mapRef.current.on(L.Draw.Event.EDITED, (e) => {
        const layer = Object.values(e.layers._layers)[0];
        const geo = layer.toGeoJSON().geometry;

        let area_sqm = null;
        let area_ha = null;

        if (geo.type === "Polygon") {
          const latlngs = layer.getLatLngs()[0];
          area_sqm = L.GeometryUtil.geodesicArea(latlngs);
          area_ha = area_sqm / 10000;
        }

        onChange({
          geometry: geo,
          area_sqm,
          area_ha,
        });
      });

      /** LOAD EXISTING SHAPE */
      if (value?.geometry) {
        const layer = L.geoJSON(value.geometry).getLayers()[0];
        drawnItems.current.addLayer(layer);
        mapRef.current.fitBounds(layer.getBounds());
      }
    }
  }, [value, onChange]);

  return (
    <div style={{ marginTop: 20 }}>
      <div
        id="editor-map"
        style={{
          height: "500px",
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />
    </div>
  );
};

export default AdvancedGeofenceEditor;
