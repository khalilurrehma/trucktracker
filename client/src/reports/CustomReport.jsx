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

  const sendMapCommand = (command) => {
    if (!mapReady || !mapRef.current) return;
    const cmdString = "MapView|cmd:" + JSON.stringify(command);
    mapRef.current.contentWindow.postMessage(cmdString, "*");
  };

  useEffect(() => {
    if (mapReady && routeData) {
      sendMapCommand({ clear: "all" });
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
    1745151: {
      "1_Nombre": t("reportDeviceName"),
      "4_Vehiculo_en_plataforma": t("reportvehicleOnPlatform"),
      "2_Inicio": t("sharedBegin"),
      "3_Fin": t("sharedEnd"),
      "5_Duracion_formateada": t("reportDuration"),
      "7_Mapa_Inicio": t("reportmapLinkFinish"),
      "9_Mapa_Fin": t("reportmapLinkStart"),
      // avg_speed: t("reportAverageSpeed"),
      // device_type_id: t("deviceTypeId"),
      // distance_activity: t("reportDistanceActivity"),
      // event_time_finish: t("reportEventTimeFinish"),
      // event_time_start: t("reportEventTimeStart"),
      // id: "ID",
      // latitude_finish: t("reportLatitudeFinish"),
      // latitude_start: t("reportLatitudeStart"),
      // longitude_finish: t("reportLongitudeFinish"),
      // longitude_start: t("reportLongitudeStart"),
      // timestamp: t("timestamp"),
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

    if (["date", "timestamp", "begin", "end"].includes(key)) {
      return formatAnyDate(value, language);
    }

    if (
      ["duration", "stop.seconds", "motion.seconds", "work.seconds"].includes(
        key
      )
    ) {
      const hours = (value / 3600).toFixed(2);
      return `${hours} h`;
    }

    if (typeof value === "number" && value % 1 !== 0) {
      value = value.toFixed(2);
    }

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

      const mappingKeys = Object.keys(columnMappings[calcId] || {});
      setSelectedColumns(mappingKeys);
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

    const hasDateField = data.length > 0 && "date" in data[0];
    const dateField = hasDateField ? "date" : "begin";

    if (selectedDate) {
      result = result.filter((row) => {
        const rawValue = row[dateField];
        const date = new Date(
          typeof rawValue === "number" && rawValue < 1e12
            ? rawValue * 1000
            : rawValue
        );
        return date.toDateString() === selectedDate.toDateString();
      });
    }

    if (searchQuery) {
      result = result.filter((row) => {
        const name1 = row["device.name"]?.toLowerCase() || "";
        const name2 = row["1_Nombre"]?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();

        return name1.includes(query) || name2.includes(query);
      });
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

  const hasDateField = columns.some(
    (col) =>
      col.toLowerCase().includes("date") || col.toLowerCase().includes("time")
  );

  if (loading) {
    return (
      <PageLayout menu={<ReportsMenu />} breadcrumbs2={["reportTitle", "Wait"]}>
        <TableContainer sx={{ mt: 3, p: 2 }}>
          <TableShimmer columns={8} />
        </TableContainer>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout menu={<ReportsMenu />} breadcrumbs2={["reportTitle", "Wait"]}>
        <Typography sx={{ mt: 3, p: 2 }} color="error">
          {error}
        </Typography>
      </PageLayout>
    );
  }

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs2={["reportTitle", "Wait"]}>
      <div style={{ display: "flex", gap: "20px", padding: "30px" }}>
        {hasDateField && (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={t("sharedSelectDate")}
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              shouldDisableDate={(date) =>
                date.toDateString() === today.toDateString()
              }
              disableFuture
              renderInput={(params) => (
                <TextField {...params} size="small" sx={{ width: "30%" }} />
              )}
            />
          </LocalizationProvider>
        )}

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
              .map((row, index) => (
                <TableRow key={index}>
                  {sortedOriginalColumns.map((col) => {
                    let value = formatValue(col, row[col], language);
                    value =
                      value === true
                        ? "True"
                        : value === false
                        ? "False"
                        : value;

                    return <TableCell key={col}>{value}</TableCell>;
                  })}
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
              ))}
          </TableBody>
        </Table>
      </TableContainer>

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
