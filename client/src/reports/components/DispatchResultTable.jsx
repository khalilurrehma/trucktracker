import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import RoomIcon from "@mui/icons-material/Room";
import dayjs from "dayjs";
import { getDistanceFromLatLonInMeters } from "../../settings/common/New.Helper";
import useDistrictFetcher from "../../settings/hooks/useDistrictFetcher";

const AVERAGE_SPEED_KMH = 40;

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
}) => {
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
  const [filteredItems, setFilteredItems] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState("lastConnection");
  const [sortOrder, setSortOrder] = useState("desc");
  const [etaMap, setEtaMap] = useState({});

  const parseNumberFilter = (value) => {
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return "N/A";
    return (
      getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) / 1000
    ).toFixed(2);
  };

  const handleFetchDistrict = async (lat, lng, deviceId) => {
    await fetchDistrict(lat, lng, deviceId);
  };

  const calculateETAForDevice = (pos) => {
    if (!markerPosition) return null;
    const origin = { lat: pos.latitude, lng: pos.longitude };
    const destination = markerPosition;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          const durationSeconds = result.routes[0].legs[0].duration.value;
          setEtaMap((prev) => ({
            ...prev,
            [pos.deviceId]: Math.ceil(durationSeconds / 60),
          }));
        } else {
          setEtaMap((prev) => ({ ...prev, [pos.deviceId]: null }));
        }
      }
    );
  };

  const handleZoomToDevice = (device) => {
    setMapCenter({ lat: device.latitude, lng: device.longitude });
    setMapZoom(18);
    setSelectedDeviceId(device.deviceId);

    if (mapRef?.current) {
      mapRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleRowClick = (e, deviceId) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedDeviceIds((prev) =>
        prev?.includes(deviceId)
          ? prev.filter((id) => id !== deviceId)
          : [...prev, deviceId]
      );
    } else {
      setSelectedDeviceIds((prev) =>
        prev?.length === 1 && prev[0] === deviceId ? [] : [deviceId]
      );
    }
  };

  useEffect(() => {
    filteredItems.forEach((pos) => {
      if (!districts[pos.deviceId]) {
        handleFetchDistrict(pos.latitude, pos.longitude, pos.deviceId);
      }
    });
  }, [filteredItems, districts, fetchDistrict]);

  useEffect(() => {
    filteredItems.forEach((pos) => {
      if (!etaMap[pos.deviceId]) {
        calculateETAForDevice(pos);
      }
    });
  }, [filteredItems, markerPosition]);

  useEffect(() => {
    if (!devicesInRadius || !newAllDevices) {
      setFilteredItems([]);
      return;
    }

    const globalSearch = (searchValue || "").toLowerCase();

    let filtered = devicesInRadius.filter((pos) => {
      const device = newAllDevices.find((d) => d.id === pos.deviceId);
      if (!device) return false;

      const deviceId = String(pos.deviceId || "").toLowerCase();
      const licensePlate = (device.name || "").toLowerCase();
      const type = (device.attributes?.["device.type"] || "").toLowerCase();
      const advisor = (device.attributes?.advisor || "").toLowerCase();
      const serviceNames = (device.services || [])
        .map((service) =>
          (service.serviceName || service.name || "").toLowerCase()
        )
        .join(" ");
      const lastConnectionStr = pos.fixTime
        ? dayjs(pos.fixTime).format("YYYY-MM-DD HH:mm:ss")
        : "";
      const distance = markerPosition
        ? parseFloat(
            (
              getDistanceFromLatLonInMeters(
                markerPosition.lat,
                markerPosition.lng,
                pos.latitude,
                pos.longitude
              ) / 1000
            ).toFixed(2)
          )
        : null;
      const eta =
        distance !== null && !isNaN(distance)
          ? Math.ceil((distance / AVERAGE_SPEED_KMH) * 60)
          : null;
      const cost =
        distance !== null && device?.costByKm
          ? distance * device.costByKm
          : null;
      const district = (districts[pos.deviceId] || "").toLowerCase();
      const movementStatus = (pos.speed ?? 0) > 5 ? "moving" : "stop";

      const globalMatch =
        deviceId.includes(globalSearch) ||
        licensePlate.includes(globalSearch) ||
        advisor.includes(globalSearch) ||
        serviceNames.includes(globalSearch);

      const deviceIdMatch = columnFilters.deviceId
        ? deviceId.includes(columnFilters.deviceId.toLowerCase())
        : true;
      const licensePlateMatch = columnFilters.licensePlate
        ? licensePlate.includes(columnFilters.licensePlate.toLowerCase())
        : true;
      const typeMatch = columnFilters.type
        ? serviceNames.includes(columnFilters.type.toLowerCase())
        : true;
      const advisorMatch = columnFilters.advisor
        ? advisor.includes(columnFilters.advisor.toLowerCase())
        : true;
      const lastConnectionMatch = columnFilters.lastConnection
        ? lastConnectionStr.includes(columnFilters.lastConnection)
        : true;
      const movementMatch = columnFilters.movement
        ? movementStatus === columnFilters.movement.toLowerCase()
        : true;
      let distanceMatch = true;
      if (columnFilters.distance) {
        const filterStr = columnFilters.distance.trim();
        const numFilter = parseNumberFilter(
          filterStr.replace(/[^0-9.><=]/g, "")
        );
        if (numFilter !== null) {
          if (filterStr.startsWith(">=")) distanceMatch = distance >= numFilter;
          else if (filterStr.startsWith("<="))
            distanceMatch = distance <= numFilter;
          else if (filterStr.startsWith(">"))
            distanceMatch = distance > numFilter;
          else if (filterStr.startsWith("<"))
            distanceMatch = distance < numFilter;
          else distanceMatch = distance === numFilter;
        }
      }
      let etaMatch = true;
      if (columnFilters.eta) {
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
      if (columnFilters.cost) {
        const filterStr = columnFilters.cost.trim();
        const numFilter = parseNumberFilter(
          filterStr.replace(/[^0-9.><=]/g, "")
        );
        if (numFilter !== null) {
          if (filterStr.startsWith(">=")) costMatch = cost >= numFilter;
          else if (filterStr.startsWith("<=")) costMatch = cost <= numFilter;
          else if (filterStr.startsWith(">")) costMatch = cost > numFilter;
          else if (filterStr.startsWith("<")) costMatch = cost < numFilter;
          else costMatch = cost === numFilter;
        }
      }
      const districtMatch = columnFilters.district
        ? district.includes(columnFilters.district.toLowerCase())
        : true;
      const initialBaseMatch = columnFilters.initialBase
        ? device.initialBase
            ?.toLowerCase()
            .includes(columnFilters.initialBase.toLowerCase())
        : true;

      return (
        globalMatch &&
        deviceIdMatch &&
        licensePlateMatch &&
        typeMatch &&
        initialBaseMatch &&
        advisorMatch &&
        lastConnectionMatch &&
        movementMatch &&
        distanceMatch &&
        etaMatch &&
        costMatch &&
        districtMatch
      );
    });

    filtered = filtered.sort((a, b) => {
      const deviceA = newAllDevices.find((d) => d.id === a.deviceId);
      const deviceB = newAllDevices.find((d) => d.id === b.deviceId);
      let valueA, valueB;

      switch (sortColumn) {
        case "deviceId":
          valueA = a.deviceId || "";
          valueB = b.deviceId || "";
          break;
        case "lastConnection":
          valueA = a.fixTime ? new Date(a.fixTime).getTime() : 0;
          valueB = b.fixTime ? new Date(b.fixTime).getTime() : 0;
          break;
        case "movement":
          valueA = (a.speed ?? 0) > 5 ? "moving" : "stop";
          valueB = (b.speed ?? 0) > 5 ? "moving" : "stop";
          break;
        case "licensePlate":
          valueA = deviceA?.name || "";
          valueB = deviceB?.name || "";
          break;
        case "type":
          valueA = deviceA?.attributes?.["device.type"] || "";
          valueB = deviceB?.attributes?.["device.type"] || "";
          break;
        case "advisor":
          valueA = deviceA?.attributes?.advisor || "";
          valueB = deviceB?.attributes?.advisor || "";
          break;
        case "distance":
          valueA =
            markerPosition && a.latitude && a.longitude
              ? parseFloat(
                  (
                    getDistanceFromLatLonInMeters(
                      markerPosition.lat,
                      markerPosition.lng,
                      a.latitude,
                      a.longitude
                    ) / 1000
                  ).toFixed(2)
                )
              : 0;
          valueB =
            markerPosition && b.latitude && b.longitude
              ? parseFloat(
                  (
                    getDistanceFromLatLonInMeters(
                      markerPosition.lat,
                      markerPosition.lng,
                      b.latitude,
                      b.longitude
                    ) / 1000
                  ).toFixed(2)
                )
              : 0;
          break;
        case "eta":
          valueA =
            markerPosition && a.latitude && a.longitude
              ? Math.ceil(
                  (parseFloat(
                    (
                      getDistanceFromLatLonInMeters(
                        markerPosition.lat,
                        markerPosition.lng,
                        a.latitude,
                        a.longitude
                      ) / 1000
                    ).toFixed(2)
                  ) /
                    AVERAGE_SPEED_KMH) *
                    60
                )
              : 0;
          valueB =
            markerPosition && b.latitude && b.longitude
              ? Math.ceil(
                  (parseFloat(
                    (
                      getDistanceFromLatLonInMeters(
                        markerPosition.lat,
                        markerPosition.lng,
                        b.latitude,
                        b.longitude
                      ) / 1000
                    ).toFixed(2)
                  ) /
                    AVERAGE_SPEED_KMH) *
                    60
                )
              : 0;
          break;
        case "cost":
          valueA =
            markerPosition && a.latitude && a.longitude && deviceA?.costByKm
              ? parseFloat(
                  (
                    getDistanceFromLatLonInMeters(
                      markerPosition.lat,
                      markerPosition.lng,
                      a.latitude,
                      a.longitude
                    ) / 1000
                  ).toFixed(2)
                ) * deviceA.costByKm
              : 0;
          valueB =
            markerPosition && b.latitude && b.longitude && deviceB?.costByKm
              ? parseFloat(
                  (
                    getDistanceFromLatLonInMeters(
                      markerPosition.lat,
                      markerPosition.lng,
                      b.latitude,
                      b.longitude
                    ) / 1000
                  ).toFixed(2)
                ) * deviceB.costByKm
              : 0;
          break;
        case "district":
          valueA = districts[a.deviceId] || "";
          valueB = districts[b.deviceId] || "";
          break;
        case "initialBase":
          valueA = deviceA?.initialBase || "";
          valueB = deviceB?.initialBase || "";
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

    setFilteredItems(filtered);
  }, [
    searchValue,
    devicesInRadius,
    newAllDevices,
    columnFilters,
    districts,
    markerPosition,
    sortColumn,
    sortOrder,
  ]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "deviceId"}
                direction={sortColumn === "deviceId" ? sortOrder : "asc"}
                onClick={() => handleSort("deviceId")}
              >
                Device ID
              </TableSortLabel>
            </TableCell>
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
                ETA
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortColumn === "cost"}
                direction={sortColumn === "cost" ? sortOrder : "asc"}
                onClick={() => handleSort("cost")}
              >
                Cost
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
            <TableCell>Rimac ETA</TableCell>
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
                placeholder="Search"
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
                placeholder="Search"
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
              <TextField
                size="small"
                variant="standard"
                placeholder="Search"
                value={columnFilters.distance}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    distance: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Search"
                value={columnFilters.eta}
                onChange={(e) =>
                  setColumnFilters((prev) => ({ ...prev, eta: e.target.value }))
                }
              />
            </TableCell>
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Search"
                value={columnFilters.cost}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    cost: e.target.value,
                  }))
                }
              />
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
            .map((pos) => {
              const device = newAllDevices.find((d) => d.id === pos.deviceId);
              const distance = markerPosition
                ? calculateDistance(
                    markerPosition.lat,
                    markerPosition.lng,
                    pos.latitude,
                    pos.longitude
                  )
                : "N/A";
              const rimacEta = dayjs().add(30, "minute").format("HH:mm");
              let calculatedCost =
                distance !== "N/A" ? distance * device?.costByKm : 0;

              return (
                <TableRow
                  key={pos.deviceId}
                  hover
                  onClick={(e) => handleRowClick(e, pos.deviceId)}
                  sx={{
                    cursor: "pointer",
                    backgroundColor: selectedDeviceIds?.includes(pos.deviceId)
                      ? "rgba(25, 118, 210, 0.1)"
                      : "inherit",
                  }}
                >
                  <TableCell>{pos.deviceId}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleZoomToDevice(pos);
                      }}
                    >
                      <RoomIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    {dayjs(pos.fixTime).format("YYYY-MM-DD HH:mm:ss")}
                  </TableCell>
                  <TableCell
                    sx={{ color: (pos.speed ?? 0) > 5 ? "green" : "red" }}
                  >
                    {(pos.speed ?? 0) > 5 ? "Moving" : "Stop"}
                  </TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>{device?.name}</TableCell>
                  <TableCell>
                    {device.services?.map((service, index) => (
                      <Chip
                        key={index}
                        label={service.serviceName}
                        style={{ marginRight: 8, marginBottom: 8 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>{distance}</TableCell>
                  <TableCell>
                    {etaMap[pos.deviceId] !== undefined
                      ? etaMap[pos.deviceId] !== null
                        ? `${etaMap[pos.deviceId]} min`
                        : "N/A"
                      : "Loading..."}
                  </TableCell>
                  <TableCell>
                    {calculatedCost === 0 ? "Not Set" : `${calculatedCost} $`}
                  </TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>
                    {districts[pos.deviceId] ?? <CircularProgress size={15} />}
                  </TableCell>
                  <TableCell>
                    {device.initialBase ? device.initialBase : "N/A"}
                  </TableCell>
                  <TableCell>{rimacEta}</TableCell>
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
        onRowsPerPageChange={(e) =>
          setRowsPerPage(parseInt(e.target.value, 10))
        }
      />
    </Box>
  );
};

export default DispatchResultTable;
