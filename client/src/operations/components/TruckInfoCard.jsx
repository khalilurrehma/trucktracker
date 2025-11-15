import React from "react";
import { Link, useInRouterContext } from "react-router-dom";

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
  if (!device) return null;

  // Always show card, even if KPI is missing
  const data = kpi || {};

  const lastUpdateMs = data.timestamp
    ? Date.now() - new Date(data.timestamp).getTime()
    : Infinity;

  const isRecent = lastUpdateMs < 5000;

  const formatNumber = (n, d = 2) =>
    n !== null && n !== undefined && n !== "" ? Number(n).toFixed(d) : "–";

  const insideRouter = useInRouterContext();

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
      {/* Header */}
      <div className="truck-info-header">
        <FaTruck size={18} color="#2196f3" />
        <div>
          <h4>{device.device_name || device.name || "Unnamed Device"}</h4>

          <span className="truck-info-time">
            {data.timestamp
              ? new Date(data.timestamp).toLocaleTimeString()
              : "No Data"}
          </span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="truck-info-grid">
        <div>
          <FaTachometerAlt />  
          <strong>Eff:</strong> {formatNumber(data.efficiency)}%
        </div>

        <div>
          <FaMapMarkerAlt /> 
          <strong>Trips:</strong> {data.trips ?? "–"}
        </div>

        <div>
          <FaGasPump /> 
          <strong>Fuel/m³:</strong> {formatNumber(data.fuelPerM3)}
        </div>

        <div>
          <strong>Vol (m³):</strong> {formatNumber(data.avgVolumeM3)}
        </div>

        <div>
          <strong>Cycle:</strong> {data.durationFormatted ?? "–"}
        </div>

        <div>
          <strong>Queue:</strong> {data.queueTimeFormatted ?? "–"}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="truck-info-icons">

        {/* Locate on map */}
        <FaMapMarkerAlt
          title="Locate on Map"
          className="truck-info-icon locate"
        />

        {/* Settings */}
        {insideRouter ? (
          <Link
            to={`/operations/geofence/settings/${device.flespi_device_id}`}
            className="truck-info-link"
            title="Open Settings"
          >
            <FaCog className="truck-info-icon settings" />
          </Link>
        ) : (
          <FaCog
            className="truck-info-icon settings"
            title="Settings (disabled on map)"
          />
        )}

        {/* Info */}
        <FaInfoCircle
          title="More Info"
          className="truck-info-icon info"
        />

        {/* Dashboard */}
        {insideRouter ? (
          <Link
            to={`/operations/geofence/dashboard/${device.flespi_device_id}`}
            className="truck-info-link"
            title="Dashboard"
          >
            <FaExternalLinkAlt />
          </Link>
        ) : (
          <FaExternalLinkAlt title="Dashboard (disabled on map)" />
        )}
      </div>
    </div>
  );
}
