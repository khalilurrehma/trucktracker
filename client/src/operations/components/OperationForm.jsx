import React from "react";

export default function OperationForm({
    name,
    setName,
    op_max_speed_kmh,
    setOpMaxSpeedKmh,
    op_total_bank_volume_m3,
    setOpTotalBankVolume,
    op_swell_factor,
    setOpSwellFactor,
    handleSave,
}) {
    return (
        <div style={card()}>
            <input
                placeholder="Operation name"
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
            <button onClick={handleSave} style={btn()}>
                💾 Save Operation
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