import React from "react";
import { alpha, useTheme } from "@mui/material/styles";

export default function TruckMarker({
  size = 34,
  fill = "#00e676", // KPI color
  heading = 0, // degrees
  label, // optional text (e.g., "85%")
}) {
  const theme = useTheme();
  const outline =
    theme.palette.mode === "dark"
      ? alpha("#000", 0.9)
      : alpha("#fff", 0.95);
  const stroke =
    theme.palette.mode === "dark"
      ? alpha("#fff", 0.95)
      : alpha("#000", 0.85);

  return (
    <div style={{ display: "grid", placeItems: "center", position: "relative" }}>
      {/* Label bubble */}
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

      {/* Soft halo behind vehicle */}
      <div
        style={{
          width: size + 12,
          height: size + 12,
          borderRadius: "50%",
          background: alpha(outline, 0.35),
          position: "absolute",
          filter:
            theme.palette.mode === "dark"
              ? "blur(2px) brightness(1.1)"
              : "blur(2px)",
        }}
      />

      {/* Truck SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 511.995 511.995"
        width={size}
        height={size}
        style={{
          transform: `rotate(${heading}deg)`,
          transformOrigin: "center",
        }}
        fill="none"
      >
        <polygon
          fill="#E6E9ED"
          points="330.669,341.932 330.779,149.819 441.401,149.725 481.12,228.942 501.323,269.332 501.135,341.932"
        />
        <polygon
          fill="#4FC2E9"
          points="478.84,224.379 441.401,149.725 330.779,149.819 330.732,224.379"
        />
        <path
          fill="#E6E9ED"
          d="M490.651,224.161l-42.672-85.107l-127.857,0.109l-0.141,213.441h191.794l0.219-85.787L490.651,224.161z
          M490.495,331.275H341.341l0.094-170.801l93.373-0.078l36.766,73.311l19.078,38.124L490.495,331.275z"
        />
        <rect x="362.517" y="160.438" width="21.328" height="63.936" fill="#3BAFDA" />
        <path
          fill="#FC6E51"
          d="M336.466,118.444c-3.031-1.968-6.844-2.265-10.141-0.812l-93.935,41.749H10.669
          c-3.367,0-6.547,1.594-8.555,4.297c-2.016,2.703-2.633,6.203-1.664,9.437l29.632,124.943l-8.602,41.14
          c-0.516,3.078,0.359,6.25,2.383,8.641c2.031,2.391,5,3.766,8.141,3.766h298.65c5.891,0,10.672-4.781,10.672-10.672v-213.55
          C341.326,123.772,339.497,120.413,336.466,118.444z"
        />
        <path
          fill="#CCD1D9"
          d="M30.082,298.058l-8.602,41.968c-0.516,3.141,0.359,6.359,2.383,8.797
          c2.023,2.422,5,3.828,8.141,3.828l309.275-0.047v-54.546H30.082z"
        />
        <path
          fill="#434A54"
          d="M394.652,288.604c-29.452,0-53.327,23.874-53.327,53.327c0,29.452,23.875,53.343,53.327,53.343
          s53.327-23.891,53.327-53.343C447.979,312.478,424.104,288.604,394.652,288.604z"
        />
        <path
          fill="#434A54"
          d="M181.329,288.604c-17.453,0-32.937,8.375-42.671,21.327c-9.727-12.952-25.21-21.327-42.664-21.327
          c-29.453,0-53.327,23.874-53.327,53.327c0,29.452,23.875,53.343,53.327,53.343c17.453,0,32.937-8.391,42.664-21.344
          c9.734,12.953,25.218,21.344,42.671,21.344c29.453,0,53.327-23.891,53.327-53.343C234.656,312.478,210.781,288.604,181.329,288.604z"
        />
        <circle fill="#F5F7FA" cx="394.653" cy="341.932" r="10.672" />
        <circle fill="#F5F7FA" cx="95.995" cy="341.932" r="10.672" />
        <circle fill="#F5F7FA" cx="181.33" cy="341.932" r="10.672" />
        <path
          fill="#E9573F"
          d="M277.327,235.051H85.331c-5.891,0-10.664-4.781-10.664-10.672c0-5.89,4.773-10.671,10.664-10.671h191.997
          c5.891,0,10.672,4.781,10.672,10.671C288,230.27,283.219,235.051,277.327,235.051z"
        />
      </svg>
    </div>
  );
}
