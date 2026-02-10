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
  Autocomplete,
  Checkbox,
  Box,
} from "@mui/material";
import { useParams } from "react-router-dom";
import axios from "axios";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import { useAppContext } from "../AppContext";
import { getAuthToken } from "../common/util/authToken";
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

const normalizeCalcIds = (input) => {
  const values = Array.isArray(input) ? input : [input];
  const ids = values
    .map((item) => {
      if (item == null) return null;
      if (typeof item === "number" || typeof item === "string") {
        const parsed = Number(item);
        return Number.isFinite(parsed) ? parsed : null;
      }
      if (typeof item === "object") {
        const parsed = Number(item.calc_id ?? item.calcId ?? item.id);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    })
    .filter((id) => id != null);

  return Array.from(new Set(ids));
};

const parseCalcIdsField = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) return normalizeCalcIds(value);
  if (typeof value === "number") return normalizeCalcIds([value]);
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return normalizeCalcIds(parsed);
  } catch {
    return normalizeCalcIds(trimmed.split(",").map((v) => v.trim()));
  }
};

const extractReportCalcIds = (report, fallbackId) => {
  if (!report || typeof report !== "object") {
    return normalizeCalcIds([fallbackId]);
  }

  let calcIds = parseCalcIdsField(report.calcs_ids);

  if (calcIds.length === 0 && report.calcs != null) {
    let calcs = report.calcs;
    if (typeof calcs === "string") {
      try {
        calcs = JSON.parse(calcs);
      } catch {
        calcs = [];
      }
    }

    if (Array.isArray(calcs)) {
      calcIds = normalizeCalcIds(
        calcs.flatMap((item) => [
          item?.calc_id,
          item?.calcId,
          item?.id,
          ...(Array.isArray(item?.calcs_ids) ? item.calcs_ids : []),
        ])
      );
    } else if (calcs && typeof calcs === "object") {
      calcIds = normalizeCalcIds([
        calcs.calc_id,
        calcs.calcId,
        calcs.id,
        ...(Array.isArray(calcs.calcs_ids) ? calcs.calcs_ids : []),
      ]);
    }
  }

  if (calcIds.length === 0) {
    calcIds = normalizeCalcIds([fallbackId]);
  }

  return calcIds;
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
  const effectiveTraccarId = traccarUser?.id || userId;
  const printRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [appliedDate, setAppliedDate] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [activeCalcId, setActiveCalcId] = useState(null);
  const [reportCalcIds, setReportCalcIds] = useState([]);
  const [tableTitle, setTableTitle] = useState("Report Data");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [columnLabelOverrides, setColumnLabelOverrides] = useState({});
  const [operations, setOperations] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [appliedOperation, setAppliedOperation] = useState(null);
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [operationCalcIds, setOperationCalcIds] = useState([]);
  const [operationDeviceIds, setOperationDeviceIds] = useState([]);
  const [calcTotals, setCalcTotals] = useState({});

  const handleShowRoute = (route) => {
    setSelectedRoute(route);
    setShowMap(true);
  };

  useEffect(() => {
    if (reportId && effectiveTraccarId) {
      fetchReportData(reportId, effectiveTraccarId, 0, rowsPerPage, {
        operation: null,
      });
    }
  }, [reportId, effectiveTraccarId]);

  useEffect(() => {
    setPage(0);
  }, [reportId]);

  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const token = await getAuthToken();
        const response = await axios.get(`${url}/operations`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (Array.isArray(response.data)) {
          setOperations(response.data);
        }
      } catch (error) {
        // ignore
      }
    };
    fetchOperations();
  }, [url]);

  useEffect(() => {
    const fetchOperationCalcs = async () => {
      if (!selectedOperation?.id) {
        setOperationCalcIds([]);
        return;
      }
      try {
        const token = await getAuthToken();
        const response = await axios.get(
          `${url}/operations/${selectedOperation.id}/calcs?assignedOnly=1`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (response.data?.status) {
          setOperationCalcIds(normalizeCalcIds(response.data.data || []));
        } else if (Array.isArray(response.data)) {
          setOperationCalcIds(normalizeCalcIds(response.data));
        } else {
          setOperationCalcIds([]);
        }
      } catch (error) {
        setOperationCalcIds([]);
      }
    };
    fetchOperationCalcs();
  }, [selectedOperation, url]);

  useEffect(() => {
    const fetchOperationDevices = async () => {
      if (!selectedOperation?.id) {
        setOperationDeviceIds([]);
        return;
      }
      try {
        const token = await getAuthToken();
        const response = await axios.get(
          `${url}/operation-devices/position/${selectedOperation.id}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        const rows = Array.isArray(response?.data?.devices)
          ? response.data.devices
          : [];
        const ids = Array.from(
          new Set(
            rows
              .map((row) => Number(row.device_id ?? row.id))
              .filter((id) => Number.isFinite(id))
          )
        );
        setOperationDeviceIds(ids);
      } catch (error) {
        setOperationDeviceIds([]);
      }
    };

    fetchOperationDevices();
  }, [selectedOperation, url]);

  useEffect(() => {
    if (!reportId) return;
    const storedTitle = sessionStorage.getItem(`report-title-${reportId}`);
    const storedColumns = sessionStorage.getItem(`report-columns-${reportId}`);
    const storedColumnLabels = sessionStorage.getItem(
      `report-column-labels-${reportId}`
    );
    if (storedTitle) {
      setTableTitle(storedTitle);
    }
    if (storedColumns) {
      try {
        const parsedColumns = JSON.parse(storedColumns);
        if (Array.isArray(parsedColumns)) {
          setSelectedColumns(parsedColumns);
        }
      } catch (error) {
        // ignore
      }
    }
    if (storedColumnLabels) {
      try {
        const parsedLabels = JSON.parse(storedColumnLabels);
        if (parsedLabels && typeof parsedLabels === "object") {
          setColumnLabelOverrides(parsedLabels);
        }
      } catch (error) {
        // ignore
      }
    }
  }, [reportId]);

  useEffect(() => {
    if (!reportId) return;
    sessionStorage.setItem(`report-title-${reportId}`, tableTitle);
  }, [reportId, tableTitle]);

  useEffect(() => {
    if (!reportId) return;
    sessionStorage.setItem(
      `report-columns-${reportId}`,
      JSON.stringify(selectedColumns)
    );
  }, [reportId, selectedColumns]);

  useEffect(() => {
    if (!reportId) return;
    sessionStorage.setItem(
      `report-column-labels-${reportId}`,
      JSON.stringify(columnLabelOverrides)
    );
  }, [reportId, columnLabelOverrides]);

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
    if (typeof value === "object") return JSON.stringify(value);

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

  const getDeviceIds = async () => {
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

    return {
      deviceIds:
        userId === 1
          ? newDevices.map((device) => device.id)
          : matchedDevices.map((device) => device.id),
      isSuperAdmin: userId === 1,
    };
  };

  const requestCalcReport = async (
    calcId,
    traccarId,
    deviceIds,
    isSuperAdmin,
    pageIndex,
    pageSize
  ) => {
    const response = await axios.post(
      `${url}/c-report-paged/calcs/${calcId}/user/${traccarId}`,
      {
        deviceIds,
        superAdmin: isSuperAdmin,
        page: pageIndex,
        pageSize,
      }
    );
    return {
      rows: response.data.message || [],
      total: response.data.total || 0,
    };
  };

  const requestReportPaged = async (
    reportId,
    traccarId,
    deviceIds,
    isSuperAdmin,
    pageIndex,
    pageSize,
    calcIds = [],
    operationId = null
  ) => {
    const response = await axios.post(
      `${url}/c-report-paged/report/${reportId}/user/${traccarId}`,
      {
        deviceIds,
        superAdmin: isSuperAdmin,
        page: pageIndex,
        pageSize,
        calcIds,
        operationId,
        allData: true,
      }
    );

    return {
      rows: response?.data?.message || [],
      total: response?.data?.total || 0,
      calcTotals: response?.data?.calcTotals || {},
      calcIds: normalizeCalcIds(response?.data?.calcIds || []),
      reportName: response?.data?.report?.name || null,
    };
  };

  const fetchCalculatorReport = async (calcId, traccarId, pageIndex, pageSize) => {
    setLoading(true);
    setError(null);
    setSelectedColumns([]);

    try {
      const { deviceIds, isSuperAdmin } = await getDeviceIds();
      const reportData = await requestCalcReport(
        calcId,
        traccarId,
        deviceIds,
        isSuperAdmin,
        pageIndex,
        pageSize
      );

      setData(reportData.rows);
      setColumns(Object.keys(reportData.rows[0] || {}));

      const mappingKeys = Object.keys(columnMappings[calcId] || {});
      setSelectedColumns(mappingKeys);
      setActiveCalcId(calcId);
      setReportCalcIds([calcId]);
      setTotalCount(reportData.total);
      setCalcTotals({ [calcId]: reportData.total });
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async (
    incomingId,
    traccarId,
    pageIndex,
    pageSize,
    options = {}
  ) => {
    setLoading(true);
    setError(null);
    setSelectedColumns([]);

    try {
      const operationForRequest = options.operation ?? appliedOperation;
      let calcIds = [];

      try {
        const reportResponse = await axios.get(`${url}/report/${incomingId}`);
        const report = reportResponse.data?.data;
        calcIds = extractReportCalcIds(report, incomingId);
        if (report?.name) {
          setTableTitle(report.name);
        }
      } catch (error) {
        calcIds = [];
      }

      if (calcIds.length === 0) {
        calcIds = normalizeCalcIds([incomingId]);
      }

      // If no operation is selected, let backend resolve all report calculators.
      // This avoids accidental empty results from client-side calc id fallback.
      const calcIdsToRequest = operationForRequest?.id
        ? normalizeCalcIds(calcIds)
        : [];

      const { deviceIds, isSuperAdmin } = await getDeviceIds();
      let effectiveDeviceIds = deviceIds;
      if (operationForRequest?.id && operationDeviceIds.length > 0) {
        const opDeviceSet = new Set(operationDeviceIds.map((id) => Number(id)));
        const filteredDeviceIds = deviceIds.filter((id) =>
          opDeviceSet.has(Number(id))
        );
        // Keep API flow alive: if operation-device mapping is stale, use original user devices.
        effectiveDeviceIds =
          filteredDeviceIds.length > 0 ? filteredDeviceIds : deviceIds;
      }

      const reportData = await requestReportPaged(
        incomingId,
        traccarId,
        effectiveDeviceIds,
        isSuperAdmin,
        pageIndex,
        pageSize,
        calcIdsToRequest,
        operationForRequest?.id || null
      );

      const merged = reportData.rows || [];
      const responseCalcIds =
        reportData.calcIds.length > 0 ? reportData.calcIds : calcIdsToRequest;

      setData(merged);
      const allColumns = Object.keys(merged[0] || {});
      setColumns(allColumns);
      setActiveCalcId(Number(responseCalcIds[0]) || null);
      setReportCalcIds(responseCalcIds);
      setTotalCount(reportData.total || 0);
      setCalcTotals(reportData.calcTotals || {});
      if (reportData.reportName) {
        setTableTitle(reportData.reportName);
      }

      const mappingKeys = Object.keys(columnMappings[responseCalcIds[0]] || {});
      if (mappingKeys.length > 0) {
        const mergedColumns =
          responseCalcIds.length > 1 ? ["calcId", ...mappingKeys] : mappingKeys;
        setSelectedColumns(mergedColumns);
      } else {
        // For operation-specific cloned calculators, mapping may be missing.
        // In this case show all payload columns by default.
        setSelectedColumns(allColumns);
      }
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
    const operationFilterActive = Boolean(appliedOperation?.id);

    if (operationFilterActive) {
      const normalizedReportCalcIds = normalizeCalcIds(reportCalcIds);
      const normalizedOperationCalcIds = normalizeCalcIds(operationCalcIds);
      if (normalizedOperationCalcIds.length > 0) {
        const reportCalcSet = new Set(normalizedReportCalcIds);
        const allowed = new Set(
          normalizedReportCalcIds.length > 0
            ? normalizedOperationCalcIds.filter((id) => reportCalcSet.has(id))
            : normalizedOperationCalcIds
        );
        result = result.filter((row) => {
          const calcId = Number(row.calcId ?? activeCalcId);
          return Number.isFinite(calcId) && allowed.has(calcId);
        });
      }
    }

    const hasDateField = data.length > 0 && "date" in data[0];
    const dateField = hasDateField ? "date" : "begin";

    if (appliedDate) {
      result = result.filter((row) => {
        const rawValue = row[dateField];
        const date = new Date(
          typeof rawValue === "number" && rawValue < 1e12
            ? rawValue * 1000
            : rawValue
        );
        return date.toDateString() === appliedDate.toDateString();
      });
    }

    if (appliedSearchQuery) {
      result = result.filter((row) => {
        const name1 = row["device.name"]?.toLowerCase() || "";
        const name2 = row["1_Nombre"]?.toLowerCase() || "";
        const query = appliedSearchQuery.toLowerCase();

        return name1.includes(query) || name2.includes(query);
      });
    }

    return result;
  }, [
    data,
    appliedDate,
    appliedSearchQuery,
    appliedOperation,
    operationCalcIds,
    reportCalcIds,
    operationDeviceIds,
    activeCalcId,
  ]);

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [appliedDate, appliedSearchQuery, appliedOperation]);

  const handleFetchData = () => {
    setAppliedDate(selectedDate);
    setAppliedSearchQuery(searchQuery);
    setAppliedOperation(selectedOperation);
    setPage(0);
    fetchReportData(reportId, effectiveTraccarId, 0, rowsPerPage, {
      operation: selectedOperation,
    });
  };

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

  const mapCalcId = activeCalcId || reportId;
  const visibleColumns = selectedColumns.length > 0 ? selectedColumns : columns;

  const today = new Date();

  const hasDateField = columns.some(
    (col) =>
      col.toLowerCase().includes("date") || col.toLowerCase().includes("time")
  );
  const hasRouteColumn = filteredData.some((row) => Boolean(row.route));

  const getColumnLabel = (column) => {
    if (columnLabelOverrides[column]) return columnLabelOverrides[column];
    if (column === "calcId") return "Calculator";
    return columnMappings[mapCalcId]?.[column] || formatColumnName(column);
  };

  const handleRenameColumn = (column) => {
    const currentLabel = getColumnLabel(column);
    const nextLabel = window.prompt("Rename column", currentLabel);
    if (nextLabel == null) return;
    const trimmed = nextLabel.trim();
    setColumnLabelOverrides((prev) => {
      if (!trimmed) {
        const { [column]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [column]: trimmed };
    });
  };

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
      <Box
        sx={{
          display: "flex",
          gap: 2,
          p: 3,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {hasDateField && (
          <Box sx={{ width: { xs: "100%", sm: 220, md: 240 } }}>
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
                  <TextField {...params} size="small" fullWidth />
                )}
              />
            </LocalizationProvider>
          </Box>
        )}

        <TextField
          label={t("sharedSearchDevice")}
          variant="outlined"
          size="small"
          sx={{ width: { xs: "100%", sm: 260, md: 280 }, flexGrow: 1 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Box sx={{ width: { xs: "100%", sm: 260, md: 300 } }}>
          <Autocomplete
            options={operations}
            value={selectedOperation}
            onChange={(event, value) => setSelectedOperation(value)}
            getOptionLabel={(option) =>
              option?.name ? `${option.name} (#${option.id})` : ""
            }
            renderInput={(params) => (
              <TextField {...params} label="Operation" size="small" />
            )}
          />
        </Box>

        <Button
          variant="contained"
          onClick={handleFetchData}
          sx={{ width: { xs: "100%", sm: 180, md: 170 } }}
        >
          {t("sharedFetchData")}
        </Button>
        {columns.length > 0 && (
          <Box
            sx={{
              width: { xs: "100%", md: 320 },
              ml: { xs: 0, lg: "auto" },
            }}
          >
            <Autocomplete
              multiple
              limitTags={3}
              disableCloseOnSelect
              options={columns}
              value={selectedColumns}
              onChange={(event, values) => {
                const ordered = [...values].sort(
                  (a, b) => columns.indexOf(a) - columns.indexOf(b)
                );
                setSelectedColumns(ordered);
              }}
              getOptionLabel={(option) => getColumnLabel(option)}
              renderTags={(value, getTagProps) => {
                if (value.length === 0) {
                  return null;
                }
                return (
                  <span style={{ color: "#cbd5f5" }}>
                    {value.length}
                  </span>
                );
              }}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox checked={selected} sx={{ mr: 1 }} />
                  {getColumnLabel(option)}
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label="Show Columns" size="small" />
              )}
            />
          </Box>
        )}
        <Button
          variant="contained"
          onClick={handleExportExcel}
          sx={{ width: { xs: "100%", sm: 220, md: 220 } }}
        >
          {t("sharedDownloadExcel")}
        </Button>
      </Box>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 30px", flexWrap: "wrap" }}>
        {isEditingTitle ? (
          <TextField
            size="small"
            value={tableTitle}
            onChange={(e) => setTableTitle(e.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            sx={{ width: "40%" }}
          />
        ) : (
          <Typography
            variant="h6"
            onClick={() => setIsEditingTitle(true)}
            sx={{ cursor: "pointer" }}
          >
            {tableTitle}
          </Typography>
        )}
      </div>

      <TableContainer sx={{ mt: 3, p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column}
                  onDoubleClick={() => handleRenameColumn(column)}
                  style={{ cursor: "pointer" }}
                  title="Double-click to rename"
                >
                  {getColumnLabel(column)}
                </TableCell>
              ))}
              {hasRouteColumn && <TableCell>Map</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => (
                <TableRow key={index}>
                  {visibleColumns.map((col) => {
                    let value = formatValue(col, row[col], language);
                    value =
                      value === true
                        ? "True"
                        : value === false
                          ? "False"
                          : value;

                    return <TableCell key={col}>{value}</TableCell>;
                  })}
                  {hasRouteColumn && (
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
                  )}
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
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
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
