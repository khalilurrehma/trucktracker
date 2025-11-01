import React, { useState } from "react";
import Swal from "sweetalert2";
import { fmt, closeRing } from "../../hooks/useDrawing";

export default function ZoneForm({ ops, zones, drawing }) {
  const [name, setName] = useState("");
  const [zoneType, setZoneType] = useState("QUEUE_AREA");
  const [ideal_queue_duration_m, setIdealQueueDurationM] = useState("");
  const [max_vehicles_count, setMaxVehiclesCount] = useState("");
  const [dump_area_max_duration_min, setDumpAreaMaxDurationMin] = useState("");
  const [load_pad_max_duration_min, setLoadPadMaxDurationMin] = useState("");
  const [zone_max_speed_kmh, setZoneMaxSpeedKmh] = useState("");
  const [zone_bank_volume_m3, setZoneBankVolumeM3] = useState("");
  const [zone_bank_swell_factor, setZoneBankSwellFactor] = useState("");

  const handleSave = async () => {
    if (!ops.selectedOperationId) {
      return Swal.fire({ icon: "warning", title: "Select an operation first!" });
    }
    if (!drawing.coords?.length) {
      return Swal.fire({ icon: "info", title: "Draw a zone polygon first!" });
    }

    const coords = closeRing(drawing.coords);
    const zone = {
      operationId: ops.selectedOperationId,
      name: name || `zone_${zones.zones.length + 1}`,
      zoneType,
      geometry: { type: "Polygon", coordinates: [coords] },
      area_sqm: drawing.area.sqm,
      area_ha: drawing.area.ha,
      ideal_queue_duration_m,
      max_vehicles_count,
      dump_area_max_duration_min,
      load_pad_max_duration_min,
      zone_max_speed_kmh,
      zone_bank_volume_m3,
      zone_bank_swell_factor,
    };

    await zones.saveZone(zone);

    // reset
    setName("");
    setZoneType("QUEUE_AREA");
    setIdealQueueDurationM("");
    setMaxVehiclesCount("");
    setDumpAreaMaxDurationMin("");
    setLoadPadMaxDurationMin("");
    setZoneMaxSpeedKmh("");
    setZoneBankVolumeM3("");
    setZoneBankSwellFactor("");
  };

  return (
    <div className="card">
      <h3>Zone</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className={`mode-btn ${ops.mode === "OPERATION" ? "" : "active"}`}
          onClick={() => ops.setMode("ZONE")}
        >
          Zone
        </button>
        <button
          className={`mode-btn ${ops.mode === "OPERATION" ? "active" : ""}`}
          onClick={() => ops.setMode("OPERATION")}
        >
          Operation
        </button>
      </div>

      <input className="input" placeholder="Zone name" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="input" value={zoneType} onChange={(e) => setZoneType(e.target.value)}>
        <option value="QUEUE_AREA">QUEUE_AREA</option>
        <option value="LOAD_PAD">LOAD_PAD</option>
        <option value="DUMP_AREA">DUMP_AREA</option>
        <option value="ZONE_AREA">ZONE_AREA</option>
      </select>

      {zoneType === "QUEUE_AREA" && (
        <>
          <input className="input" type="number" placeholder="Ideal Queue Duration (m)" value={ideal_queue_duration_m} onChange={(e) => setIdealQueueDurationM(e.target.value)} />
          <input className="input" type="number" placeholder="Max Vehicles Count" value={max_vehicles_count} onChange={(e) => setMaxVehiclesCount(e.target.value)} />
        </>
      )}

      {zoneType === "DUMP_AREA" && (
        <input className="input" type="number" placeholder="Dump Area Max Duration (min)" value={dump_area_max_duration_min} onChange={(e) => setDumpAreaMaxDurationMin(e.target.value)} />
      )}

      {zoneType === "LOAD_PAD" && (
        <input className="input" type="number" placeholder="Load Pad Max Duration (min)" value={load_pad_max_duration_min} onChange={(e) => setLoadPadMaxDurationMin(e.target.value)} />
      )}

      {zoneType === "ZONE_AREA" && (
        <>
          <input className="input" type="number" placeholder="Zone Max Speed (km/h)" value={zone_max_speed_kmh} onChange={(e) => setZoneMaxSpeedKmh(e.target.value)} />
          <input className="input" type="number" placeholder="Zone Bank Volume (m³)" value={zone_bank_volume_m3} onChange={(e) => setZoneBankVolumeM3(e.target.value)} />
          <input className="input" type="number" placeholder="Zone Bank Swell Factor" value={zone_bank_swell_factor} onChange={(e) => setZoneBankSwellFactor(e.target.value)} />
        </>
      )}

      <div className="label-row">
        <span>Area:</span>
        <span><b>{fmt(drawing.area.sqm)} m²</b> | <b>{fmt(drawing.area.ha)} ha</b></span>
      </div>

      <button className="btn" onClick={handleSave}>💾 Save Zone</button>
    </div>
  );
}
