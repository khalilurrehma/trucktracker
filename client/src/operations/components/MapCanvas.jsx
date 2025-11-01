import React, { useEffect, useMemo, useRef } from "react";
import { GoogleMap, Polygon, Marker, useJsApiLoader } from "@react-google-maps/api";
import Swal from "sweetalert2";

const LIBS = ["drawing", "geometry"];
const MAP_STYLE = { width: "100%", height: "74vh" };
const CENTER = { lat: -12.0464, lng: -77.0428 };

const COLORS = {
  OPERATION: "#00c853",
  SELECTED_OPERATION: "#64ffda",
  QUEUE_AREA: "#fbc02d",
  LOAD_PAD: "#ef5350",
  DUMP_AREA: "#ab47bc",
  ZONE_AREA: "#42a5f5",
  INVALID: "#ff1744",
};

const FLEET_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f0efe8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#a2daf2" }] },
  { featureType: "landscape.man_made", stylers: [{ color: "#f7f1df" }] },
  { featureType: "landscape.natural", stylers: [{ color: "#dbe5c6" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#cdeac0" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#000" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fbc880" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fdfcf8" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#444444" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

export default function MapCanvas({
  ops,                // { operations, selectedOperationId, setSelectedOperationId, mode }
  zones,              // { zones }
  drawing,            // { setGeometry }
  allDevices,         // array
}) {
  const key = import.meta.env.VITE_GOOGLE_MAP_API;
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: key, libraries: LIBS });

  const mapRef = useRef(null);
  const overlayRef = useRef(null);

  const selectedOperation = useMemo(
    () => ops.operations.find((p) => p.id === ops.selectedOperationId),
    [ops.operations, ops.selectedOperationId]
  );

  useEffect(() => {
    if (!mapRef.current || !selectedOperation) return;
    const geometry = typeof selectedOperation.geometry === "string"
      ? JSON.parse(selectedOperation.geometry)
      : selectedOperation.geometry;
    if (!geometry?.coordinates?.[0]) return;

    const g = window.google;
    const bounds = new g.maps.LatLngBounds();
    geometry.coordinates[0].forEach(([lng, lat]) => bounds.extend({ lat, lng }));
    mapRef.current.fitBounds(bounds);
  }, [selectedOperation]);

  const onMapLoad = (map) => {
    mapRef.current = map;
    const g = window.google;
    if (!g?.maps?.drawing) return;

    const dm = new g.maps.drawing.DrawingManager({
      drawingMode: g.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: g.maps.ControlPosition.TOP_LEFT,
        drawingModes: ["polygon"],
      },
      polygonOptions: {
        fillColor: COLORS[ops.mode === "OPERATION" ? "OPERATION" : "ZONE_AREA"],
        fillOpacity: 0.3,
        strokeColor: COLORS[ops.mode === "OPERATION" ? "OPERATION" : "ZONE_AREA"],
        strokeWeight: 2,
        editable: true,
      },
    });
    dm.setMap(map);

    g.maps.event.addListener(dm, "overlaycomplete", (e) => {
      if (overlayRef.current) overlayRef.current.setMap(null);
      overlayRef.current = e.overlay;
      const path = e.overlay.getPath().getArray();
      const sqm = g.maps.geometry.spherical.computeArea(path);
      const coords = path.map((p) => [p.lng(), p.lat()]);
      const ring = closeRing(coords);
      drawing.setGeometry(ring, sqm);
    });
  };

  if (loadError) return <div>Map failed to load.</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={MAP_STYLE}
      center={CENTER}
      zoom={13}
      onLoad={onMapLoad}
      options={{
        styles: FLEET_MAP_STYLE,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        backgroundColor: "#000",
        zoomControl: true,
        clickableIcons: false,
      }}
    >
      {/* Operations */}
      {ops.operations.map((p) => {
        const geometry = typeof p.geometry === "string" ? JSON.parse(p.geometry) : p.geometry;
        if (!geometry?.coordinates?.[0]) return null;
        const path = geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
        const selected = p.id === ops.selectedOperationId;
        return (
          <Polygon
            key={p.id}
            paths={path}
            onClick={() => ops.setSelectedOperationId(p.id)}
            options={{
              strokeColor: selected ? COLORS.SELECTED_OPERATION : COLORS.OPERATION,
              strokeWeight: selected ? 3 : 1.5,
              fillColor: selected ? COLORS.SELECTED_OPERATION : COLORS.OPERATION,
              fillOpacity: selected ? 0.15 : 0.1,
            }}
          />
        );
      })}

      {/* Zones */}
      {zones.zones.map((z) => {
        const geometry = typeof z.geometry === "string" ? JSON.parse(z.geometry) : z.geometry;
        if (!geometry?.coordinates?.[0]) return null;
        const path = geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
        return (
          <Polygon
            key={z.id}
            paths={path}
            options={{
              strokeColor: COLORS[z.zoneType] || COLORS.ZONE_AREA,
              strokeWeight: 2,
              fillColor: COLORS[z.zoneType] || COLORS.ZONE_AREA,
              fillOpacity: 0.25,
            }}
          />
        );
      })}

      {/* Device markers at zone centroid */}
      {zones.zones
        .filter((z) => Array.isArray(z.devices) && z.devices.some((d) => d?.device_id || typeof d === "number"))
        .flatMap((z) => {
          const geometry = typeof z.geometry === "string" ? JSON.parse(z.geometry) : z.geometry;
          if (!geometry?.coordinates?.[0]) return [];
          const coords = geometry.coordinates[0];
          const center = {
            lng: coords.reduce((sum, [lng]) => sum + lng, 0) / coords.length,
            lat: coords.reduce((sum, [, lat]) => sum + lat, 0) / coords.length,
          };
          return (z.devices || [])
            .map((dRaw) => {
              const id = typeof dRaw === "object" ? dRaw.device_id : dRaw;
              const device = allDevices.find((dev) => dev.id === id) || {};
              return (
                <Marker
                  key={`device-${z.id}-${id}`}
                  position={center}
                  title={`${device.name || "Device"} (${z.name})`}
                  icon={{
                    url: device.completed
                      ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                      : "https://maps.google.com/mapfiles/kml/shapes/truck.png",
                  }}
                  onClick={() =>
                    Swal.fire({
                      icon: "info",
                      title: `${device.name || "Device"} assigned to ${z.name}`,
                    })
                  }
                />
              );
            });
        })}
    </GoogleMap>
  );
}

function closeRing(coords) {
  if (!coords.length) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);
  return coords;
}
