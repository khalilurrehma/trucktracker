import React, { useEffect, useState } from "react";
import OperationsMenu from "../settings/components/OperationsMenu";
import PageLayout from "../common/components/PageLayout";
import axios from "axios";
import { useAppContext } from "../AppContext";
import { useSelector } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Box,
  TextField,
  Grid,
  Chip,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";

const DispatchSearchHistory = () => {
  const userId = useSelector((state) => state.session.user.id);
  const { url } = useAppContext();
  const [historyData, setHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addressFilter, setAddressFilter] = useState("");
  const [radiusFilter, setRadiusFilter] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        userId === 1
          ? `${url}/dispatch/search/history`
          : `${url}/dispatch/search/history/${userId}`
      );

      setHistoryData(Array.isArray(data.data) ? data.data : [data.data]);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dispatch history:", error);
      setError("Failed to load dispatch history.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId, url]);

  // Apply filters whenever historyData or filter inputs change
  useEffect(() => {
    let filtered = historyData;

    // Address filter
    if (addressFilter) {
      filtered = filtered.filter((row) =>
        row.address.toLowerCase().includes(addressFilter.toLowerCase())
      );
    }

    // Radius filter
    if (radiusFilter) {
      filtered = filtered.filter(
        (row) => Number(row.radius) >= Number(radiusFilter)
      );
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((row) => {
        const rowDate = dayjs(row.time);
        const afterStart = startDate
          ? rowDate.isAfter(startDate) || rowDate.isSame(startDate)
          : true;
        const beforeEnd = endDate
          ? rowDate.isBefore(endDate) || rowDate.isSame(endDate)
          : true;
        return afterStart && beforeEnd;
      });
    }

    setFilteredData(filtered);
  }, [historyData, addressFilter, radiusFilter, startDate, endDate]);

  const casesRadius = (radius) => {
    switch (radius) {
      case 1000:
        return (
          <Chip
            label="1km"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case 2000:
        return (
          <Chip
            label="2km"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case 3000:
        return (
          <Chip
            label="3km"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case 4000:
        return (
          <Chip
            label="4km"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case 5000:
        return (
          <Chip
            label="5km"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case 10000:
        return (
          <Chip
            label="5km"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case 20000:
        return (
          <Chip
            label="5km"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case 30000:
        return (
          <Chip
            label="5km"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );

      default:
        return (
          <Chip
            label="Unknown"
            sx={{ backgroundColor: "#e0e0e0", color: "#999", fontWeight: 500 }}
          />
        );
    }
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs2={["Operations", "reportDispatchResult"]}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Filter by Address"
                variant="outlined"
                fullWidth
                value={addressFilter}
                onChange={(e) => setAddressFilter(e.target.value)}
                placeholder="e.g., Perú Bus"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Minimum Radius (m)"
                variant="outlined"
                fullWidth
                type="number"
                value={radiusFilter}
                onChange={(e) => setRadiusFilter(e.target.value)}
                placeholder="e.g., 3000"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={4}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : filteredData.length === 0 ? (
          <Typography>No history data available.</Typography>
        ) : (
          <TableContainer>
            <Table
              sx={{ minWidth: 650 }}
              aria-label="dispatch search history table"
            >
              <TableHead>
                <TableRow>
                  {/* <TableCell sx={{ fontWeight: "bold" }}>ID</TableCell> */}
                  <TableCell sx={{ fontWeight: "bold" }}>Address</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Latitude</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Longitude</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Radius (m)</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Case Assigned
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((row) => {
                  return (
                    <TableRow key={row.id}>
                      {/* <TableCell>{row.id}</TableCell> */}
                      <TableCell>{row.address}</TableCell>
                      <TableCell>{row.latitude.toFixed(6)}</TableCell>
                      <TableCell>{row.longitude.toFixed(6)}</TableCell>
                      <TableCell>{casesRadius(row.radius)}</TableCell>
                      <TableCell>{row.case_assigned ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        {new Date(row.time).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </PageLayout>
  );
};

export default DispatchSearchHistory;
