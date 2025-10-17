import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TableSortLabel,
  Box,
  IconButton,
  CircularProgress,
  Chip,
  TextField,
  Tooltip,
} from "@mui/material";
import RoomIcon from "@mui/icons-material/Room";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { Menu, MenuItem } from "@mui/material";
import dayjs from "dayjs";
import useDistrictFetcher from "../../settings/hooks/useDistrictFetcher";
import useZoneRateFetcher from "../../settings/hooks/useZoneRateFetcher";
import { useSelector } from "react-redux";

const AVERAGE_SPEED_KMH = 40;

const DispatchResultTable = ({
  devicesInRadius,
  markerPosition,
  destinationPosition,
  searchValue,
  newAllDevices,
  setMapCenter,
  setSelectedDeviceId,
  selectedDeviceIds,
  setSelectedDeviceIds,
  onRowDataChange,
  mapRef,
  setMapZoom,
  selectedServiceType,
  etaMap,
  setEtaMap,
  userId,
}) => {
  const [columnFilters, setColumnFilters] = useState({
    licensePlate: "",
    type: "",
    advisor: "",
    lastConnection: "",
    appStatus: "",
    movement: "",
    distance: "",
    eta: "",
    cost: "",
    district: "",
    initialBase: "",
    zoneRate: "",
  });
  const { districts, fetchDistrict } = useDistrictFetcher();
  const { zoneRates, fetchZoneRate } = useZoneRateFetcher();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState("distance");
  const [sortOrder, setSortOrder] = useState("asc");
  const [loadingDistricts, setLoadingDistricts] = useState(new Set());
  const [loadingZoneRates, setLoadingZoneRates] = useState(new Set());
  const [rowData, setRowData] = useState([]);
  const [anchorElCols, setAnchorElCols] = useState(null);
  const isGrua = selectedServiceType.some((service) => service.name === "GRUA");
  const allColumns = [
    { id: "location", label: "Location" },
    { id: "lastConnection", label: "Last Connection" },
    { id: "movement", label: "Movement" },
    { id: "appStatus", label: "App Status" },
    { id: "subprocess", label: "Subprocess" },
    { id: "licensePlate", label: "License Plate" },
    { id: "type", label: "Type" },
    { id: "advisor", label: "Advisor" },
    { id: "distance", label: "Distance (km)" },
    { id: "eta", label: "ETA (min)" },
    { id: "cost", label: "Cost ($)" },
    ...(isGrua ? [{ id: "zoneRate", label: "Zone Rate" }] : []),
    { id: "district", label: "District" },
    { id: "initialBase", label: "Initial Base" },
    { id: "rimacEta", label: "Rimac ETA (min)" },
  ];

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem("dispatchVisibleColumns");
    return saved ? JSON.parse(saved) : allColumns.map((c) => c.id);
  });

  useEffect(() => {
    localStorage.setItem(
      "dispatchVisibleColumns",
      JSON.stringify(visibleColumns)
    );
  }, [visibleColumns]);
  const handleColumnMenuClick = (event) => setAnchorElCols(event.currentTarget);
  const handleColumnMenuClose = () => setAnchorElCols(null);
  const getAvailabilityChip = (status) => {
    switch (status) {
      case "available":
        return (
          <Chip
            label="Available"
            sx={{
              backgroundColor: "#d0f2d0",
              color: "#2e7d32",
              fontWeight: 500,
            }}
          />
        );
      case "in service":
        return (
          <Chip
            label="In Service"
            sx={{
              backgroundColor: "#fff4cc",
              color: "#ef6c00",
              fontWeight: 500,
            }}
          />
        );
      case "unavailable":
        return (
          <Chip
            label="Unavailable"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case "not associate":
        return (
          <Chip
            label="Not Associated"
            sx={{ backgroundColor: "#f0f0f0", color: "#666", fontWeight: 500 }}
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

  const parseNumberFilter = useCallback((value) => {
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }, []);

  const calculateETAForDevice = useCallback(
    (device) => {
      const targetPosition =
        isGrua && destinationPosition ? destinationPosition : markerPosition;
      if (!targetPosition || !window.google || !device.lat || !device.lng) {
        setEtaMap((prev) => ({ ...prev, [device.id]: null }));
        return;
      }

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: device.lat, lng: device.lng },
          destination: targetPosition,
          travelMode: window.google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: false,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            const durationSeconds = result.routes[0].legs[0].duration.value;
            const distanceMeters = result.routes[0].legs[0].distance.value;
            const etaMinutes = Math.ceil(durationSeconds / 60);
            const distanceKm = (distanceMeters / 1000).toFixed(2);
            setEtaMap((prev) => ({
              ...prev,
              [device.id]: { eta: etaMinutes, distance: distanceKm },
            }));
          } else {
            setEtaMap((prev) => ({ ...prev, [device.id]: null }));
          }
        }
      );
    },
    [markerPosition, destinationPosition, isGrua]
  );

  const handleFetchDistrict = useCallback(
    async (lat, lng, id) => {
      if (districts[id] || loadingDistricts.has(id)) return;
      setLoadingDistricts((prev) => new Set(prev).add(id));
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await fetchDistrict(lat, lng, id);
      } catch (error) {
        console.error(`Failed to fetch district for ${id}:`, error);
      } finally {
        setLoadingDistricts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    },
    [districts, fetchDistrict, loadingDistricts]
  );

  const handleZoomToDevice = useCallback(
    (device) => {
      setMapCenter({ lat: device.lat, lng: device.lng });
      setMapZoom(18);
      setSelectedDeviceId(device.id);
      if (mapRef?.current) {
        mapRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    [setMapCenter, setMapZoom, setSelectedDeviceId, mapRef]
  );

  const handleRowClick = useCallback(
    (e, deviceId, device) => {
      let updatedSelectedIds = [...selectedDeviceIds];
      let updatedRowData = [];

      if (e.ctrlKey || e.metaKey) {
        if (updatedSelectedIds.includes(deviceId)) {
          updatedSelectedIds = updatedSelectedIds.filter(
            (id) => id !== deviceId
          );
        } else {
          updatedSelectedIds = [...updatedSelectedIds, deviceId];
        }
      } else {
        updatedSelectedIds =
          updatedSelectedIds.length === 1 && updatedSelectedIds[0] === deviceId
            ? []
            : [deviceId];
      }

      setSelectedDeviceIds(updatedSelectedIds);

      updatedRowData = updatedSelectedIds.map((id) => {
        const deviceInfo = devicesInRadius.find((d) => d.id === id);
        const fullDeviceInfo =
          newAllDevices.find((d) => d.id === id) || deviceInfo;
        const distance =
          etaMap[id]?.distance ||
          (deviceInfo.distance
            ? (deviceInfo.distance / 1000).toFixed(2)
            : "N/A");
        const eta =
          etaMap[id]?.eta ||
          (distance !== "N/A"
            ? Math.ceil((distance / AVERAGE_SPEED_KMH) * 60)
            : "N/A");
        const cost =
          distance !== "N/A" && fullDeviceInfo.costByKm
            ? (parseFloat(distance) * fullDeviceInfo.costByKm).toFixed(2)
            : "Not set";

        return {
          id: deviceInfo.id,
          eta,
          speed: deviceInfo.speed,
          driverAvailability: deviceInfo.driverAvailability,
          name: fullDeviceInfo.name || "N/A",
          services: fullDeviceInfo.services || [],
          drivername: fullDeviceInfo.driver || "Not associated",
          district: districts[id] || "N/A",
          initialBase: fullDeviceInfo.initialBase || "Never recorded",
          distance,
          cost,
          zoneRate: isGrua ? zoneRates[id] || "N/A" : null,
        };
      });

      onRowDataChange(updatedRowData);
    },
    [
      setSelectedDeviceIds,
      devicesInRadius,
      newAllDevices,
      etaMap,
      districts,
      zoneRates,
      onRowDataChange,
      isGrua,
    ]
  );

  const filteredItems = useMemo(() => {
    if (!devicesInRadius) return [];

    const globalSearch = (searchValue || "").toLowerCase();

    const validDevices = devicesInRadius.filter((device) => {
      const deviceServiceIds = (device.services || []).map(
        (service) => service.serviceId || service.id
      );
      if (selectedServiceType?.length) {
        if (
          !selectedServiceType.some((selectedService) =>
            deviceServiceIds.includes(selectedService.id)
          )
        ) {
          return false;
        }
      }

      const deviceInfo =
        newAllDevices.find((d) => d.id === device.id) || device;

      const licensePlate = (deviceInfo.name || "N/A").toLowerCase();
      const type = (deviceInfo.services || [])
        .map((service) =>
          (service.serviceName || service.name || "N/A").toLowerCase()
        )
        .join(" ");
      const advisor = (deviceInfo.driver || "Not associated").toLowerCase();
      const lastConnectionStr = device.fixTime
        ? dayjs(device.fixTime).format("YYYY-MM-DD HH:mm:ss")
        : "N/A";
      const movementStatus = device.speed > 5 ? "moving" : "stop";
      const distance =
        etaMap[device.id]?.distance ||
        (device.distance ? (device.distance / 1000).toFixed(2) : "N/A");
      const eta =
        etaMap[device.id]?.eta ||
        (distance !== "N/A"
          ? Math.ceil((distance / AVERAGE_SPEED_KMH) * 60)
          : "N/A");
      const cost =
        distance !== "N/A" && deviceInfo.costByKm
          ? parseFloat(distance) * deviceInfo.costByKm
          : "Not set";
      const district = (districts[device.id] || "N/A").toLowerCase();
      const initialBase = (
        deviceInfo.initialBase || "Never recorded"
      ).toLowerCase();
      const zoneRate = isGrua ? zoneRates[device.id] || "N/A" : "";

      const globalMatch = globalSearch
        ? [
            movementStatus,
            licensePlate,
            type,
            advisor,
            distance,
            eta !== "N/A" ? `${eta}` : "N/A",
            cost,
            district,
            initialBase,
            isGrua ? zoneRate : "",
          ].some((field) => field.toLowerCase().includes(globalSearch))
        : true;

      const licensePlateMatch = columnFilters.licensePlate
        ? licensePlate.includes(columnFilters.licensePlate.toLowerCase())
        : true;
      const typeMatch = columnFilters.type
        ? type.includes(columnFilters.type.toLowerCase())
        : true;
      const advisorMatch = columnFilters.advisor
        ? advisor.includes(columnFilters.advisor.toLowerCase())
        : true;
      const lastConnectionMatch = columnFilters.lastConnection
        ? lastConnectionStr.includes(columnFilters.lastConnection)
        : true;
      const movementMatch = columnFilters.movement
        ? movementStatus.includes(columnFilters.movement.toLowerCase())
        : true;
      let distanceMatch = true;
      if (columnFilters.distance && distance !== "N/A") {
        const filterStr = columnFilters.distance.trim();
        const numFilter = parseNumberFilter(
          filterStr.replace(/[^0-9.><=]/g, "")
        );
        if (numFilter !== null) {
          const parsedDistance = parseFloat(distance);
          if (filterStr.startsWith(">="))
            distanceMatch = parsedDistance >= numFilter;
          else if (filterStr.startsWith("<="))
            distanceMatch = parsedDistance <= numFilter;
          else if (filterStr.startsWith(">"))
            distanceMatch = parsedDistance > numFilter;
          else if (filterStr.startsWith("<"))
            distanceMatch = parsedDistance < numFilter;
          else distanceMatch = parsedDistance === numFilter;
        }
      }
      let etaMatch = true;
      if (columnFilters.eta && eta !== "N/A") {
        const filterStr = columnFilters.eta.trim();
        const numFilter = parseNumberFilter(
          filterStr.replace(/[^0-9.><=]/g, "")
        );
        if (numFilter !== null) {
          if (filterStr.startsWith(">=")) etaMatch = eta >= numFilter;
          else if (filterStr.startsWith("<=")) etaMatch = eta <= numFilter;
          else if (filterStr.startsWith(">")) etaMatch = eta > numFilter;
          else if (filterStr.startsWith("<")) etaMatch = eta < numFilter;
          else etaMatch = eta === numFilter;
        }
      }
      let costMatch = true;
      if (columnFilters.cost && cost !== "not set") {
        const filterStr = columnFilters.cost.trim();
        const numFilter = parseNumberFilter(
          filterStr.replace(/[^0-9.><=]/g, "")
        );
        if (numFilter !== null) {
          const parsedCost = parseFloat(cost);
          if (filterStr.startsWith(">=")) costMatch = parsedCost >= numFilter;
          else if (filterStr.startsWith("<="))
            costMatch = parsedCost <= numFilter;
          else if (filterStr.startsWith(">"))
            costMatch = parsedCost > numFilter;
          else if (filterStr.startsWith("<"))
            costMatch = parsedCost < numFilter;
          else costMatch = parsedCost === numFilter;
        }
      }
      const districtMatch = columnFilters.district
        ? district.includes(columnFilters.district.toLowerCase())
        : true;
      const initialBaseMatch = columnFilters.initialBase
        ? initialBase.includes(columnFilters.initialBase.toLowerCase())
        : true;
      const zoneRateMatch =
        isGrua && columnFilters.zoneRate
          ? zoneRate.includes(columnFilters.zoneRate.toLowerCase())
          : true;

      return (
        globalMatch &&
        licensePlateMatch &&
        typeMatch &&
        advisorMatch &&
        lastConnectionMatch &&
        movementMatch &&
        distanceMatch &&
        etaMatch &&
        costMatch &&
        districtMatch &&
        initialBaseMatch &&
        zoneRateMatch
      );
    });

    return validDevices.sort((a, b) => {
      const deviceA = newAllDevices.find((d) => d.id === a.id) || a;
      const deviceB = newAllDevices.find((d) => d.id === b.id) || b;
      let valueA, valueB;

      switch (sortColumn) {
        case "lastConnection":
          valueA = a.fixTime ? new Date(a.fixTime).getTime() : 0;
          valueB = b.fixTime ? new Date(b.fixTime).getTime() : 0;
          break;
        case "movement":
          valueA = a.speed > 5 ? "moving" : "stop";
          valueB = b.speed > 5 ? "moving" : "stop";
          break;
        case "licensePlate":
          valueA = deviceA.name || "N/A";
          valueB = deviceB.name || "N/A";
          break;
        case "type":
          valueA = (deviceA.services || [])
            .map((s) => s.serviceName || s.name || "N/A")
            .join(" ");
          valueB = (deviceB.services || [])
            .map((s) => s.serviceName || s.name || "N/A")
            .join(" ");
          break;
        case "advisor":
          valueA = deviceA.driver || "Not associated";
          valueB = deviceB.driver || "Not associated";
          break;
        case "distance":
          valueA = a.distance ? parseFloat((a.distance / 1000).toFixed(2)) : 0;
          valueB = b.distance ? parseFloat((b.distance / 1000).toFixed(2)) : 0;
          break;
        case "eta":
          valueA =
            etaMap[a.id]?.eta ||
            (a.distance
              ? Math.ceil((a.distance / 1000 / AVERAGE_SPEED_KMH) * 60)
              : 0);
          valueB =
            etaMap[b.id]?.eta ||
            (b.distance
              ? Math.ceil((b.distance / 1000 / AVERAGE_SPEED_KMH) * 60)
              : 0);
          break;
        case "cost":
          valueA =
            a.distance && deviceA.costByKm
              ? parseFloat((a.distance / 1000).toFixed(2)) * deviceA.costByKm
              : 0;
          valueB =
            b.distance && deviceB.costByKm
              ? parseFloat((b.distance / 1000).toFixed(2)) * deviceB.costByKm
              : 0;
          break;
        case "district":
          valueA = districts[a.id] || "N/A";
          valueB = districts[b.id] || "N/A";
          break;
        case "initialBase":
          valueA = deviceA.initialBase || "Never recorded";
          valueB = deviceB.initialBase || "Never recorded";
          break;
        case "zoneRate":
          if (isGrua) {
            valueA = zoneRates[a.id] || "N/A";
            valueB = zoneRates[b.id] || "N/A";
          } else {
            return 0;
          }
          break;
        default:
          return 0;
      }

      if (valueA === valueB) return 0;
      if (!valueA || valueA === "N/A") return 1;
      if (!valueB || valueB === "N/A") return -1;

      return sortOrder === "asc"
        ? valueA > valueB
          ? 1
          : -1
        : valueA < valueB
        ? 1
        : -1;
    });
  }, [
    devicesInRadius,
    searchValue,
    columnFilters,
    districts,
    zoneRates,
    etaMap,
    sortColumn,
    sortOrder,
    parseNumberFilter,
    selectedServiceType,
    newAllDevices,
    isGrua,
  ]);

  useEffect(() => {
    const visibleDevices = filteredItems.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );

    if (
      isGrua &&
      markerPosition &&
      !districts["incident"] &&
      !loadingDistricts.has("incident")
    ) {
      handleFetchDistrict(markerPosition.lat, markerPosition.lng, "incident");
    }
    if (
      isGrua &&
      destinationPosition &&
      !districts["destination"] &&
      !loadingDistricts.has("destination")
    ) {
      handleFetchDistrict(
        destinationPosition.lat,
        destinationPosition.lng,
        "destination"
      );
    }

    visibleDevices.forEach((device) => {
      if (!districts[device.id] && !loadingDistricts.has(device.id)) {
        handleFetchDistrict(device.lat, device.lng, device.id);
      }

      if (
        isGrua &&
        districts[device.id] &&
        districts["incident"] &&
        districts["destination"] &&
        !zoneRates[device.id] &&
        !loadingZoneRates.has(device.id)
      ) {
        setLoadingZoneRates((prev) => new Set(prev).add(device.id));
        fetchZoneRate(
          userId,
          districts[device.id],
          districts["incident"],
          districts["destination"],
          device.id
        ).finally(() => {
          setLoadingZoneRates((prev) => {
            const newSet = new Set(prev);
            newSet.delete(device.id);
            return newSet;
          });
        });
      }

      if (
        !etaMap[device.id] &&
        (markerPosition || (isGrua && destinationPosition))
      ) {
        calculateETAForDevice(device);
      }
    });
  }, [
    filteredItems,
    page,
    rowsPerPage,
    districts,
    zoneRates,
    etaMap,
    handleFetchDistrict,
    fetchZoneRate,
    calculateETAForDevice,
    loadingDistricts,
    loadingZoneRates,
    markerPosition,
    destinationPosition,
    isGrua,
    userId,
  ]);

  const handleSort = useCallback(
    (column) => {
      if (sortColumn === column) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortColumn(column);
        setSortOrder("asc");
      }
    },
    [sortColumn, sortOrder]
  );

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <IconButton onClick={handleColumnMenuClick}>
          <ViewColumnIcon />
        </IconButton>
        <Menu
          anchorEl={anchorElCols}
          open={Boolean(anchorElCols)}
          onClose={handleColumnMenuClose}
        >
          {allColumns.map((col) => (
            <MenuItem key={col.id}>
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setVisibleColumns([...visibleColumns, col.id]);
                  } else {
                    setVisibleColumns(
                      visibleColumns.filter((c) => c !== col.id)
                    );
                  }
                }}
              />
              <span style={{ marginLeft: 8 }}>{col.label}</span>
            </MenuItem>
          ))}
        </Menu>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            {allColumns
              .filter((col) => visibleColumns.includes(col.id))
              .map((col) => (
                <TableCell key={col.id}>
                  {[
                    "lastConnection",
                    "movement",
                    "licensePlate",
                    "type",
                    "advisor",
                    "distance",
                    "eta",
                    "cost",
                    "zoneRate",
                    "district",
                    "initialBase",
                  ].includes(col.id) ? (
                    <TableSortLabel
                      active={sortColumn === col.id}
                      direction={sortColumn === col.id ? sortOrder : "asc"}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
          </TableRow>
          {/* Filters row */}
          <TableRow>
            {allColumns
              .filter((col) => visibleColumns.includes(col.id))
              .map((col) => (
                <TableCell key={col.id}>
                  {[
                    "licensePlate",
                    "type",
                    "advisor",
                    "lastConnection",
                    "movement",
                    "distance",
                    "eta",
                    "cost",
                    "district",
                    "initialBase",
                    "zoneRate",
                  ].includes(col.id) ? (
                    <TextField
                      size="small"
                      variant="standard"
                      placeholder="Search"
                      value={columnFilters[col.id] || ""}
                      onChange={(e) =>
                        setColumnFilters((prev) => ({
                          ...prev,
                          [col.id]: e.target.value,
                        }))
                      }
                    />
                  ) : null}
                </TableCell>
              ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {filteredItems
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((device) => {
              const deviceInfo =
                newAllDevices.find((d) => d.id === device.id) || device;
              const distance =
                etaMap[device.id]?.distance ||
                (device.distance ? (device.distance / 1000).toFixed(2) : "N/A");
              const eta =
                etaMap[device.id]?.eta ||
                (distance !== "N/A"
                  ? Math.ceil((distance / AVERAGE_SPEED_KMH) * 60)
                  : "N/A");
              const cost =
                distance !== "N/A" && deviceInfo.costByKm
                  ? parseFloat(distance) * deviceInfo.costByKm
                  : "Not set";

              return (
                <TableRow
                  key={device.id}
                  hover
                  onClick={(e) => handleRowClick(e, device.id, device)}
                  sx={{
                    cursor: "pointer",
                    backgroundColor: selectedDeviceIds?.includes(device.id)
                      ? "rgba(25, 118, 210, 0.1)"
                      : "inherit",
                  }}
                >
                  {visibleColumns.includes("location") && (
                    <TableCell>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZoomToDevice(device);
                        }}
                      >
                        <RoomIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                  {visibleColumns.includes("lastConnection") && (
                    <TableCell>{device.fixTime || "N/A"}</TableCell>
                  )}
                  {visibleColumns.includes("movement") && (
                    <TableCell
                      sx={{ color: device.speed > 5 ? "green" : "red" }}
                    >
                      {device.speed > 5 ? "Moving" : "Stop"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("appStatus") && (
                    <TableCell>
                      {getAvailabilityChip(device.driverAvailability)}
                    </TableCell>
                  )}
                  {visibleColumns.includes("subprocess") && (
                    <TableCell>N/A</TableCell>
                  )}
                  {visibleColumns.includes("licensePlate") && (
                    <TableCell>{deviceInfo.name || "N/A"}</TableCell>
                  )}
                  {visibleColumns.includes("type") && (
                    <TableCell>
                      {deviceInfo.services?.map((s, i) => (
                        <Chip
                          key={i}
                          label={s.serviceName || s.name || "N/A"}
                        />
                      )) || "N/A"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("advisor") && (
                    <TableCell>
                      {deviceInfo.driver || "Not associated"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("distance") && (
                    <TableCell>{distance}</TableCell>
                  )}
                  {visibleColumns.includes("eta") && (
                    <TableCell>{eta !== "N/A" ? `${eta} min` : eta}</TableCell>
                  )}
                  {visibleColumns.includes("cost") && (
                    <TableCell>
                      {cost !== "Not set" ? `${cost} $` : cost}
                    </TableCell>
                  )}
                  {isGrua && visibleColumns.includes("zoneRate") && (
                    <TableCell>
                      {zoneRates[device.id] ? (
                        `$${zoneRates[device.id]}`
                      ) : loadingZoneRates.has(device.id) ? (
                        <CircularProgress size={15} />
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes("district") && (
                    <TableCell>
                      {districts[device.id] ? (
                        districts[device.id]
                      ) : loadingDistricts.has(device.id) ? (
                        <CircularProgress size={15} />
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes("initialBase") && (
                    <TableCell>
                      {deviceInfo.initialBase || "Never recorded"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("rimacEta") && (
                    <TableCell>N/A</TableCell>
                  )}
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={filteredItems.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Box>
  );
};

export default DispatchResultTable;
