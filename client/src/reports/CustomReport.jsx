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
import {
  useLocalization,
  useTranslation,
} from "../common/components/LocalizationProvider";
import { format } from "date-fns";
import { enUS, es } from "date-fns/locale";

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

const getLocale = (language) => {
  switch (language) {
    case "es":
      return es;
    case "en":
    default:
      return enUS;
  }
};

const CustomReport = () => {
  const t = useTranslation();
  const columnMappings = {
    1742524: {
      "device.name": t("reportDeviceName"),
      begin: t("sharedBegin"),
      duration: t("reportDuration"),
      "max.speed": t("sharedMaxSpeed"),
      distance: t("sharedDistance"),
      distance_can: t("sharedDistanCAN"),
      "avg.speed": t("reportAverageSpeed"),
      end: t("sharedEnd"),
      route: t("reportRoute"),
    },
    1742525: {
      "device.name": t("reportDeviceName"),
      imei: "IMEI",
      date: "Date",
      "position.mileage": t("reportGPSMileage"),
      "total.mileage": t("reportTotalMileage"),
      "work.hours": t("reportEngineHours"),
      "motion.hours": t("reportMotionHours"),
      "stop.hours": t("reportStopHours"),
      "idle.hours": t("reportIdleHours"),
      "max.speed": t("sharedMaxSpeed"),
      "avg.speed": t("reportAverageSpeed"),
      "daily.gps.mileage": t("reportDailyGPSMileage"),
      "total.gps.mileage": t("reportTotalGPSMileage"),
    },
    1742527: {
      "device.name": t("reportDeviceName"),
      begin: t("sharedBegin"),
      end: t("sharedEnd"),
      duration: t("reportDuration"),
      route: "Route",
    },
    1746972: {
      "device.id": t("reportDeviceID"),
      begin: t("sharedBegin"),
      "device.name": t("reportDeviceName"),
      "driver.id": t("reportDriverID"),
      "driver.validation": t("reportDriverValidation"),
      duration: t("reportDuration"),
      end: t("sharedEnd"),
      "fuel.end": t("sharedFuelEnd"),
      "fuel.end.liters": t("sharedFuelEndLiters"),
      "fuel.start": t("sharedFuelStart"),
      "fuel.start.liters": t("sharedFuelStartLiters"),
      "fuel.total.day": t("sharedFuelTotalDay"),
      id: "ID",
      imei: "IMEI",
      "odometer.end": t("sharedOdometerEnd"),
      "odometer.start": t("sharedOdometerStart"),
      "odometer.total": t("sharedOdometerTotal"),
      timestamp: t("sharedTimestamp"),
    },
  };
  const url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  const { reportId } = useParams();
  const { language } = useLocalization();
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
    if (reportId && userId) {
      fetchCalculatorReport(reportId, userId);
    }
  }, [reportId, userId]);

  const formatAnyDate = (value, language = "en") => {
    const locale = getLocale(language);
    let date;

    if (typeof value === "string") {
      date = new Date(value);
    } else if (typeof value === "number") {
      date = new Date(value > 1e12 ? value : value * 1000);
    } else {
      return "Invalid date";
    }

    if (isNaN(date)) return "Invalid date";

    return format(date, "PPP p", { locale });
  };

  const formatValue = (key, value, language = "en") => {
    if (value == null) return "N/A";

    const locale = getLocale(language);

    // Handle timestamps and date strings
    if (["date", "timestamp", "begin", "end"].includes(key)) {
      return formatAnyDate(value, language);
    }

    // Handle duration in seconds -> hours/mins
    if (
      ["duration", "stop.seconds", "motion.seconds", "work.seconds"].includes(
        key
      )
    ) {
      const hours = (value / 3600).toFixed(2); // 2 decimal places
      return `${hours} h`;
    }

    // Round float values to 2 decimals if needed
    if (typeof value === "number" && value % 1 !== 0) {
      value = value.toFixed(2);
    }

    // Add units if applicable
    const units = {
      "max.speed": "km/h",
      "avg.speed": "km/h",
      distance: "km",
      distance_can: "km",
      "position.mileage": "km",
      "gps.mileage": "km",
      "total.mileage": "km",
      "total.gps.mileage": "km",
      "daily.gps.mileage": "km",
      "odometer.start": "km",
      "odometer.end": "km",
      "work.hours": "h",
      "stop.hours": "h",
      "idle.hours": "h",
      "motion.hours": "h",
    };

    return units[key] ? `${value} ${units[key]}` : value;
  };

  const fetchCalculatorReport = async (calcId, traccarId) => {
    setLoading(true);
    setError(null);
    setSelectedColumns([]);

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

      const response = await axios.post(
        `${url}/c-report/calcs/${calcId}/user/${traccarId}`,
        {
          deviceIds,
          superAdmin: userId === 1 ? true : false,
        }
      );

      const reportData = response.data.message;

      setData(reportData);
      setColumns(Object.keys(reportData[0] || {}));

      const filteredColumns = Object.keys(reportData[0] || {}).filter(
        (col) => !["points", "route"].includes(col)
      );
      setSelectedColumns(filteredColumns);
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

    console.log(mappedColumns);

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
            label={t("sharedSelectDate")}
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
          label={t("sharedSearchDevice")}
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
          {t("sharedDownloadExcel")}
        </Button>
        <Button
          variant="contained"
          onClick={() => fetchCalculatorReport(reportId, traccarUser.id)}
          sx={{ width: "15%" }}
        >
          {t("sharedFetchData")}
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
                          {formatValue(col, row[col], language)}
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
