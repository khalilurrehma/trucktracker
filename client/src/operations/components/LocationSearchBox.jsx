import React, { useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { TextField } from "@mui/material";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
const LocationSearchBox = ({ mapRef }) => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const timeoutRef = useRef(null);
  const markerRef = useRef(null);

  const handleSearch = (text) => {
    setSearch(text);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (!text) {
        setSuggestions([]);
        return;
      }

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        text
      )}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=6`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        setSuggestions(data?.features || []);
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 400);
  };

  const handleSelect = (place) => {
    setSuggestions([]);
    setSearch(place.place_name);

    const map = mapRef.current;
    if (!map) return;

    const [lng, lat] = place.center;
    map.flyTo({
      center: [lng, lat],
      zoom: 17,
      speed: 0.9,
      curve: 1.2,
      pitch: 60,
      bearing: -18,
    });

    if (markerRef.current) markerRef.current.remove();

    const markerEl = document.createElement("div");
    markerEl.style.width = "46px";
    markerEl.style.height = "46px";
    markerEl.style.borderRadius = "50%";
    markerEl.style.background = "radial-gradient(circle, #ffffff 60%, #c7e2ff 100%)";
    markerEl.style.border = "2px solid #2b7de9";
    markerEl.style.boxShadow = "0 10px 22px rgba(15,23,42,0.35)";
    markerEl.style.display = "grid";
    markerEl.style.placeItems = "center";
    markerEl.innerHTML =
      '<span style="width:14px;height:14px;border-radius:50%;background:#0f172a;display:block;"></span>';

    markerRef.current = new mapboxgl.Marker({ element: markerEl })
      .setLngLat([lng, lat])
      .addTo(map);
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
        padding: 10,
        borderRadius: 14,
        background: "rgba(15,23,42,0.25)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(148,163,184,0.25)",
      }}
    >
      <TextField
        fullWidth
        label="Buscar ubicacion"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{
          background: "rgba(255,255,255,0.92)",
          borderRadius: 2,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(148,163,184,0.45)",
          },
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
            boxShadow: "0px 10px 24px rgba(15,23,42,0.25)",
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
              {item.place_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearchBox;
