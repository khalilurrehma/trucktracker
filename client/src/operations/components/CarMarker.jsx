import React from "react";
import { alpha, useTheme } from "@mui/material/styles";

export default function CarMarker({ size = 34, fill = "#ef5350", heading = 0, label }) {
  const theme = useTheme();
  const outline = theme.palette.mode === "dark" ? alpha("#000", 0.9) : alpha("#fff", 0.95);
  const stroke = theme.palette.mode === "dark" ? alpha("#fff", 0.95) : alpha("#000", 0.85);

  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      {label && (
        <div
          style={{
            background: fill,
            color: "#fff",
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 6,
            marginBottom: 4,
            border: `1px solid ${alpha(stroke, 0.25)}`,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 2px 6px rgba(0,0,0,0.7)"
                : "0 2px 6px rgba(0,0,0,0.25)",
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
      >
        <g stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
          {/* body */}
          <rect x="10" y="18" width="28" height="10" rx="5" fill={fill} />
          {/* roof */}
          <path d="M14 18l5-6h10l5 6z" fill={fill} />
          {/* windshield */}
          <rect x="20" y="13" width="8" height="4" rx="1" fill={alpha("#cfe8ff", 0.9)} />
          {/* wheels */}
          <circle cx="16" cy="30" r="3" fill="#222" stroke={outline} />
          <circle cx="32" cy="30" r="3" fill="#222" stroke={outline} />
        </g>
      </svg>
    </div>
  );
}
