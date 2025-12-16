// src/operations/components/VehicleMarker.jsx
import React from "react";
import TruckMarker from "./TruckMarker";
import CarMarker from "./CarMarker";
import BikeMarker from "./BikeMarker";
import DumperMarker from "./DumperMarker";
import TruckLoaderMarker from "./TruckLoaderMarker";

export default function VehicleMarker({
  type,
  heading = 0,
  size = 34,
  arrowColor = "#222",
  ...props
}) {
  // Rotate only the arrow; keep the vehicle graphic upright.
  // GPS headings are 0° = north; our arrow SVG points down by default,
  // so we rotate the arrow by +180° to align.
  const arrowHeading = (heading || 0) + 180;
  const markerProps = { ...props, heading: 0, size };

  let marker;
  switch (type) {
    case "truck":
      marker = <TruckMarker {...markerProps} />;
      break;
    case "car":
      marker = <CarMarker {...markerProps} />;
      break;
    case "bicycle":
    case "bike":
      marker = <BikeMarker {...markerProps} />;
      break;
    case "dumper":
      marker = <DumperMarker {...markerProps} />;
      break;
    case "truckloader":
      marker = <TruckLoaderMarker {...markerProps} />;
      break;
    default:
      marker = <TruckMarker {...markerProps} />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: size + 18,
        height: size + 24,
        display: "grid",
        placeItems: "center",
        pointerEvents: "auto",
      }}
    >
      {/* Direction arrow */}
      <div
        style={{
          position: "absolute",
          top: 2,
          left: "50%",
          transform: `translateX(-50%) rotate(${arrowHeading}deg)`,
          transformOrigin: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: `10px solid ${arrowColor}`,
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Circular base behind marker */}
      <div
        style={{
          width: size + 8,
          height: size + 8,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.1)",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          pointerEvents: "auto",
        }}
      >
        {marker}
      </div>
    </div>
  );
}
