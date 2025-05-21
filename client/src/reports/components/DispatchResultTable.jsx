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
import dayjs from "dayjs";
import { getDistanceFromLatLonInMeters } from "../../settings/common/New.Helper";
import useDistrictFetcher from "../../settings/hooks/useDistrictFetcher";

const AVERAGE_SPEED_KMH = 40;
// Sample geofence repair area (replace with actual coordinates)
const GEOFENCE_REPAIR = {
  center: { lat: -12.0432, lng: -77.0282 }, // Example: Rimac, Lima
  radius: 500, // 500m radius
};

const DispatchResultTable = ({
  devicesInRadius,
  markerPosition,
  searchValue,
  newAllDevices,
  setMapCenter,
  setSelectedDeviceId,
  selectedDeviceIds,
  setSelectedDeviceIds,
  mapRef,
  setMapZoom,
  selectedServiceType,
}) => {
  // Log devicesInRadius for debugging
  console.log("Devices in Radius (DispatchResultTable):", devicesInRadius);
  console.log("Selected Service Type:", selectedServiceType);

  const [columnFilters, setColumnFilters] = useState({
    deviceId: "",
    licensePlate: "",
    type: "",
    advisor: "",
    lastConnection: "",
    movement: "",
    distance: "",
    eta: "",
    cost: "",
    district: "",
    initialBase: "",
  });
  const { districts, fetchDistrict } = useDistrictFetcher();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState("distance");
  const [sortOrder, setSortOrder] = useState("asc");
  const [etaMap, setEtaMap] = useState({});
  const [loadingDistricts, setLoadingDistricts] = useState(new Set());

  const parseNumberFilter = useCallback((value) => {
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }, []);

  // Check if a device is inside the geofence repair area
  const isInsideGeofence = useCallback((lat, lng) => {
    if (!window.google || !window.google.maps.geometry) return false;
    const distance = getDistanceFromLatLonInMeters(
      lat,
      lng,
      GEOFENCE_REPAIR.center.lat,
      GEOFENCE_REPAIR.center.lng
    );
    return distance <= GEOFENCE_REPAIR.radius;
  }, []);

  // Fetch ETA and distance using Directions API
  const calculateETAForDevice = useCallback(
    (device) => {
      if (!markerPosition || !window.google || !device.lat || !device.lng) {
        setEtaMap((prev) => ({ ...prev, [device.id]: null }));
        return;
      }

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: device.lat, lng: device.lng },
          destination: markerPosition,
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
    [markerPosition]
  );

  // Rate-limited district fetching
  const handleFetchDistrict = useCallback(
    async (lat, lng, deviceId) => {
      if (districts[deviceId] || loadingDistricts.has(deviceId)) return;
      setLoadingDistricts((prev) => new Set(prev).add(deviceId));
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limit: 1 request/second
        await fetchDistrict(lat, lng, deviceId);
      } catch (error) {
        console.error(`Failed to fetch district for ${deviceId}:`, error);
      } finally {
        setLoadingDistricts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(deviceId);
          return newSet;
        });
      }
    },
    [districts, fetchDistrict, loadingDistricts]
  );

  // Handle zoom to device
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

  // Handle row click for selection
  const handleRowClick = useCallback(
    (e, deviceId) => {
      if (e.ctrlKey || e.metaKey) {
        setSelectedDeviceIds((prev) =>
          prev.includes(deviceId)
            ? prev.filter((id) => id !== deviceId)
            : [...prev, deviceId]
        );
      } else {
        setSelectedDeviceIds((prev) =>
          prev.length === 1 && prev[0] === deviceId ? [] : [deviceId]
        );
      }
    },
    [setSelectedDeviceIds]
  );

  // Memoized filtering and sorting
  const filteredItems = useMemo(() => {
    if (!devicesInRadius) return [];

    const globalSearch = (searchValue || "").toLowerCase();

    const validDevices = devicesInRadius.filter((device) => {
      // Skip devices in geofence repair area
      if (isInsideGeofence(device.lat, device.lng)) return false;

      // Service type filtering
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

      // Use device directly for critical fields, fallback to newAllDevices
      const deviceInfo =
        newAllDevices.find((d) => d.id === device.id) || device;

      const deviceId = String(device.id || "").toLowerCase();
      const licensePlate = (deviceInfo.name || "").toLowerCase();
      const type = (deviceInfo.services || [])
        .map((service) =>
          (service.serviceName || service.name || "").toLowerCase()
        )
        .join(" ");
      const advisor = (deviceInfo.attributes?.advisor || "").toLowerCase();
      const lastConnectionStr = device.lastUpdate
        ? dayjs(device.lastUpdate).format("YYYY-MM-DD HH:mm:ss")
        : "";
      const movementStatus = device.status === "online" ? "moving" : "stop";
      const distance = device.distance
        ? (device.distance / 1000).toFixed(2)
        : "N/A";
      const eta =
        etaMap[device.id]?.eta ||
        (distance !== "N/A"
          ? Math.ceil((distance / AVERAGE_SPEED_KMH) * 60)
          : null);
      const cost =
        distance !== "N/A" && deviceInfo.costByKm && deviceInfo.initialBase
          ? (
              parseFloat(distance) * deviceInfo.costByKm +
              deviceInfo.initialBase
            ).toFixed(2)
          : "N/A";
      const district = (districts[device.id] || "").toLowerCase();
      const initialBase = (deviceInfo.initialBase || "").toLowerCase();

      const globalMatch =
        deviceId.includes(globalSearch) ||
        licensePlate.includes(globalSearch) ||
        advisor.includes(globalSearch) ||
        type.includes(globalSearch);

      const deviceIdMatch = columnFilters.deviceId
        ? deviceId.includes(columnFilters.deviceId.toLowerCase())
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
      if (columnFilters.eta && eta !== null) {
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
      if (columnFilters.cost && cost !== "N/A") {
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

      return (
        globalMatch &&
        deviceIdMatch &&
        licensePlateMatch &&
        typeMatch &&
        advisorMatch &&
        lastConnectionMatch &&
        movementMatch &&
        distanceMatch &&
        etaMatch &&
        costMatch &&
        districtMatch &&
        initialBaseMatch
      );
    });

    console.log("Filtered Items:", validDevices);

    return validDevices.sort((a, b) => {
      const deviceA = newAllDevices.find((d) => d.id === a.id) || a;
      const deviceB = newAllDevices.find((d) => d.id === b.id) || b;
      let valueA, valueB;

      switch (sortColumn) {
        case "deviceId":
          valueA = a.id || "";
          valueB = b.id || "";
          break;
        case "lastConnection":
          valueA = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
          valueB = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
          break;
        case "movement":
          valueA = a.status === "online" ? "moving" : "stop";
          valueB = b.status === "online" ? "moving" : "stop";
          break;
        case "licensePlate":
          valueA = deviceA.name || "";
          valueB = deviceB.name || "";
          break;
        case "type":
          valueA = (deviceA.services || [])
            .map((s) => s.serviceName || s.name || "")
            .join(" ");
          valueB = (deviceB.services || [])
            .map((s) => s.serviceName || s.name || "")
            .join(" ");
          break;
        case "advisor":
          valueA = deviceA.attributes?.advisor || "";
          valueB = deviceB.attributes?.advisor || "";
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
            a.distance && deviceA.costByKm && deviceA.initialBase
              ? parseFloat((a.distance / 1000).toFixed(2)) * deviceA.costByKm +
                deviceA.initialBase
              : 0;
          valueB =
            b.distance && deviceB.costByKm && deviceB.initialBase
              ? parseFloat((b.distance / 1000).toFixed(2)) * deviceB.costByKm +
                deviceB.initialBase
              : 0;
          break;
        case "district":
          valueA = districts[a.id] || "";
          valueB = districts[b.id] || "";
          break;
        case "initialBase":
          valueA = deviceA.initialBase || "";
          valueB = deviceB.initialBase || "";
          break;
        default:
          return 0;
      }

      if (valueA === valueB) return 0;
      if (!valueA) return 1;
      if (!valueB) return -1;

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
    etaMap,
    sortColumn,
    sortOrder,
    parseNumberFilter,
    isInsideGeofence,
    selectedServiceType,
    newAllDevices,
  ]);

  // Fetch districts and ETAs for visible devices
  useEffect(() => {
    const visibleDevices = filteredItems.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );

    visibleDevices.forEach((device) => {
      if (!districts[device.id] && !loadingDistricts.has(device.id)) {
        handleFetchDistrict(device.lat, device.lng, device.id);
      }
      if (!etaMap[device.id]) {
        calculateETAForDevice(device);
      }
    });
  }, [
    filteredItems,
    page,
    rowsPerPage,
    districts,
    etaMap,
    handleFetchDistrict,
    calculateETAForDevice,
    loadingDistricts,
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
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Location</TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "lastConnection"}
                direction={sortColumn === "lastConnection" ? sortOrder : "asc"}
                onClick={() => handleSort("lastConnection")}
              >
                Last Connection
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "movement"}
                direction={sortColumn === "movement" ? sortOrder : "asc"}
                onClick={() => handleSort("movement")}
              >
                Movement
              </TableSortLabel>
            </TableCell>
            <TableCell>App Status</TableCell>
            <TableCell>Subprocess</TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "licensePlate"}
                direction={sortColumn === "licensePlate" ? sortOrder : "asc"}
                onClick={() => handleSort("licensePlate")}
              >
                License Plate
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "type"}
                direction={sortColumn === "type" ? sortOrder : "asc"}
                onClick={() => handleSort("type")}
              >
                Type
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "advisor"}
                direction={sortColumn === "advisor" ? sortOrder : "asc"}
                onClick={() => handleSort("advisor")}
              >
                Advisor
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "distance"}
                direction={sortColumn === "distance" ? sortOrder : "asc"}
                onClick={() => handleSort("distance")}
              >
                Distance (km)
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "eta"}
                direction={sortColumn === "eta" ? sortOrder : "asc"}
                onClick={() => handleSort("eta")}
              >
                ETA (min)
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "cost"}
                direction={sortColumn === "cost" ? sortOrder : "asc"}
                onClick={() => handleSort("cost")}
              >
                Cost ($)
              </TableSortLabel>
            </TableCell>
            <TableCell>Zone Rate</TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "district"}
                direction={sortColumn === "district" ? sortOrder : "asc"}
                onClick={() => handleSort("district")}
              >
                District
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "initialBase"}
                direction={sortColumn === "initialBase" ? sortOrder : "asc"}
                onClick={() => handleSort("initialBase")}
              >
                Initial Base
              </TableSortLabel>
            </TableCell>
            <TableCell>Rimac ETA (min)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Search"
                value={columnFilters.deviceId}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    deviceId: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell />
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="YYYY-MM-DD HH:mm:ss"
                value={columnFilters.lastConnection}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    lastConnection: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Moving/Stop"
                value={columnFilters.movement}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    movement: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell />
            <TableCell />
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Search"
                value={columnFilters.licensePlate}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    licensePlate: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Search"
                value={columnFilters.type}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Search"
                value={columnFilters.advisor}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    advisor: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell>
              <Tooltip title="Use >=, <=, >, <, or exact number">
                <TextField
                  size="small"
                  variant="standard"
                  placeholder="e.g., >=5"
                  value={columnFilters.distance}
                  onChange={(e) =>
                    setColumnFilters((prev) => ({
                      ...prev,
                      distance: e.target.value,
                    }))
                  }
                />
              </Tooltip>
            </TableCell>
            <TableCell>
              <Tooltip title="Use >=, <=, >, <, or exact number">
                <TextField
                  size="small"
                  variant="standard"
                  placeholder="e.g., <=10"
                  value={columnFilters.eta}
                  onChange={(e) =>
                    setColumnFilters((prev) => ({
                      ...prev,
                      eta: e.target.value,
                    }))
                  }
                />
              </Tooltip>
            </TableCell>
            <TableCell>
              <Tooltip title="Use >=, <=, >, <, or exact number">
                <TextField
                  size="small"
                  variant="standard"
                  placeholder="e.g., >50"
                  value={columnFilters.cost}
                  onChange={(e) =>
                    setColumnFilters((prev) => ({
                      ...prev,
                      cost: e.target.value,
                    }))
                  }
                />
              </Tooltip>
            </TableCell>
            <TableCell />
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Search"
                value={columnFilters.district}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    district: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Search"
                value={columnFilters.initialBase}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    initialBase: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell />
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
                distance !== "N/A" &&
                deviceInfo.costByKm &&
                deviceInfo.initialBase
                  ? (
                      parseFloat(distance) * deviceInfo.costByKm +
                      deviceInfo.initialBase
                    ).toFixed(2)
                  : "N/A";

              return (
                <TableRow
                  key={device.id}
                  hover
                  onClick={(e) => handleRowClick(e, device.id)}
                  sx={{
                    cursor: "pointer",
                    backgroundColor: selectedDeviceIds?.includes(device.id)
                      ? "rgba(25, 118, 210, 0.1)"
                      : "inherit",
                  }}
                >
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
                  <TableCell>N/A</TableCell> {/* Last Connection: static */}
                  <TableCell
                    sx={{ color: device.status === "online" ? "green" : "red" }}
                  >
                    {device.status === "online" ? "Moving" : "Stop"}{" "}
                    {/* Movement: derived */}
                  </TableCell>
                  <TableCell>N/A</TableCell> {/* App Status: static */}
                  <TableCell>N/A</TableCell> {/* Subprocess: static */}
                  <TableCell>{deviceInfo.name || "N/A"}</TableCell>
                  <TableCell>
                    {deviceInfo.services?.map((service, index) => (
                      <Chip
                        key={index}
                        label={service.serviceName || service.name || "N/A"}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )) || "N/A"}
                  </TableCell>
                  <TableCell>N/A</TableCell> {/* Advisor: static */}
                  <TableCell>{distance}</TableCell>
                  <TableCell>{eta !== "N/A" ? `${eta} min` : eta}</TableCell>
                  <TableCell>{cost !== "N/A" ? `${cost} $` : cost}</TableCell>
                  <TableCell>N/A</TableCell> {/* Zone Rate: static */}
                  <TableCell>
                    {districts[device.id] ? (
                      districts[device.id]
                    ) : loadingDistricts.has(device.id) ? (
                      <CircularProgress size={15} />
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>{deviceInfo.initialBase || "N/A"}</TableCell>
                  <TableCell>N/A</TableCell> {/* Rimac ETA: static */}
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
