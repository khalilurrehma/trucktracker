import React, { useRef, useState, useEffect } from "react";
import {
  GoogleMap,
  Polygon,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import Swal from "sweetalert2";
import { ArrowLeft } from "lucide-react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
} from "@mui/material";
import {
  createOperation,
  getAllOperations,
  deleteOperation as apiDeleteOperation,
} from "../apis/operationApi";
import {
  getFlespiDevices,
  getFlespiDevicesByUserId,
} from "../apis/api";
import {
  createZone,
  getAllZones,
  deleteZone as apiDeleteZone,
} from "../apis/zoneApi";
import {
  createDeviceAssignment,
  getAllDeviceAssignments,
  markDeviceAssignmentComplete,
  deleteDeviceAssignment,
} from "../apis/deviceAssignmentApi";
import { useSelector } from "react-redux";

/* ======= GOOGLE MAP CONFIG ======= */
const LIBS = ["drawing", "geometry"];
const MAP_STYLE = { width: "100%", height: "74vh" };
const CENTER = { lat: -12.0464, lng: -77.0428 };

const FLEET_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f0efe8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#a2daf2" }] },
  { featureType: "landscape.man_made", stylers: [{ color: "#f7f1df" }] },
  { featureType: "landscape.natural", stylers: [{ color: "#dbe5c6" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#cdeac0" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fbc880" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fdfcf8" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#444444" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

const COLORS = {
  OPERATION: "#00c853",
  SELECTED_OPERATION: "#64ffda",
  QUEUE_AREA: "#fbc02d",
  LOAD_PAD: "#ef5350",
  DUMP_AREA: "#ab47bc",
  ZONE_AREA: "#42a5f5",
  INVALID: "#ff1744",
};

export default function OperationZoneManager() {
  const key = import.meta.env.VITE_GOOGLE_MAP_API;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: key,
    libraries: LIBS,
  });

  const [operations, setOperations] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedOperationId, setSelectedOperationId] = useState(null);
  const [mode, setMode] = useState("OPERATION");
  const [name, setName] = useState("");
  const [op_max_speed_kmh, setOpMaxSpeedKmh] = useState("");
  const [op_total_bank_volume_m3, setOpTotalBankVolume] = useState("");
  const [op_swell_factor, setOpSwellFactor] = useState("");
  const [zoneType, setZoneType] = useState("QUEUE_AREA");
  const [ideal_queue_duration_m, setIdealQueueDurationM] = useState("");
  const [max_vehicles_count, setMaxVehiclesCount] = useState("");
  const [dump_area_max_duration_min, setDumpAreaMaxDurationMin] = useState("");
  const [load_pad_max_duration_min, setLoadPadMaxDurationMin] = useState("");
  const [zone_max_speed_kmh, setZoneMaxSpeedKmh] = useState("");
  const [zone_bank_volume_m3, setZoneBankVolumeM3] = useState("");
  const [zone_bank_swell_factor, setZoneBankSwellFactor] = useState("");
  const [area, setArea] = useState({ sqm: 0, ha: 0 });
  const [allDevices, setAllDevices] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]);

  const navigate = useNavigate();
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const userId = useSelector((state) => state.session.user.id);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allOps = await getAllOperations();
        setOperations(allOps);
        const allZones = await getAllZones();
        setZones(allZones);
        const response =
          userId === 1
            ? await getFlespiDevices()
            : await getFlespiDevicesByUserId(userId);

        const filterAssignedDevices = response?.data?.filter(
          (device) => device.shift_assigned === 0
        );

        setAllDevices(filterAssignedDevices);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    fetchData();
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
        fillOpacity: 0.3,
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
    });
  };
  const focusOnPolygon = (geometry) => {
    if (!mapRef.current || !geometry?.coordinates?.[0]) return;

    const g = window.google;
    const bounds = new g.maps.LatLngBounds();
    geometry.coordinates[0].forEach(([lng, lat]) => bounds.extend({ lat, lng }));

    mapRef.current.fitBounds(bounds);
  };

  const handleSave = async () => {
    const g = window.google;
    if (!overlayRef.current)
      return Swal.fire({ icon: "info", title: "Draw a polygon first!" });

    const path = overlayRef.current.getPath().getArray();
    const coords = path.map((p) => [p.lng(), p.lat()]);
    closeRing(coords);
    const sqm = g.maps.geometry.spherical.computeArea(path);

    try {
      if (mode === "OPERATION") {
        const operation = {
          name: name || `operation_${operations.length + 1}`,
          geometry: { type: "Polygon", coordinates: [coords] },
          area_sqm: sqm,
          area_ha: sqm / 10000,
          user_id: userId,
          op_max_speed_kmh,
          op_total_bank_volume_m3,
          op_swell_factor,
        };
        const newOp = await createOperation(operation);
        setOperations([newOp, ...operations]);
        setSelectedOperationId(newOp.id);
      } else {
        if (!selectedOperationId)
          return Swal.fire({ icon: "warning", title: "Select an operation first!" });

        const zone = {
          operationId: selectedOperationId,
          name: name || `zone_${zones.length + 1}`,
          zoneType,
          geometry: { type: "Polygon", coordinates: [coords] },
          area_sqm: sqm,
          area_ha: sqm / 10000,
          ideal_queue_duration_m,
          max_vehicles_count,
          dump_area_max_duration_min,
          load_pad_max_duration_min,
          zone_max_speed_kmh,
          zone_bank_volume_m3,
          zone_bank_swell_factor,
        };
        const newZone = await createZone(zone);
        setZones([newZone, ...zones]);
      }

      Swal.fire({
        icon: "success",
        title: `${mode} saved successfully!`,
        timer: 1500,
        showConfirmButton: false,
      });

      overlayRef.current.setMap(null);
      overlayRef.current = null;
      setName("");
      setOpMaxSpeedKmh("");
      setOpTotalBankVolume("");
      setOpSwellFactor("");
      setArea({ sqm: 0, ha: 0 });
    } catch (error) {
      console.error("Error saving:", error);
      Swal.fire({ icon: "error", title: "Error saving data" });
    }
  };

  const handleDeleteOperation = async (id) => {
    try {
      await apiDeleteOperation(id);
      setOperations((ops) => ops.filter((p) => p.id !== id));
      setZones((z) => z.filter((zone) => zone.operationId !== id));
      Swal.fire({ icon: "success", title: "Operation deleted" });
    } catch {
      Swal.fire({ icon: "error", title: "Error deleting operation" });
    }
  };

  const handleDeleteZone = async (id) => {
    try {
      await apiDeleteZone(id);
      setZones((z) => z.filter((zone) => zone.id !== id));
      Swal.fire({ icon: "success", title: "Zone deleted" });
    } catch {
      Swal.fire({ icon: "error", title: "Error deleting zone" });
    }
  };

  const handleAssignDevices = async (zoneId, selectedDeviceIds) => {
    try {
      const zone = zones.find((z) => z.id === zoneId);
      let current = zone?.devices || [];
      const normalizeIds = (arr) =>
        arr
          .map((d) => (typeof d === "object" ? Number(d.device_id || d.id) : Number(d)))
          .filter((n) => !isNaN(n) && n > 0);
      current = normalizeIds(current);
      const selected = normalizeIds(selectedDeviceIds);
      const toAdd = selected.filter((id) => !current.includes(id));
      const toRemove = current.filter((id) => !selected.includes(id));

      setZones((prev) =>
        prev.map((z) => (z.id === zoneId ? { ...z, devices: selected } : z))
      );

      for (const id of toAdd)
        await createDeviceAssignment({
          device_id: id,
          operation_id: Number(selectedOperationId),
          zone_id: Number(zoneId),
        });

      for (const id of toRemove)
        await deleteDeviceAssignment({
          device_id: id,
          operation_id: Number(selectedOperationId),
          zone_id: Number(zoneId),
        });

      Swal.fire({
        icon: "success",
        title: "Device assignments updated!",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Error updating assignments" });
    }
  };

  const handleMarkCompleted = async (zoneId) => {
    try {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone || !zone.devices?.length)
        return Swal.fire({
          icon: "warning",
          title: "No devices assigned to this zone.",
        });

      for (const deviceId of zone.devices)
        await markDeviceAssignmentComplete(deviceId);

      setZones((prevZones) =>
        prevZones.map((z) =>
          z.id === zoneId
            ? {
              ...z,
              devices: z.devices.map((id) => {
                const device = allDevices.find((d) => d.id === id);
                if (device) device.completed = true;
                return id;
              }),
            }
            : z
        )
      );

      Swal.fire({
        icon: "success",
        title: "✅ Devices marked as completed!",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error marking work complete.",
      });
    }
  };

  if (loadError) return <div>Map failed to load.</div>;
  if (!isLoaded) return <div>Loading map...</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr" }}>
      <div style={{ padding: 12, borderRight: "1px solid #333", color: "white", background: "#111" }}>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2, color: "white" }}
        >
          Back
        </Button>

        <h3>Operations & Zones</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <ModeButton active={mode === "OPERATION"} onClick={() => setMode("OPERATION")}>
            Operation
          </ModeButton>
          <ModeButton active={mode === "ZONE"} onClick={() => setMode("ZONE")}>
            Zone
          </ModeButton>
        </div>

        <div style={card()}>
          {mode === "OPERATION" && (
            <>
              <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={input()} />
              <input type="number" placeholder="Max Speed (km/h)" value={op_max_speed_kmh} onChange={(e) => setOpMaxSpeedKmh(e.target.value)} style={input()} />
              <input type="number" placeholder="Bank Volume (m³)" value={op_total_bank_volume_m3} onChange={(e) => setOpTotalBankVolume(e.target.value)} style={input()} />
              <input type="number" placeholder="Swell Factor" value={op_swell_factor} onChange={(e) => setOpSwellFactor(e.target.value)} style={input()} />
            </>
          )}

          {mode === "ZONE" && (<> <input placeholder={"Zone name"} value={name} onChange={(e) => setName(e.target.value)} style={input()} /> <select value={zoneType} onChange={(e) => setZoneType(e.target.value)} style={input()} > <option value="QUEUE_AREA">QUEUE_AREA</option> <option value="LOAD_PAD">LOAD_PAD</option> <option value="DUMP_AREA">DUMP_AREA</option> <option value="ZONE_AREA">ZONE_AREA</option> </select> {/* Conditionally Render Fields Based on zoneType */} {zoneType === "QUEUE_AREA" && (<> <input type="number" placeholder="Ideal Queue Duration (m)" value={ideal_queue_duration_m} onChange={(e) => setIdealQueueDurationM(e.target.value)} style={input()} /> <input type="number" placeholder="Max Vehicles Count" value={max_vehicles_count} onChange={(e) => setMaxVehiclesCount(e.target.value)} style={input()} /> </>)} {zoneType === "DUMP_AREA" && (<input type="number" placeholder="Dump Area Max Duration (min)" value={dump_area_max_duration_min} onChange={(e) => setDumpAreaMaxDurationMin(e.target.value)} style={input()} />)} {zoneType === "LOAD_PAD" && (<input type="number" placeholder="Load Pad Max Duration (min)" value={load_pad_max_duration_min} onChange={(e) => setLoadPadMaxDurationMin(e.target.value)} style={input()} />)} {zoneType === "ZONE_AREA" && (<> <input type="number" placeholder="Zone Max Speed (km/h)" value={zone_max_speed_kmh} onChange={(e) => setZoneMaxSpeedKmh(e.target.value)} style={input()} /> <input type="number" placeholder="Zone Bank Volume (m³)" value={zone_bank_volume_m3} onChange={(e) => setZoneBankVolumeM3(e.target.value)} style={input()} /> <input type="number" placeholder="Zone Bank Swell Factor" value={zone_bank_swell_factor} onChange={(e) => setZoneBankSwellFactor(e.target.value)} style={input()} /> </>)} </>)}

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
                onClick={() => {
                  setSelectedOperationId(p.id);
                  const geometry = typeof p.geometry === "string" ? JSON.parse(p.geometry) : p.geometry;
                  focusOnPolygon(geometry);
                }}
                style={{
                  cursor: "pointer",
                  fontWeight: p.id === selectedOperationId ? 700 : 400,
                  color: p.id === selectedOperationId ? "#00e676" : "#ccc",
                }}
              >
                {p.name}
              </span>
              <button style={btnSmall()} onClick={() => handleDeleteOperation(p.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
        {selectedOperationId && (
          <div style={card()}>
            <h4>Zones</h4>
            {zones
              .filter((z) => z.operationId === selectedOperationId)
              .map((z) => (
                <div key={z.id} style={{ fontSize: 13, marginBottom: 10 }}>
                  <b>{z.name}</b> ({z.zoneType})
                  <button
                    style={btnSmall()}
                    onClick={() => handleDeleteZone(z.id)}
                  >
                    🗑 Delete Zone
                  </button>

                  <div style={{ marginTop: 6 }}>
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                      <InputLabel>Assign / Manage Devices</InputLabel>
                      <Select
                        multiple
                        // normalize devices array (convert objects to IDs)
                        value={
                          selectedZoneId === z.id && selectedDevices.length
                            ? selectedDevices
                            : (z.devices || []).map((d) =>
                              typeof d === "object" ? Number(d.device_id) : Number(d)
                            )
                        }
                        onChange={(e) => {
                          setSelectedZoneId(z.id);
                          setSelectedDevices(e.target.value.map((v) => Number(v)));
                        }}
                        renderValue={(selected) =>
                          selected
                            .map(
                              (id) =>
                                allDevices.find((d) => d.id === id)?.name ||
                                `Device ${id}`
                            )
                            .join(", ")
                        }
                      >
                        {allDevices.map((d) => (
                          <MenuItem key={d.id} value={d.id}>
                            <Checkbox
                              checked={
                                (
                                  selectedZoneId === z.id && selectedDevices.length
                                    ? selectedDevices
                                    : (z.devices || []).map((dev) =>
                                      typeof dev === "object" ? Number(dev.device_id) : Number(dev)
                                    )
                                ).includes(d.id)
                              }
                              disabled={d.completed}
                            />
                            <ListItemText
                              primary={`${d.name}${d.completed ? " (completed)" : ""}`}
                            />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>


                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <button
                        style={btnSmall()}
                        onClick={async () => {
                          // Use selectedDevices if zone matches, fallback to z.devices
                          const devicesToSave =
                            selectedZoneId === z.id ? selectedDevices : z.devices || [];
                          await handleAssignDevices(z.id, devicesToSave);
                        }}
                      >
                        💾 Save Assignment
                      </button>

                      <button
                        style={btnSmall()}
                        onClick={() => handleMarkCompleted(z.id)}
                      >
                        ✅ Mark Completed
                      </button>
                    </div>

                  </div>
                </div>
              ))}
          </div>
        )}





      </div>

      {/* MAP */}
      <div>
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
          {operations.map((p) => {
            const geometry = typeof p.geometry === "string" ? JSON.parse(p.geometry) : p.geometry;
            if (!geometry?.coordinates?.[0]) return null;
            const path = geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
            const selected = p.id === selectedOperationId;
            return (
              <Polygon
                key={p.id}
                paths={path}
                onClick={() => {
                  setSelectedOperationId(p.id);
                  focusOnPolygon(geometry);
                }}
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
          {zones.map((z) => {
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

          {/* Device markers */}
          {zones
            .filter((z) => z.devices?.length)
            .flatMap((z) => {
              const geometry = typeof z.geometry === "string" ? JSON.parse(z.geometry) : z.geometry;
              if (!geometry?.coordinates?.[0]) return [];
              const coords = geometry.coordinates[0];
              const center = {
                lng: coords.reduce((sum, [lng]) => sum + lng, 0) / coords.length,
                lat: coords.reduce((sum, [, lat]) => sum + lat, 0) / coords.length,
              };
              return z.devices.map((dId) => {
                const device = allDevices.find((d) => d.id === dId || d.device_id === dId) || {};
                return (
                  <Marker
                    key={`device-${z.id}-${dId}`}
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
      </div>
    </div>
  );
}

/* ===== HELPERS ===== */
function fmt(n) {
  return (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function closeRing(coords) {
  if (!coords.length) return;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);
}
function card() {
  return {
    border: "1px solid #333",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    background: "#1a1a1a",
  };
}
function input() {
  return {
    width: "100%",
    padding: "8px 10px",
    color: "#fff",
    background: "#000",
    borderRadius: 8,
    border: "1px solid #444",
    marginTop: 6,
  };
}
function btn() {
  return {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    background: "#00c853",
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
    border: "1px solid #333",
    background: "#d50000",
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
        border: active ? "2px solid #00e676" : "1px solid #444",
        background: active ? "#00e676" : "#000",
        color: active ? "#000" : "#fff",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}
