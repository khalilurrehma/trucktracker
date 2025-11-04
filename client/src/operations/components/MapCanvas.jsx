import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Polygon, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { fetchOperationKPI } from "../../apis/deviceAssignmentApi"; // ✅ import API call

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

export default function MapCanvas({
  ops,
  zones,
  drawing,
  allDevices,
  mqttDeviceLiveLocation = [],
}) {
  const key = import.meta.env.VITE_GOOGLE_MAP_API;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: key,
    libraries: LIBS,
  });

  const [truckPositions, setTruckPositions] = useState({});
  const [hoveredDevice, setHoveredDevice] = useState(null);
  const [deviceKPI, setDeviceKPI] = useState({}); // ✅ store KPI data per device
  const mapRef = useRef(null);
  const overlayRef = useRef(null);

  // ✅ Keep one marker per device (live location)
  useEffect(() => {
    const updatedPositions = {};
    mqttDeviceLiveLocation.forEach((msg) => {
      const lat = parseFloat(msg.latitude);
      const lng = parseFloat(msg.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      updatedPositions[msg.deviceId] = { lat, lng };
    });
    setTruckPositions(updatedPositions);
  }, [mqttDeviceLiveLocation]);

  // ✅ Fetch KPI when hovering
  useEffect(() => {
    if (!hoveredDevice) return;
    const loadKPI = async () => {
      if (!deviceKPI[hoveredDevice]) {
        const kpi = await fetchOperationKPI(hoveredDevice);
        if (kpi) {
          setDeviceKPI((prev) => ({ ...prev, [hoveredDevice]: kpi }));
        }
      }
    };
    loadKPI();
  }, [hoveredDevice]);

  const selectedOperation = useMemo(
    () => ops.operations.find((p) => p.id === ops.selectedOperationId),
    [ops.operations, ops.selectedOperationId]
  );

  useEffect(() => {
    if (!mapRef.current || !selectedOperation) return;
    const geometry =
      typeof selectedOperation.geometry === "string"
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
  const hoverTimeout = useRef(null);
  if (loadError) return <div>Map failed to load.</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={MAP_STYLE}
      center={CENTER}
      zoom={16}
      onLoad={onMapLoad}
      options={{
        mapTypeId: "satellite",
        tilt: 0,
        heading: 0,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        zoomControl: true,
        clickableIcons: false,
      }}
    >
      {/* --- Operations polygons --- */}
      {ops.operations.map((p) => {
        const geometry = typeof p.geometry === "string" ? JSON.parse(p.geometry) : p.geometry;
        if (!geometry?.coordinates?.[0]) return null;
        const path = geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
        const selected = p.id === ops.selectedOperationId;
        return (
          <Polygon
            key={`op-${p.id}`}
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

      {/* --- Zones --- */}
      {zones.zones.map((z) => {
        const geometry = typeof z.geometry === "string" ? JSON.parse(z.geometry) : z.geometry;
        if (!geometry?.coordinates?.[0]) return null;
        const path = geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
        return (
          <Polygon
            key={`zone-${z.id}`}
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

      {/* --- Trucks + Hover KPI --- */}
      {Object.entries(truckPositions).map(([deviceId, pos]) => {
        const device = allDevices.find((d) => Number(d.flespiId) === Number(deviceId));
        if (!device) return null;

        const kpi = deviceKPI[deviceId];

        return (
          <React.Fragment key={`dev-${device.id}`}>
            <Marker
              position={pos}
              title={device.name}
              icon={{
                url: "https://maps.google.com/mapfiles/kml/shapes/truck.png",
                scaledSize: new window.google.maps.Size(36, 36),
              }}
              onMouseOver={() => {
                clearTimeout(hoverTimeout.current);
                setHoveredDevice(deviceId);
              }}
              onMouseOut={() => {
                hoverTimeout.current = setTimeout(() => {
                  setHoveredDevice(null);
                }, 300); // 300 ms delay avoids flicker
              }}
            />

            {hoveredDevice === deviceId && kpi && (
              <InfoWindow position={pos} onCloseClick={() => setHoveredDevice(null)}>
                <div
                  onMouseEnter={() => clearTimeout(hoverTimeout.current)}
                  onMouseLeave={() => setHoveredDevice(null)}
                  style={{
                    fontFamily: "Inter, Arial, sans-serif",
                    minWidth: 220,
                    background: "white",
                    borderRadius: 8,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                    padding: "10px 14px",
                    color: "#333",
                    lineHeight: 1.4,
                  }}
                >
                  <div
                    style={{
                      borderBottom: "1px solid #e0e0e0",
                      marginBottom: 6,
                      paddingBottom: 4,
                    }}
                  >
                    <strong style={{ color: "#1565c0", fontSize: 14 }}>{device.name}</strong>
                    <div style={{ fontSize: 11, color: "#666" }}>
                      {new Date(kpi.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    <div><strong>Eff.:</strong> {kpi.efficiency || 0}%</div>
                    <div><strong>Trips:</strong> {kpi.trips || 0}</div>
                    <div><strong>Vol. (m³):</strong> {kpi.avgVolumeM3 || 0}</div>
                    <div><strong>Fuel/m³:</strong> {kpi.fuelPerM3 || 0}</div>
                    <div><strong>Queue:</strong> {kpi.queueTimeAvgMin || 0}m</div>
                    <div><strong>Veh.:</strong> {kpi.vehicleCount || 0}</div>
                    <div><strong>Loaders:</strong> {kpi.loaderCount || 0}</div>
                  </div>
                </div>
              </InfoWindow>

            )}

          </React.Fragment>
        );
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
