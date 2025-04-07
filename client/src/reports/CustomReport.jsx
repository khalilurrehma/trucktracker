import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  TablePagination,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useParams } from "react-router-dom";
import axios from "axios";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import { useAppContext } from "../AppContext";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  formatColumnName,
  formatUnixTimestamp,
} from "../settings/common/New.Helper";
import MapIcon from "@mui/icons-material/Map";
import TableShimmer from "../common/components/TableShimmer";
import { useSelector } from "react-redux";

function MapViewComponent({ routeData }) {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Listen for MapView ready state
    const handleMessage = (event) => {
      if (
        typeof event.data === "string" &&
        event.data.indexOf("MapView|state:") === 0
      ) {
        const state = JSON.parse(event.data.replace("MapView|state:", ""));
        if (state.ready) {
          setMapReady(true);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Function to send commands to MapView
  const sendMapCommand = (command) => {
    if (!mapReady || !mapRef.current) return;
    const cmdString = "MapView|cmd:" + JSON.stringify(command);
    mapRef.current.contentWindow.postMessage(cmdString, "*");
  };

  // Display route when routeData changes
  useEffect(() => {
    if (mapReady && routeData) {
      // Clear previous routes
      sendMapCommand({ clear: "all" });
      // Add the new route
      sendMapCommand({ addgroutes: [routeData] });
    }
  }, [mapReady, routeData]);

  return (
    <iframe
      ref={mapRef}
      src="https://flespi.io/mapview/"
      title="MapView"
      width="100%"
      height="400px"
      style={{ border: "none" }}
    />
  );
}

const columnMappings = {
  1742524: {
    "device.name": "Device Name",
    begin: "Begin",
    duration: "Duration",
    "max.speed": "Max Speed",
    distance: "Distance",
    distance_can: "Distance (CAN)",
    "avg.speed": "Average Speed",
    end: "End",
    route: "Route",
  },
  1742525: {
    "device.name": "Device Name",
    imei: "IMEI",
    date: "Date",
    "position.mileage": "GPS Mileage",
    "total.mileage": "Total Mileage",
    "work.hours": "Engine Hours",
    "motion.hours": "Motion Hours",
    "stop.hours": "Stop Hours",
    "idle.hours": "Idle Hours",
    "max.speed": "Max Speed",
    "avg.speed": "Average Speed",
    "daily.gps.mileage": "Daily GPS Mileage",
    "total.gps.mileage": "Total GPS Mileage",
  },
  1742527: {
    "device.name": "Device Name",
    begin: "Begin",
    end: "End",
    duration: "Duration",
    route: "Route",
  },
};

const CustomReport = () => {
  const url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  const { reportId } = useParams();
  const userId = useSelector((state) => state.session.user.id);
  const { traccarUser } = useAppContext();
  const printRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const handleShowRoute = (route) => {
    setSelectedRoute(route);
    setShowMap(true);
  };

  useEffect(() => {
    if (reportId && traccarUser?.id) {
      fetchCalculatorReport(reportId, traccarUser.id);
    }
  }, [reportId, traccarUser]);

  const fetchCalculatorReport = async (calcId, traccarId) => {
    setLoading(true);
    setError(null);
    setSelectedColumns([]); // Reset selectedColumns before fetching new data

    try {
      const apiUrl = `${url}/new-devices`;

      const [newDevicesResponse, permissionDevicesResponse] =
        await Promise.allSettled([
          axios.get(apiUrl),
          fetch("/api/devices").then((res) =>
            res.ok ? res.json() : Promise.reject("API Error")
          ),
        ]);

      if (
        newDevicesResponse.status !== "fulfilled" ||
        permissionDevicesResponse.status !== "fulfilled"
      ) {
        throw new Error("Failed to fetch data");
      }

      const newDevices = newDevicesResponse.value.data.data;
      const permissionDevices = permissionDevicesResponse.value;

      const matchedDevices = findMatchingDevices(newDevices, permissionDevices);
      const deviceIds =
        userId === 1
          ? newDevices.map((device) => device.id)
          : matchedDevices.map((device) => device.id);

      console.log(calcId, "calcId");
      console.log(traccarId, "traccarId");
      console.log(deviceIds, "deviceIds");

      // const response = await axios.post(
      //   `${url}/c-report/calcs/${calcId}/user/${traccarId}`,
      //   {
      //     deviceIds,
      //     superAdmin: !!traccarUser?.superAdmin,
      //   }
      // );

      // const reportData = response.data.message;

      // setData(reportData);
      // setColumns(Object.keys(reportData[0] || {}));

      // const filteredColumns = Object.keys(reportData[0] || {}).filter(
      //   (col) => !["points", "route"].includes(col)
      // );
      // setSelectedColumns(filteredColumns);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const findMatchingDevices = (newDevices, permissionDevices) => {
    return newDevices.filter((newDevice) =>
      permissionDevices.some(
        (permissionDevice) => permissionDevice.id === newDevice.traccarId
      )
    );
  };

  useEffect(() => {
    if (columns.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(columns);
    }
  }, [columns]);

  const filteredData = useMemo(() => {
    let result = [...data];

    if (selectedDate) {
      result = result.filter((row) => {
        const date = new Date(row["date"]);
        return date.toDateString() === selectedDate.toDateString();
      });
    }

    if (searchQuery) {
      result = result.filter((row) =>
        row["device.name"]?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [data, selectedDate, searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [filteredData]);

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      "report.xlsx"
    );
  };

  const getMappedColumns = (columns, calcId) => {
    const mapping = columnMappings[calcId] || {};

    let mappedColumns = columns.map((col) => mapping[col] || col);

    mappedColumns.sort((a, b) => {
      if (a === "device.id" || a === "Device Name") return -1;
      if (b === "device.id" || b === "Device Name") return 1;
      return 0;
    });

    return mappedColumns;
  };

  const sortedMappedColumns = getMappedColumns(selectedColumns, reportId);
  const sortedOriginalColumns = getMappedColumns(selectedColumns, reportId).map(
    (mappedCol) =>
      Object.keys(columnMappings[reportId] || {}).find(
        (key) => columnMappings[reportId][key] === mappedCol
      ) || mappedCol
  );

  const today = new Date();

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs2={["reportTitle", "Wait"]}>
      <div style={{ display: "flex", gap: "20px", padding: "30px" }}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Select Date"
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            shouldDisableDate={(date) => {
              return date.toDateString() === today.toDateString();
            }}
            disableFuture
            renderInput={(params) => (
              <TextField {...params} size="small" sx={{ width: "30%" }} />
            )}
          />
        </LocalizationProvider>

        <TextField
          label="Search Device"
          variant="outlined"
          size="small"
          sx={{ width: "30%" }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Button
          variant="outlined"
          onClick={handleExportExcel}
          sx={{ width: "20%" }}
        >
          Download Excel
        </Button>
        <Button
          variant="contained"
          onClick={() => fetchCalculatorReport(reportId, traccarUser.id)}
          sx={{ width: "15%" }}
        >
          Fetch Data
        </Button>
      </div>

      <TableContainer sx={{ mt: 3, p: 2 }}>
        {loading ? (
          <TableShimmer columns={columns.length} />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                {sortedMappedColumns?.map((index, col) => (
                  <TableCell key={col}>{index}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  return (
                    <TableRow key={index}>
                      {sortedOriginalColumns.map((col) => (
                        <TableCell key={col}>
                          {["begin", "end", "timestamp"].includes(col)
                            ? formatUnixTimestamp(row[col])
                            : row[col] ?? "N/A"}
                        </TableCell>
                      ))}
                      <TableCell>
                        {row.route && (
                          <IconButton
                            onClick={() => handleShowRoute(row.route)}
                            aria-label="Show route"
                          >
                            <MapIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) =>
            setRowsPerPage(parseInt(e.target.value, 10))
          }
        />
      </TableContainer>

      {showMap && selectedRoute && (
        <Dialog
          open={showMap}
          onClose={() => setShowMap(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Route View</DialogTitle>
          <DialogContent>
            <MapViewComponent routeData={selectedRoute} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowMap(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </PageLayout>
  );
};

export default CustomReport;
