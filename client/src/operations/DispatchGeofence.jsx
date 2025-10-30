import React, { useRef, useState, useEffect } from "react";
import { GoogleMap, Polygon, Marker, useJsApiLoader } from "@react-google-maps/api";
import {
  ArrowLeft,
} from "lucide-react";
import {
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  createOperation,
  getAllOperations,
  getOperationById,
  updateOperation,
  deleteOperation,
} from "../apis/operationApi";
import {
  createZone,
  getAllZones,
  getZoneById,
  updateZone,
  deleteZone,
} from "../apis/zoneApi";
import { useDispatch, useSelector } from "react-redux";
const LIBS = ["drawing", "geometry"];
const MAP_STYLE = { width: "100%", height: "74vh" };
const CENTER = { lat: -12.0464, lng: -77.0428 };

const COLORS = {
  OPERATION: "#2e7d32",
  SELECTED_OPERATION: "#004d40",
  QUEUE: "#f9a825",
  LOADING: "#e53935",
  DUMP: "#6a1b9a",
  OTHER: "#1e88e5",
  INVALID: "#d32f2f",
};

export default function OperationZoneManager() {
  const key = import.meta.env.VITE_GOOGLE_MAP_API;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: key,
    libraries: LIBS,
  });

  const [operations, setOperations] = useState([]);
  const [zones, setZones] = useState(() => load("pz_zones"));
  const [selectedOperationId, setSelectedOperationId] = useState(null);
  const [mode, setMode] = useState("OPERATION");
  const [name, setName] = useState("");
  const [op_max_speed_kmh, setOpMaxSpeedKmh] = useState("");
  const [op_total_bank_volume_m3, setOpTotalBankVolume] = useState("");
  const [op_swell_factor, setOpSwellFactor] = useState("");
  const [zoneType, setZoneType] = useState("QUEUE_AREA");
  const [capacity, setCapacity] = useState("");
  const [devices, setDevices] = useState("");
  const [ideal_queue_duration_m, setIdealQueueDurationM] = useState("");
  const [max_vehicles_count, setMaxVehiclesCount] = useState("");
  const [dump_area_max_duration_min, setDumpAreaMaxDurationMin] = useState("");
  const [load_pad_max_duration_min, setLoadPadMaxDurationMin] = useState("");
  const [zone_max_speed_kmh, setZoneMaxSpeedKmh] = useState("");
  const [zone_bank_volume_m3, setZoneBankVolumeM3] = useState("");
  const [zone_bank_swell_factor, setZoneBankSwellFactor] = useState("");

  const [area, setArea] = useState({ sqm: 0, ha: 0 });
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const userId = useSelector((state) => state.session.user.id);
  useEffect(() => {
    const fetchOperationsAndZones = async () => {
      try {
        // Fetch operations
        const allOperations = await getAllOperations();
        setOperations(allOperations);

        // Fetch zones
        const allZones = await getAllZones();
        setZones(allZones);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchOperationsAndZones();
  }, []);
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
        fillColor: COLORS[mode === "OPERATION" ? "OPERATION" : zoneType],
        fillOpacity: 0.25,
        strokeColor: COLORS[mode === "OPERATION" ? "OPERATION" : zoneType],
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
      setArea({ sqm, ha: sqm / 10000 });

      if (mode === "ZONE" && selectedOperationId) {
        const operation = operations.find((p) => p.id === selectedOperationId);
        if (operation) {
          const operationPoly = new g.maps.Polygon({
            paths: operation.geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat })),
          });
          const inside = isPolygonInside(g, path, operationPoly);
          if (!inside) {
            e.overlay.setOptions({
              strokeColor: COLORS.INVALID,
              fillColor: COLORS.INVALID,
            });
            alert("❌ Zone must be completely inside the operation boundary.");
            setTimeout(() => e.overlay.setMap(null), 1500);
            overlayRef.current = null;
            setArea({ sqm: 0, ha: 0 });
          }
        }
      }
    });
  };

  function isPolygonInside(g, zonePath, operationPoly) {
    const operationPath = operationPoly.getPath().getArray();

    const allInside = zonePath.every((pt) =>
      g.maps.geometry.poly.containsLocation(pt, operationPoly)
    );
    if (!allInside) return false;

    const zonePoly = new g.maps.Polygon({ paths: zonePath });
    const operationInside = operationPath.some((pt) =>
      g.maps.geometry.poly.containsLocation(pt, zonePoly)
    );
    if (operationInside) return false;

    if (edgesIntersect(zonePath, operationPath)) return false;

    return true;
  }

  function edgesIntersect(pathA, pathB) {
    for (let i = 0; i < pathA.length; i++) {
      const a1 = pathA[i];
      const a2 = pathA[(i + 1) % pathA.length];
      for (let j = 0; j < pathB.length; j++) {
        const b1 = pathB[j];
        const b2 = pathB[(j + 1) % pathB.length];
        if (segmentsIntersect(a1, a2, b1, b2)) return true;
      }
    }
    return false;
  }

  function segmentsIntersect(p1, p2, q1, q2) {
    const o1 = orientation(p1, p2, q1);
    const o2 = orientation(p1, p2, q2);
    const o3 = orientation(q1, q2, p1);
    const o4 = orientation(q1, q2, p2);
    return o1 !== o2 && o3 !== o4;
  }

  function orientation(p, q, r) {
    const val =
      (q.lat() - p.lat()) * (r.lng() - q.lng()) -
      (q.lng() - p.lng()) * (r.lat() - q.lat());
    if (Math.abs(val) < 1e-12) return 0;
    return val > 0 ? 1 : 2;
  }

  const handleSave = async () => {
    const g = window.google;

    // Step 1: Ensure that the polygon is drawn
    if (!overlayRef.current) return alert("Draw polygon first!");

    // Get the coordinates of the drawn polygon
    const path = overlayRef.current.getPath().getArray();
    const coords = path.map((p) => [p.lng(), p.lat()]);

    // Close the polygon (if not already closed)
    closeRing(coords);

    // Calculate the area of the drawn polygon
    const sqm = g.maps.geometry.spherical.computeArea(path);

    // Step 2: Handle the creation of an operation
    if (mode === "OPERATION") {
      const operation = {
        id: uid(),  // Generate a unique ID for the new operation
        name: name || `operation_${operations.length + 1}`,
        geometry: { type: "Polygon", coordinates: [coords] },
        area_sqm: sqm,
        area_ha: sqm / 10000,
        user_id: userId,
        op_max_speed_kmh,
        op_total_bank_volume_m3,
        op_swell_factor,
      };

      try {
        // Save the operation to the backend
        const newOperation = await createOperation(operation);
        // Add the new operation to the state
        setOperations([newOperation, ...operations]);
        setSelectedOperationId(newOperation.id);
      } catch (error) {
        console.error("Error saving operation:", error);
      }

    } else {
      // Step 3: Handle the creation of a zone
      if (!selectedOperationId) return alert("Select an operation first!");

      const operation = operations.find((p) => p.id === selectedOperationId);
      if (!operation) return alert("Operation not found!");

      // Parse the geometry if it's in string format
      const geometry = typeof operation.geometry === 'string' ? JSON.parse(operation.geometry) : operation.geometry;

      // Ensure geometry is valid
      if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates[0])) {
        console.error(`Invalid geometry for operation ${operation.id}`);
        return alert("Invalid geometry for operation. Please check the operation data.");
      }

      // Validate if the drawn zone is inside the operation boundary
      const operationPoly = new g.maps.Polygon({
        paths: geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat })),
      });

      const inside = isPolygonInside(g, path, operationPoly);
      if (!inside) {
        if (overlayRef.current) {
          overlayRef.current.setMap(null);  // Remove the invalid polygon
          overlayRef.current = null;
        }
        setArea({ sqm: 0, ha: 0 });
        alert("Zone must be completely inside the operation boundary.");
        return;
      }

      // Step 4: Create the zone object
      const zone = {
        id: uid(),  // Generate a unique ID for the new zone
        operationId: selectedOperationId,
        name: name || `Zone_${zones.length + 1}`,
        zoneType,
        capacity: capacity ? Number(capacity) : null,
        geometry: { type: "Polygon", coordinates: [coords] },  // Ensure 'coords' is correctly set
        area_sqm: sqm,
        area_ha: sqm / 10000,

        // Add conditionally rendered fields based on zoneType
        ...(zoneType === "QUEUE_AREA" && {
          ideal_queue_duration_m,
          max_vehicles_count,
        }),

        ...(zoneType === "DUMP_AREA" && {
          dump_area_max_duration_min,
        }),

        ...(zoneType === "LOAD_PAD" && {
          load_pad_max_duration_min,
        }),

        ...(zoneType === "ZONE_AREA" && {
          zone_max_speed_kmh,
          zone_bank_volume_m3,
          zone_bank_swell_factor,
        }),
      };

      try {
        // Save the zone to the backend
        const newZone = await createZone(zone);
        // Add the new zone to the state
        setZones([newZone, ...zones]);
      } catch (error) {
        console.error("Error saving zone:", error);
      }
    }

    // Step 5: Reset the form and states
    overlayRef.current.setMap(null);
    overlayRef.current = null;
    setName("");
    setCapacity("");
    setDevices("");
    setOpMaxSpeedKmh("");
    setOpTotalBankVolume("");
    setOpSwellFactor("");
    setArea({ sqm: 0, ha: 0 });
  };


  const deleteOperation = async (id) => {
    try {
      await deleteOperation(id);  // Delete operation via API
      setOperations(operations.filter((p) => p.id !== id));
      setZones(zones.filter((z) => z.operationId !== id));
    } catch (error) {
      console.error("Error deleting operation:", error);
    }
  };

  const deleteZone = async (id) => {
    try {
      await deleteZone(id);  // Delete zone via API
      setZones(zones.filter((z) => z.id !== id));
    } catch (error) {
      console.error("Error deleting zone:", error);
    }
  };

  if (loadError) return <div>Map failed to load.</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  const ZoneLegend = () => (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: 10,
        background: "rgba(1, 1, 1, 0.9)",
        padding: "8px 12px",
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        fontSize: 12,
        zIndex: 10,
      }}
    >
      <b>Zone Legend</b>
      <div style={{ marginTop: 4 }}>
        {Object.entries({
          QUEUE: COLORS.QUEUE,
          LOADING: COLORS.LOADING,
          DUMP: COLORS.DUMP,
          OTHER: COLORS.OTHER,
        }).map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
            <div
              style={{
                width: 14,
                height: 14,
                background: color,
                borderRadius: 2,
                marginRight: 6,
                border: "1px solid #555",
              }}
            ></div>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr" }}>
      <div style={{ padding: 12, borderRight: "1px solid #ddd" }}>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <h3>Operations & Zones</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <ModeButton active={mode === "OPERATION"} onClick={() => setMode("OPERATION")}>
            Operation Mode
          </ModeButton>
          <ModeButton active={mode === "ZONE"} onClick={() => setMode("ZONE")}>
            Zone Mode
          </ModeButton>
        </div>

        <div style={card()}>

          {mode === "OPERATION" && (
            <>
              <input
                placeholder={"Operation name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={input()}
              />
              <input
                type="number"
                placeholder="Max Speed (km/h)"
                value={op_max_speed_kmh}
                onChange={(e) => setOpMaxSpeedKmh(e.target.value)}
                style={input()}
              />
              <input
                type="number"
                placeholder="Total Bank Volume (m³)"
                value={op_total_bank_volume_m3}
                onChange={(e) => setOpTotalBankVolume(e.target.value)}
                style={input()}
              />
              <input
                type="number"
                placeholder="Swell Factor"
                value={op_swell_factor}
                onChange={(e) => setOpSwellFactor(e.target.value)}
                style={input()}
              />
            </>
          )}
          {mode === "ZONE" && (
            <>
              <input
                placeholder={"Zone name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={input()}
              />

              <select
                value={zoneType}
                onChange={(e) => setZoneType(e.target.value)}
                style={input()}
              >
                <option value="QUEUE_AREA">QUEUE_AREA</option>
                <option value="LOAD_PAD">LOAD_PAD</option>
                <option value="DUMP_AREA">DUMP_AREA</option>
                <option value="ZONE_AREA">ZONE_AREA</option>
              </select>

              {/* Conditionally Render Fields Based on zoneType */}
              {zoneType === "QUEUE_AREA" && (
                <>
                  <input
                    type="number"
                    placeholder="Ideal Queue Duration (m)"
                    value={ideal_queue_duration_m}
                    onChange={(e) => setIdealQueueDurationM(e.target.value)}
                    style={input()}
                  />
                  <input
                    type="number"
                    placeholder="Max Vehicles Count"
                    value={max_vehicles_count}
                    onChange={(e) => setMaxVehiclesCount(e.target.value)}
                    style={input()}
                  />
                </>
              )}

              {zoneType === "DUMP_AREA" && (
                <input
                  type="number"
                  placeholder="Dump Area Max Duration (min)"
                  value={dump_area_max_duration_min}
                  onChange={(e) => setDumpAreaMaxDurationMin(e.target.value)}
                  style={input()}
                />
              )}

              {zoneType === "LOAD_PAD" && (
                <input
                  type="number"
                  placeholder="Load Pad Max Duration (min)"
                  value={load_pad_max_duration_min}
                  onChange={(e) => setLoadPadMaxDurationMin(e.target.value)}
                  style={input()}
                />
              )}

              {zoneType === "ZONE_AREA" && (
                <>
                  <input
                    type="number"
                    placeholder="Zone Max Speed (km/h)"
                    value={zone_max_speed_kmh}
                    onChange={(e) => setZoneMaxSpeedKmh(e.target.value)}
                    style={input()}
                  />
                  <input
                    type="number"
                    placeholder="Zone Bank Volume (m³)"
                    value={zone_bank_volume_m3}
                    onChange={(e) => setZoneBankVolumeM3(e.target.value)}
                    style={input()}
                  />
                  <input
                    type="number"
                    placeholder="Zone Bank Swell Factor"
                    value={zone_bank_swell_factor}
                    onChange={(e) => setZoneBankSwellFactor(e.target.value)}
                    style={input()}
                  />
                </>
              )}
            </>
          )}

          <div style={{ fontSize: 12, marginTop: 4 }}>
            Area: <b>{fmt(area.sqm)} m²</b> | <b>{fmt(area.ha)} ha</b>
          </div>
          <button onClick={handleSave} style={btn()}>
            💾 Save {mode}
          </button>
        </div>

        <div style={card()}>
          <h4>Operations</h4>
          {operations.map((p) => (
            <div key={p.id} style={{ fontSize: 13, marginBottom: 4 }}>
              <span
                onClick={() => setSelectedOperationId(p.id)}
                style={{
                  cursor: "pointer",
                  fontWeight: p.id === selectedOperationId ? 700 : 400,
                  color: p.id === selectedOperationId ? "#000" : "#555",
                }}
              >
                {p.name}
              </span>
              <button style={btnSmall()} onClick={() => deleteOperation(p.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>

        {selectedOperationId && (
          <div style={card()}>
            <h4>Zones</h4>
            {zones.map((z) => (
              <div key={z.id} style={{ fontSize: 13, marginBottom: 6 }}>
                <div>
                  <b>{z.name}</b> ({z.zoneType}) —{" "}
                  {z.devices?.length ? z.devices.join(", ") : "No devices"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <input
                    type="text"
                    placeholder="Add/remove devices (comma separated)"
                    defaultValue={z.devices?.join(", ") || ""}
                    style={{ ...input(), width: "75%" }}
                    onBlur={(e) => updateZoneDevices(z.id, e.target.value)}
                  />
                  <button style={btnSmall()} onClick={() => deleteZone(z.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      {/* MAP */}
      <div>
        <ZoneLegend />
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
          {/* operationS */}
          {operations && operations.length > 0 ? (
            operations.map((p) => {
              // Parse geometry string to object if it's a string
              const geometry = typeof p.geometry === 'string' ? JSON.parse(p.geometry) : p.geometry;

              // Ensure geometry is valid
              if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates[0])) {
                console.error(`Invalid geometry for operation ${p.id}`);
                return null; // Skip rendering this operation if geometry is invalid
              }

              const path = geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
              const selected = p.id === selectedOperationId;

              return (
                <Polygon
                  key={p.id}
                  paths={path}
                  onClick={() => setSelectedOperationId(p.id)}
                  options={{
                    strokeColor: selected ? COLORS.SELECTED_OPERATION : COLORS.OPERATION,
                    strokeWeight: selected ? 3 : 1.5,
                    fillColor: selected ? COLORS.SELECTED_OPERATION : COLORS.OPERATION,
                    fillOpacity: selected ? 0.1 : 0.05,
                  }}
                />
              );
            })
          ) : (
            <div>No operations available</div>
          )}



          {/* ZONES */}
          {zones.map((z) => {
  // Parse geometry if it's a string, otherwise use it directly
  const geometry = typeof z.geometry === 'string' ? JSON.parse(z.geometry) : z.geometry;

  // Ensure geometry is valid (check if coordinates are an array and have at least one set of coordinates)
  if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates[0])) {
    console.error(`Invalid geometry for zone ${z.id}`);
    return null; // Skip rendering this zone if geometry is invalid
  }

  // Convert coordinates into an array of LatLng objects that Google Maps API expects
  const path = geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));

  return (
    <Polygon
      key={z.id}
      paths={path}
      options={{
        strokeColor: COLORS[z.zoneType] || COLORS.OTHER,  // Use zoneType to determine the color
        strokeWeight: 2,
        fillColor: COLORS[z.zoneType] || COLORS.OTHER,
        fillOpacity: 0.2,
      }}
    />
  );
})}


        </GoogleMap>
      </div>
    </div>
  );
}

/* ===== HELPERS ===== */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function fmt(n) {
  return (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function closeRing(coords) {
  if (!coords.length) return;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);
}
function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function card() {
  return { border: "1px solid #eee", borderRadius: 10, padding: 10, marginTop: 10 };
}
function input() {
  return {
    width: "100%",
    padding: "8px 10px",
    color: "black",
    borderRadius: 8,
    border: "1px solid #ccc",
    marginTop: 6,
  };
}
function btn() {
  return {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    background: "#000",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    marginTop: 8,
  };
}
function btnSmall() {
  return {
    padding: "2px 5px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#000",
    color: "#fff",
    cursor: "pointer",
    fontSize: 11,
    marginLeft: 6,
  };
}
function ModeButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "6px 10px",
        borderRadius: 8,
        border: active ? "2px solid #000" : "1px solid #ccc",
        background: active ? "#000" : "#fff",
        color: active ? "#fff" : "#000",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}
