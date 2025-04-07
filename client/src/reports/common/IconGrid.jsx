import React from "react";

const icons = [
  "fa-laptop",
  "fa-desktop",
  "fa-tablet",
  "fa-gas-pump",
  "fa-truck-field",
  "fa-microchip",
  "fa-print",
  "fa-keyboard",
  "fa-mouse",
  "fa-truck",
  "fa-signal",
  "fa-wifi",
  "fa-battery-full",
  "fa-cogs",
  "fa-chart-line",
  "fa-download",
  "fa-upload",
  "fa-file",
  "fa-file-alt",
  "fa-folder",
  "fa-archive",
  "fa-chart-bar",
  "fa-pie-chart",
  "fa-tachometer-alt",
  "fa-shield-alt",
  "fa-camera",
  "fa-bug",
  "fa-search",
  "fa-history",
  "fa-sitemap",
  "fa-cloud",
  "fa-envelope",
  "fa-users",
  "fa-globe",
  "fa-map",
  "fa-coffee",
  "fa-heart",
  "fa-star",
  "fa-moon",
  "fa-sun",
  "fa-plane",
  "fa-train",
  "fa-car",
  "fa-bicycle",
  "fa-ship",
  "fa-building",
  "fa-university",
  "fa-tree",
  "fa-anchor",
  "fa-bell",
  "fa-clock",
];

const IconGrid = ({ selectedIcon, onIconClick }) => {
  return (
    <div
      style={{
        gap: "20px",
        border: "1px solid grey",
        width: "100%",
        height: "200px",
        overflow: "auto",
        padding: "10px",
        borderRadius: "4px",
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {icons.map((icon, index) => (
        <i
          key={index}
          className={`fas ${icon}`}
          style={{
            width: "40px",
            height: "40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "10px",
            fontSize: "24px",
            cursor: "pointer",
            color: selectedIcon === icon ? "green" : "grey",
            backgroundColor:
              selectedIcon === icon ? "lightgrey" : "transparent",
          }}
          onClick={() => onIconClick(icon)}
        ></i>
      ))}
    </div>
  );
};

export default IconGrid;
