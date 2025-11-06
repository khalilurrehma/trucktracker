// src/operations/components/TruckMarker.jsx
import React from "react";
import { alpha, useTheme } from "@mui/material/styles";

export default function TruckMarker({
  size = 34,
  fill = "#00e676",   // KPI color
  heading = 0,        // degrees
  label,              // optional text (e.g., "85%")
}) {
  const theme = useTheme();
  const outline = theme.palette.mode === "dark" ? alpha("#000", 0.9) : alpha("#fff", 0.95);
  const stroke  = theme.palette.mode === "dark" ? alpha("#fff", 0.95) : alpha("#000", 0.85);

  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      {label != null && (
        <div
          style={{
            background: fill,
            color: "#fff",
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 6,
            marginBottom: 4,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 2px 6px rgba(0,0,0,0.7)"
                : "0 2px 6px rgba(0,0,0,0.25)",
            border: `1px solid ${alpha(stroke, 0.25)}`,
          }}
        >
          {label}
        </div>
      )}

      <div
        style={{
          width: size + 12,
          height: size + 12,
          borderRadius: "50%",
          background: alpha(outline, 0.35),
          position: "absolute",
          filter: theme.palette.mode === "dark" ? "blur(2px) brightness(1.1)" : "blur(2px)",
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        style={{
          transform: `rotate(${heading}deg)`,
          transition: "transform 300ms ease",
          filter:
            theme.palette.mode === "dark"
              ? "drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
              : "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
        }}
        aria-label="truck"
      >
        <g stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
          <rect x="10" y="16" width="22" height="12" rx="2" fill={fill} />
          <path
            d="M32 18h5.5c.6 0 1.2.3 1.5.8l3.1 4.8c.2.4.3.8.3 1.2V28H32V18z"
            fill={fill}
          />
          <path d="M34.5 19.8h3.6l2.5 3.7H34.5z" fill={alpha("#cfe8ff", 0.9)} />
          <rect x="30.5" y="27" width="10" height="2.2" rx="1.1" fill={alpha(stroke, 0.35)} />
        </g>

        <g>
          <circle cx="16" cy="31.5" r="3.8" fill="#222" stroke={outline} strokeWidth="1.2" />
          <circle cx="35" cy="31.5" r="3.8" fill="#222" stroke={outline} strokeWidth="1.2" />
          <circle cx="16" cy="31.5" r="1.6" fill={alpha("#bbb", 0.9)} />
          <circle cx="35" cy="31.5" r="1.6" fill={alpha("#bbb", 0.9)} />
        </g>

        <path
          d="M28 14 l4 -4 l4 4"
          fill="none"
          stroke={outline}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}
