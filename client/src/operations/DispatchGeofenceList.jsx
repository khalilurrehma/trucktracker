import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import {
  Box,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Pagination,
  Tooltip,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MapIcon from "@mui/icons-material/Map";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import { ToastContainer } from "react-toastify";
import { useAppContext } from "../AppContext";
import { useOperations } from "../hooks/useOperations";
import { useNavigate } from "react-router-dom";
import { alpha, useTheme } from "@mui/material/styles";

const PAGE_SIZE = 10;

const COLORS = {
  DUMP: "#ab47bc",
  LOAD: "#ef5350",
  QUEUE: "#fbc02d",
  ZONE: "#42a5f5",
  OP: "#00c853",
};

function zoneTypeFromName(name = "") {
  // e.g. "DUMP_AREA_01" -> "DUMP"
  if (!name) return "ZONE";
  const t = name.includes("_AREA") ? name.split("_")[0] : name;
  return t || "ZONE";
}

export default function GeofenceList() {
  const theme = useTheme();
  const { allDevices, mqttDeviceLiveLocation, mqttOperationStats } = useAppContext(); // (unused here but kept)
  const ops = useOperations();
  const navigate = useNavigate();

  const [geofences, setGeofences] = useState([]);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // ✅ Load geofences from ops hook
  useEffect(() => {
    if (ops.operations?.length) {
      setGeofences(ops.operations);
      setPage(1);
    }
  }, [ops.operations]);

  // ✅ Theme-aware, consistent icon style (same as Map control rail)
  const iconButtonSx = useMemo(() => ({
    m: 0.25,
    width: 36,
    height: 36,
    color: theme.palette.text.primary,
    bgcolor: alpha(theme.palette.background.default, 0.6),
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    "&:hover": {
      bgcolor: alpha(theme.palette.background.default, 0.9),
    },
  }), [theme]);

  // ✅ Search + filter (client-side) — and really skip OP_AREA by name
  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return (geofences || [])
      .filter((g) => /OP_AREA/i.test(g?.name || "")) // skip OP_AREA
      .filter((g) => (g?.name || "").toLowerCase().includes(needle));
  }, [geofences, searchQuery]);

  // ✅ Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handlePageChange = (event, value) => setPage(value);

  return (
    <PageLayout menu={<OperationsMenu />} breadcrumbs2={["Operations", "Geofences"]}>
      <ToastContainer />

      <Box sx={{ p: 3 }}>
        {/* 🔍 Search bar */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <TextField
            placeholder="Search geofence..."
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* 📋 Table */}
        <TableContainer
          component={Paper}
          sx={{
            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 8px 20px rgba(0,0,0,0.55)"
                : "0 8px 20px rgba(0,0,0,0.12)",
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha("#1976d2", 0.08) }}>
                <TableCell sx={{ color: "#1976d2", fontWeight: "bold" }}>Name</TableCell>
                <TableCell sx={{ color: "#1976d2", fontWeight: "bold" }}>Type</TableCell>
                <TableCell sx={{ color: "#1976d2", fontWeight: "bold" }}>Metadata</TableCell>
                <TableCell align="center" sx={{ color: "#1976d2", fontWeight: "bold" }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No geofences found
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((geo) => {
                  const zType = zoneTypeFromName(geo?.name);
                  const chipColor = COLORS[zType] || COLORS.ZONE;

                  return (
                    <TableRow
                      key={geo.id}
                      hover
                      onClick={() => setSelectedGeofence(geo)}
                      sx={{
                        cursor: "pointer",
                        backgroundColor:
                          selectedGeofence?.id === geo.id
                            ? alpha("#1976d2", 0.08)
                            : "inherit",
                      }}
                    >
                      {/* 🏷️ Geofence Name */}
                      <TableCell>{geo?.name || "—"}</TableCell>

                      {/* 🗺️ Zone Type chip */}
                      <TableCell>
                        <Chip
                          size="small"
                          label={zType}
                          sx={{
                            fontWeight: 600,
                            color: theme.palette.getContrastText(chipColor),
                            backgroundColor: chipColor,
                          }}
                        />
                      </TableCell>

                      {/* 📊 Metadata Summary */}
                      <TableCell>
                        {geo?.metadata ? (
                          <>
                            <div>Goal: {geo.metadata?.Day_volume_m3_goal ?? "—"} m³</div>
                            <div>Bank: {geo.metadata?.op_total_bank_volume_m3 ?? "—"} m³</div>
                            <div>Speed: {geo.metadata?.op_max_speed_kmh ?? "—"} km/h</div>
                            <div>Swell: {geo.metadata?.op_swell_factor ?? "—"}%</div>
                          </>
                        ) : (
                          <em>No metadata</em>
                        )}
                      </TableCell>

                      {/* ⚙️ Actions (same icon look & feel) */}
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="View on Map" arrow>
                          <IconButton
                            color="primary"
                            sx={iconButtonSx}
                            onClick={() => navigate(`/operations/geofence/map?id=${geo.id}`)}
                            size="small"
                          >
                            <MapIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Dashboard" arrow>
                          <IconButton
                            color="success"
                            sx={iconButtonSx}
                            onClick={() => navigate(`/operations/geofence/dashboard/${geo.id}`)}
                            size="small"
                          >
                            <DashboardIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 📄 Pagination */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
          />
        </Box>
      </Box>
    </PageLayout>
  );
}
