// src/operations/components/LayerTogglesPanel.jsx
import React from "react";
import { Paper, FormControlLabel, Switch } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export default function LayerTogglesPanel({
  showTraffic, setShowTraffic,
  showTransit, setShowTransit,
  showBicycling, setShowBicycling,
  showZones, setShowZones,
  showTrucks, setShowTrucks,
}) {
  const theme = useTheme();
  const leftPanelSx = {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 5,
    p: 1,
    borderRadius: 2,
    backdropFilter: "blur(6px)",
    bgcolor: alpha(theme.palette.background.paper, 0.9),
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 8px 20px rgba(0,0,0,0.55)"
        : "0 8px 20px rgba(0,0,0,0.18)",
    color: theme.palette.text.primary,
    "& .MuiFormControlLabel-label": { fontSize: 12 },
  };

  return (
    <Paper sx={leftPanelSx}>
      <FormControlLabel
        control={<Switch size="small" checked={showTraffic} onChange={() => setShowTraffic(!showTraffic)} />}
        label="Traffic"
      />
      <FormControlLabel
        control={<Switch size="small" checked={showTransit} onChange={() => setShowTransit(!showTransit)} />}
        label="Transit"
      />
      <FormControlLabel
        control={<Switch size="small" checked={showBicycling} onChange={() => setShowBicycling(!showBicycling)} />}
        label="Bicycling"
      />
      <FormControlLabel
        control={<Switch size="small" checked={showZones} onChange={() => setShowZones(!showZones)} />}
        label="Zones"
      />
      <FormControlLabel
        control={<Switch size="small" checked={showTrucks} onChange={() => setShowTrucks(!showTrucks)} />}
        label="Trucks"
      />
    </Paper>
  );
}
