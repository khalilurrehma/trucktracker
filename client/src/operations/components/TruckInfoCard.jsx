import React from "react";
import { Link } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaCog,
  FaInfoCircle,
  FaGasPump,
  FaTachometerAlt,
  FaTruck,
  FaExternalLinkAlt,
} from "react-icons/fa";
import "./TruckInfoCard.css";

export default function TruckInfoCard({ device, kpi }) {
  if (!device || !kpi) return null;

  // Highlight recent KPI updates (last 5s)
  const lastUpdateMs = Date.now() - new Date(kpi.timestamp).getTime();
  const isRecent = lastUpdateMs < 5000;

  const formatNumber = (n, d = 2) =>
    n !== null && n !== undefined ? Number(n).toFixed(d) : "–";

  return (
    <div
      className="truck-info-card"
      style={{
        border: isRecent ? "2px solid #64ffda" : "1px solid #444",
        boxShadow: isRecent
          ? "0 0 10px rgba(100,255,218,0.6)"
          : "0 2px 5px rgba(0,0,0,0.3)",
        transition: "all 0.3s ease",
      }}
    >
      {/* --- Header --- */}
      <div className="truck-info-header">
        <FaTruck size={18} color="#2196f3" />
        <div>
          <h4>{device.name || "Unnamed Device"}</h4>
          <span className="truck-info-time">
            {new Date(kpi.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* --- KPI grid --- */}
      <div className="truck-info-grid">
        <div><FaTachometerAlt /> <strong>Eff:</strong> {formatNumber(kpi.efficiency)}%</div>
        <div><FaMapMarkerAlt /> <strong>Trips:</strong> {kpi.trips ?? 0}</div>
        <div><FaGasPump /> <strong>Fuel/m³:</strong> {formatNumber(kpi.fuelPerM3)}</div>
        <div><strong>Vol (m³):</strong> {formatNumber(kpi.avgVolumeM3)}</div>
        <div><strong>Cycle:</strong> {kpi.durationFormatted ?? "–"}</div>
        <div><strong>Queue:</strong> {kpi.queueTimeFormatted ?? "–"}</div>
      </div>

      {/* --- Footer Actions --- */}
      <div className="truck-info-icons">
        <FaMapMarkerAlt title="Locate on Map" className="truck-info-icon locate" />
        <Link
          to={`/operations/geofence/settings/${device.flespiId}`}
          className="truck-info-link"
          title="Open Settings"
        >
          <FaCog className="truck-info-icon settings" />
        </Link>
        <FaInfoCircle title="More Info" className="truck-info-icon info" />
        <Link
          to={`/operations/geofence/dashboard/${device.flespiId}`}
          className="truck-info-link"
          title="Dashboard"
        >
          <FaExternalLinkAlt />
        </Link>
      </div>
    </div>
  );
}
