import React, { useState } from "react";
import Swal from "sweetalert2";
import { fmt, closeRing } from "../../hooks/useDrawing";

export default function OperationForm({ ops, drawing }) {
  const [name, setName] = useState("");
  const [op_max_speed_kmh, setOpMaxSpeedKmh] = useState("");
  const [op_total_bank_volume_m3, setOpTotalBankVolume] = useState("");
  const [op_swell_factor, setOpSwellFactor] = useState("");

  const handleSave = async () => {
    if (!drawing.coords?.length) {
      return Swal.fire({ icon: "info", title: "Draw an operation polygon first!" });
    }
    const coords = closeRing(drawing.coords);
    const operation = {
      name: name || `operation_${ops.operations.length + 1}`,
      geometry: { type: "Polygon", coordinates: [coords] },
      area_sqm: drawing.area.sqm,
      area_ha: drawing.area.ha,
      op_max_speed_kmh,
      op_total_bank_volume_m3,
      op_swell_factor,
    };
    await ops.saveOperation(operation);
    // reset
    setName("");
    setOpMaxSpeedKmh("");
    setOpTotalBankVolume("");
    setOpSwellFactor("");
  };

  return (
    <div className="card">
      <h3>Operation</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className={`mode-btn ${ops.mode === "OPERATION" ? "active" : ""}`}
          onClick={() => ops.setMode("OPERATION")}
        >
          Operation
        </button>
        <button
          className={`mode-btn ${ops.mode === "ZONE" ? "active" : ""}`}
          onClick={() => ops.setMode("ZONE")}
        >
          Zone
        </button>
      </div>

      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" type="number" placeholder="Max Speed (km/h)" value={op_max_speed_kmh} onChange={(e) => setOpMaxSpeedKmh(e.target.value)} />
      <input className="input" type="number" placeholder="Bank Volume (m³)" value={op_total_bank_volume_m3} onChange={(e) => setOpTotalBankVolume(e.target.value)} />
      <input className="input" type="number" placeholder="Swell Factor" value={op_swell_factor} onChange={(e) => setOpSwellFactor(e.target.value)} />

      <div className="label-row">
        <span>Area:</span>
        <span><b>{fmt(drawing.area.sqm)} m²</b> | <b>{fmt(drawing.area.ha)} ha</b></span>
      </div>

      <button className="btn" onClick={handleSave}>💾 Save Operation</button>
    </div>
  );
}
