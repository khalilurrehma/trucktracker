// src/components/TruckInfoCard.jsx
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

  return (
    <div className="truck-info-card">
      {/* --- Header --- */}
      <div className="truck-info-header">
        <FaTruck size={18} color="#2196f3" />
        <div>
          <h4>{device.name}</h4>
          <span className="truck-info-time">
            {new Date(kpi.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {/* --- KPI grid --- */}
      <div className="truck-info-grid">
        <div><FaTachometerAlt /> <strong>Eff:</strong> {kpi.efficiency ?? 0}%</div>
        <div><FaMapMarkerAlt /> <strong>Trips:</strong> {kpi.trips ?? 0}</div>
        <div><FaGasPump /> <strong>Fuel/m³:</strong> {kpi.fuelPerM3 ?? 0}</div>
        <div><strong>Vol (m³):</strong> {kpi.avgVolumeM3 ?? 0}</div>
        <div><strong>Cycle:</strong> {kpi.durationFormatted ?? "–"}</div>
        <div><strong>Queue:</strong> {kpi.queueTimeFormatted ?? "–"}</div>
      </div>

      {/* --- Bottom icons --- */}
      <div className="truck-info-icons">
        <FaMapMarkerAlt title="Locate" className="truck-info-icon locate" />

        <Link
          to={`/operations/geofence/settings/${device.flespiId}`} // change path if needed
          className="truck-info-link"
          title="Go to Settings"
        >
          <FaCog className="truck-info-icon settings" />
        </Link>
        <FaInfoCircle title="More info" className="truck-info-icon info" />

        {/* 🔗 View Details Link */}
        <Link
          to={`/operations/geofence/dashboard/${device.flespiId}`} // change path if needed
          className="truck-info-link"
          title="Go to Device Details"
        >
          <FaExternalLinkAlt />
        </Link>
      </div>
    </div>
  );
}
