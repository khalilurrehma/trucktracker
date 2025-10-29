import React, { useRef, useState } from "react";
import { GoogleMap, Polygon, Marker, useJsApiLoader } from "@react-google-maps/api";
import * as martinez from "martinez-polygon-clipping";
const LIBS = ["drawing", "geometry"];
const MAP_STYLE = { width: "100%", height: "74vh" };
const CENTER = { lat: -12.0464, lng: -77.0428 };

const COLORS = {
  PROJECT: "#2e7d32",
  SELECTED_PROJECT: "#004d40",
  QUEUE: "#f9a825",
  LOADING: "#e53935",
  DUMP: "#6a1b9a",
  OTHER: "#1e88e5",
  INVALID: "#d32f2f",
};

export default function ProjectZoneManager({ apiKey }) {
  const key = apiKey || import.meta.env.VITE_GOOGLE_MAP_API;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: key,
    libraries: LIBS,
  });

  const [projects, setProjects] = useState(() => load("pz_projects"));
  const [zones, setZones] = useState(() => load("pz_zones"));
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || "");
  const [mode, setMode] = useState("PROJECT");
  const [name, setName] = useState("");
  const [zoneType, setZoneType] = useState("QUEUE");
  const [capacity, setCapacity] = useState("");
  const [devices, setDevices] = useState("");
  const [area, setArea] = useState({ sqm: 0, ha: 0 });

  const mapRef = useRef(null);
  const overlayRef = useRef(null);

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
        fillColor: COLORS[mode === "PROJECT" ? "PROJECT" : zoneType],
        fillOpacity: 0.25,
        strokeColor: COLORS[mode === "PROJECT" ? "PROJECT" : zoneType],
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

      // === Validate containment when drawing zone ===
      if (mode === "ZONE" && selectedProjectId) {
        const project = projects.find((p) => p.id === selectedProjectId);
        if (project) {
          const projectPoly = new g.maps.Polygon({
            paths: project.geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat })),
          });
          const inside = isPolygonInside(g, path, projectPoly);
          if (!inside) {
            e.overlay.setOptions({
              strokeColor: COLORS.INVALID,
              fillColor: COLORS.INVALID,
            });
            alert("❌ Zone must be completely inside the project boundary.");
            setTimeout(() => e.overlay.setMap(null), 1500);
            overlayRef.current = null;
            setArea({ sqm: 0, ha: 0 });
          }
        }
      }
    });
  };


  function isPolygonInside(g, zonePath, projectPoly) {
    // Convert to plain arrays
    const projectPath = projectPoly.getPath().getArray();

    // 1️⃣ Every zone vertex must be strictly inside (not on edge)
    const allInside = zonePath.every((pt) =>
      g.maps.geometry.poly.containsLocation(pt, projectPoly)
    );
    if (!allInside) return false;

    // 2️⃣ No project vertex inside zone polygon
    const zonePoly = new g.maps.Polygon({ paths: zonePath });
    const projectInside = projectPath.some((pt) =>
      g.maps.geometry.poly.containsLocation(pt, zonePoly)
    );
    if (projectInside) return false;

    // 3️⃣ No edge intersection between boundaries
    if (edgesIntersect(zonePath, projectPath)) return false;

    return true;
  }

  /* --- Edge intersection helpers --- */
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
    if (Math.abs(val) < 1e-12) return 0; // collinear
    return val > 0 ? 1 : 2;
  }



  const handleSave = () => {
    const g = window.google;
    if (!overlayRef.current) return alert("Draw polygon first!");
    const path = overlayRef.current.getPath().getArray();
    const coords = path.map((p) => [p.lng(), p.lat()]);
    closeRing(coords);
    const sqm = g.maps.geometry.spherical.computeArea(path);

    if (mode === "PROJECT") {
      const project = {
        id: uid(),
        name: name || `Project_${projects.length + 1}`,
        geometry: { type: "Polygon", coordinates: [coords] },
        areaSqm: sqm,
        areaHa: sqm / 10000,
      };
      const next = [project, ...projects];
      setProjects(next);
      save("pz_projects", next);
      setSelectedProjectId(project.id);
    } else {
      if (!selectedProjectId) return alert("Select a project first!");

      // ✅ Run containment validation again here on save
      const project = projects.find((p) => p.id === selectedProjectId);
      if (!project) return alert("Project not found!");

      const projectPoly = new g.maps.Polygon({
        paths: project.geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat })),
      });
      const inside = isPolygonInside(g, path, projectPoly);
      if (!inside) {
        if (overlayRef.current) {
          overlayRef.current.setMap(null); // remove the invalid polygon
          overlayRef.current = null;
        }

        setArea({ sqm: 0, ha: 0 });
        window.alert("❌ Zone must be completely inside the project boundary.");
        return;
      }



      const zone = {
        id: uid(),
        projectId: selectedProjectId,
        name: name || `Zone_${zones.length + 1}`,
        zoneType,
        capacity: capacity ? Number(capacity) : null,
        devices: devices.split(",").map((d) => d.trim()).filter(Boolean),
        geometry: { type: "Polygon", coordinates: [coords] },
        areaSqm: sqm,
        areaHa: sqm / 10000,
      };
      const next = [zone, ...zones];
      setZones(next);
      save("pz_zones", next);
    }

    overlayRef.current.setMap(null);
    overlayRef.current = null;
    setName("");
    setCapacity("");
    setDevices("");
    setArea({ sqm: 0, ha: 0 });
  };


  const deleteProject = (id) => {
    if (!confirm("Delete this project and all its zones?")) return;
    const nextProjects = projects.filter((p) => p.id !== id);
    const nextZones = zones.filter((z) => z.projectId !== id);
    setProjects(nextProjects);
    setZones(nextZones);
    save("pz_projects", nextProjects);
    save("pz_zones", nextZones);
    if (selectedProjectId === id) setSelectedProjectId("");
  };

  const deleteZone = (id) => {
    if (!confirm("Delete this zone?")) return;
    const next = zones.filter((z) => z.id !== id);
    setZones(next);
    save("pz_zones", next);
  };
const updateZoneDevices = (id, newDevicesStr) => {
  const newDevices = newDevicesStr
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const nextZones = zones.map((z) =>
    z.id === id ? { ...z, devices: newDevices } : z
  );
  setZones(nextZones);
  save("pz_zones", nextZones);
};

  const zonesForProject = zones.filter((z) => z.projectId === selectedProjectId);

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
        <h3>Projects & Zones</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <ModeButton active={mode === "PROJECT"} onClick={() => setMode("PROJECT")}>
            Project Mode
          </ModeButton>
          <ModeButton active={mode === "ZONE"} onClick={() => setMode("ZONE")}>
            Zone Mode
          </ModeButton>
        </div>

        <div style={card()}>
          <input
            placeholder={mode === "PROJECT" ? "Project name" : "Zone name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input()}
          />
          {mode === "ZONE" && (
            <>
              <select
                value={zoneType}
                onChange={(e) => setZoneType(e.target.value)}
                style={input()}
              >
                <option value="QUEUE">QUEUE</option>
                <option value="LOADING">LOADING</option>
                <option value="DUMP">DUMP</option>
                <option value="OTHER">OTHER</option>
              </select>
              <input
                type="number"
                placeholder="Capacity"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                style={input()}
              />
              <input
                placeholder="Devices (comma-separated)"
                value={devices}
                onChange={(e) => setDevices(e.target.value)}
                style={input()}
              />
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
          <h4>Projects</h4>
          {projects.map((p) => (
            <div key={p.id} style={{ fontSize: 13, marginBottom: 4 }}>
              <span
                onClick={() => setSelectedProjectId(p.id)}
                style={{
                  cursor: "pointer",
                  fontWeight: p.id === selectedProjectId ? 700 : 400,
                  color: p.id === selectedProjectId ? "#000" : "#555",
                }}
              >
                {p.name}
              </span>
              <button style={btnSmall()} onClick={() => deleteProject(p.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>

        {selectedProjectId && (
          <div style={card()}>
            <h4>Zones</h4>
            {zonesForProject.map((z) => (
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
          {/* PROJECTS */}
          {projects.map((p) => {
            const path = p.geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
            const selected = p.id === selectedProjectId;
            return (
              <Polygon
                key={p.id}
                paths={path}
                onClick={() => setSelectedProjectId(p.id)}
                options={{
                  strokeColor: selected ? COLORS.SELECTED_PROJECT : COLORS.PROJECT,
                  strokeWeight: selected ? 3 : 1.5,
                  fillColor: selected ? COLORS.SELECTED_PROJECT : COLORS.PROJECT,
                  fillOpacity: selected ? 0.1 : 0.05,
                }}
              />
            );
          })}

          {/* ZONES */}
          {zonesForProject.map((z) => {
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

          {/* DEVICE MARKERS */}
          {zonesForProject.flatMap((z) => {
            const coords = z.geometry.coordinates[0];
            if (!coords?.length) return [];
            const avgLat = coords.reduce((s, [lng, lat]) => s + lat, 0) / coords.length;
            const avgLng = coords.reduce((s, [lng, lat]) => s + lng, 0) / coords.length;
            return z.devices.map((dev, i) => (
              <Marker
                key={`${z.id}_${i}`}
                position={{ lat: avgLat + i * 0.0001, lng: avgLng + i * 0.0001 }}
                title={`${z.name}: ${dev}`}
                icon={{
                  url: "https://maps.gstatic.com/mapfiles/ms2/micons/truck.png",
                  scaledSize: new window.google.maps.Size(28, 28),
                }}
              />
            ));
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
