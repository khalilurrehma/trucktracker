// src/operations/components/MapControlRail.jsx
import React from "react";
import { Paper, Tooltip, IconButton, Divider } from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import ThreeDRotationIcon from "@mui/icons-material/ThreeDRotation";
import Rotate90DegreesCcwIcon from "@mui/icons-material/Rotate90DegreesCcw";
import { alpha, useTheme } from "@mui/material/styles";

export default function MapControlRail({
  cycleMapType,
  centerOnOperation,
  zoomIn,
  zoomOut,
  toggle3D,
  rotate3D,
}) {
  const theme = useTheme();

  const railPaperSx = {
    position: "absolute",
    top: "50%",
    right: 10,
    transform: "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0.5,
    zIndex: 5,
    p: 0.5,
    borderRadius: 2,
    backdropFilter: "blur(6px)",
    bgcolor: alpha(theme.palette.background.paper, 0.85),
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 6px 16px rgba(0,0,0,0.5)"
        : "0 6px 16px rgba(0,0,0,0.15)",
  };

  const iconButtonSx = {
    m: 0.25,
    width: 40,
    height: 40,
    color: theme.palette.text.primary,
    bgcolor: alpha(theme.palette.background.default, 0.6),
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    "&:hover": { bgcolor: alpha(theme.palette.background.default, 0.9) },
  };

  return (
    <Paper sx={railPaperSx}>
      <Tooltip title="Change basemap" placement="left">
        <IconButton onClick={cycleMapType} sx={iconButtonSx} size="small">
          <LayersIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider flexItem sx={{ my: 0.5, opacity: 0.6 }} />

      <Tooltip title="Center on operation" placement="left">
        <IconButton onClick={centerOnOperation} sx={iconButtonSx} size="small">
          <CenterFocusStrongIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Divider flexItem sx={{ my: 0.5, opacity: 0.6 }} />

      <Tooltip title="Zoom in" placement="left">
        <IconButton onClick={zoomIn} sx={iconButtonSx} size="small">
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Zoom out" placement="left">
        <IconButton onClick={zoomOut} sx={iconButtonSx} size="small">
          <RemoveIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Paper>
  );
}
