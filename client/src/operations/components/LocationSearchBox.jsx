import React, { useState, useRef } from "react";
import L from "leaflet";
import { TextField, InputAdornment, IconButton } from "@mui/material";

const LocationSearchBox = ({ mapRef }) => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const timeoutRef = useRef(null);

  const customIconRef = useRef(
    L.divIcon({
      className: "",
      html: `
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 2px solid #2196f3;
        ">
          <img src="https://img.freepik.com/free-vector/location_53876-25530.jpg?semt=ais_hybrid&w=740&q=80" alt="marker" style="width: 60%; height: 60%; object-fit: contain;" />
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 42],
      popupAnchor: [0, -38],
    })
  );

  const handleSearch = (text) => {
    setSearch(text);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (!text) {
        setSuggestions([]);
        return;
      }

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        text
      )}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 400);
  };

  const handleSelect = (place) => {
    setSuggestions([]);
    setSearch(place.display_name);

    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    const map = mapRef.current;
    if (!map) return;

    map.setView([lat, lon], 18);
    L.marker([lat, lon], { icon: customIconRef.current }).addTo(map);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        width: 400,
        maxWidth: "90%",
      }}
    >
      <TextField
        fullWidth
        label="Buscar ubicación"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{
          background: "transparent",
          borderRadius: 1,
        }}
      />

      {suggestions.length > 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 4,
            marginTop: 2,
            maxHeight: 250,
            overflowY: "auto",
            boxShadow: "0px 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          {suggestions.map((item, i) => (
            <div
              key={i}
              onClick={() => handleSelect(item)}
              style={{
                padding: "10px",
                cursor: "pointer",
                fontSize: 14,
                color: "#222",
                borderBottom: "1px solid #eee",
              }}
            >
              {item.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearchBox;
