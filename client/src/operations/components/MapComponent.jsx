import React, { useRef, useState } from "react";
import { GoogleMap, Polygon, Marker, useJsApiLoader } from "@react-google-maps/api";

// Google Map style and center
const MAP_STYLE = { width: "100%", height: "74vh" };
const CENTER = { lat: -12.0464, lng: -77.0428 };

// Color settings for operations and zones
const COLORS = {
  OPERATION: "#2e7d32", // Operation color
  SELECTED_OPERATION: "#004d40", // Selected operation color
  QUEUE: "#f9a825", // Queue color
  LOADING: "#e53935", // Loading color
  DUMP: "#6a1b9a", // Dump color
  OTHER: "#1e88e5", // Other color
  INVALID: "#d32f2f", // Invalid color for error handling
};

export default function MapComponent({ operations, zones, handleMapLoad }) {
  const key = import.meta.env.VITE_GOOGLE_MAP_API;  // Fetching Google API key
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: key,
    libraries: ["drawing", "geometry"],
  });

  const mapRef = useRef(null); // Map reference
  const overlayRef = useRef(null); // Overlay reference (used for zone drawing)

  const [selectedOperationId, setSelectedOperationId] = useState(null); // Selected operation

  const onMapLoad = (map) => {
    mapRef.current = map;
    handleMapLoad(map); // Handle map load logic
  };

  const onOverlayComplete = (e) => {
    const path = e.overlay.getPath().getArray();
    const polygon = new window.google.maps.Polygon({ paths: path });

    if (overlayRef.current) overlayRef.current.setMap(null); // Remove old overlays
    overlayRef.current = e.overlay;

    // Check if the zone is inside the operation
    const operation = operations.find((p) => p.id === selectedOperationId);
    if (operation) {
      const operationPoly = new window.google.maps.Polygon({
        paths: operation.geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat })),
      });

      const isInside = isPolygonInside(polygon, operationPoly);
      if (!isInside) {
        e.overlay.setOptions({
          strokeColor: COLORS.INVALID,
          fillColor: COLORS.INVALID,
        });
        alert("❌ Zone must be completely inside the operation boundary.");
        setTimeout(() => e.overlay.setMap(null), 1500);
        overlayRef.current = null;
      }
    }
  };

  // Check if zone is completely inside operation (geofence logic)
  function isPolygonInside(zonePoly, operationPoly) {
    const g = window.google;
    const zonePath = zonePoly.getPath().getArray();
    const operationPath = operationPoly.getPath().getArray();

    // Check if every vertex of the zone is inside the operation polygon
    const allInside = zonePath.every((pt) =>
      g.maps.geometry.poly.containsLocation(pt, operationPoly)
    );

    // Check if any vertex of the operation is inside the zone polygon
    const operationInside = operationPath.some((pt) =>
      g.maps.geometry.poly.containsLocation(pt, zonePoly)
    );

    return allInside && !operationInside;
  }

  // Map rendering logic
  if (loadError) return <div>Map failed to load.</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={MAP_STYLE}
      center={CENTER}
      zoom={13}
      onLoad={onMapLoad}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      }}
    >
      {/* Operations */}
      {operations.map((p) => {
        const path = p.geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
        return (
          <Polygon
            key={p.id}
            paths={path}
            options={{
              strokeColor: COLORS.OPERATION,
              strokeWeight: 2,
              fillColor: COLORS.OPERATION,
              fillOpacity: 0.1,
            }}
          />
        );
      })}

      {/* Zones */}
      {zones.map((z) => {
        const path = z.geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
        return (
          <Polygon
            key={z.id}
            paths={path}
            options={{
              strokeColor: COLORS[z.zoneType] || COLORS.OTHER,
              strokeWeight: 2,
              fillColor: COLORS[z.zoneType] || COLORS.OTHER,
              fillOpacity: 0.2,
            }}
          />
        );
      })}
    </GoogleMap>
  );
}
