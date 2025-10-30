import React from "react";

export default function ZoneForm({
  zoneType,
  setZoneType,
  capacity,
  setCapacity,
  devices,
  setDevices,
  handleSave,
}) {
  return (
    <div style={card()}>
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
      <button onClick={handleSave} style={btn()}>
        💾 Save Zone
      </button>
    </div>
  );
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