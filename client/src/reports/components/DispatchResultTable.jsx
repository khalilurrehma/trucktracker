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
  Typography,
  IconButton,
  CircularProgress,
  Chip,
  TextField,
} from "@mui/material";
import RoomIcon from "@mui/icons-material/Room";
import dayjs from "dayjs";
import {
  getDistanceFromLatLonInMeters,
  getDistrictFromCoordinates,
} from "../../settings/common/New.Helper";

const AVERAGE_SPEED_KMH = 40;

const DispatchResultTable = ({
  devicesInRadius,
  markerPosition,
  searchValue,
  newAllDevices,
  setMapCenter,
  setSelectedDeviceId,
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
  });

  const [filteredItems, setFilteredItems] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const [districts, setDistricts] = useState({});

  const parseNumberFilter = (value) => {
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  useEffect(() => {
    if (!devicesInRadius || !newAllDevices) {
      setFilteredItems([]);
      return;
    }

    const globalSearch = (searchValue || "").toLowerCase();

    const filtered = devicesInRadius.filter((pos) => {
      const device = newAllDevices.find((d) => d.id === pos.deviceId);
      if (!device) return false;

      // Convert deviceId explicitly to string before calling toLowerCase
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

      // Calculate distance, eta, cost for filtering
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
          ? Math.ceil((distance / AVERAGE_SPEED_KMH) * 60) // minutes as number
          : null;

      const cost =
        distance !== null && device?.costByKm
          ? distance * device.costByKm
          : null;

      const district = (districts[pos.deviceId] || "").toLowerCase();

      const movementStatus = (pos.speed ?? 0) > 5 ? "moving" : "stop";

      // Global search across multiple fields
      const globalMatch =
        deviceId.includes(globalSearch) ||
        licensePlate.includes(globalSearch) ||
        advisor.includes(globalSearch) ||
        serviceNames.includes(globalSearch);

      // Column filters checks:
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

      // Last Connection filter (string includes)
      const lastConnectionMatch = columnFilters.lastConnection
        ? lastConnectionStr.includes(columnFilters.lastConnection)
        : true;

      // Movement filter ("moving" or "stop")
      const movementMatch = columnFilters.movement
        ? movementStatus === columnFilters.movement.toLowerCase()
        : true;

      // Distance filter (numeric, allow filtering with ">10", "<5", ">=8" etc)
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

      // ETA filter - numeric exact or range same logic as distance
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

      // Cost filter - numeric exact or range
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

      // District filter (string includes)
      const districtMatch = columnFilters.district
        ? district.includes(columnFilters.district.toLowerCase())
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
        districtMatch
      );
    });

    setFilteredItems(filtered);
  }, [
    searchValue,
    devicesInRadius,
    newAllDevices,
    columnFilters,
    districts,
    markerPosition,
  ]);

  const handleSort = () => {
    const sorted = [...filteredItems].sort((a, b) => {
      return sortOrder === "asc"
        ? new Date(a.fixTime) - new Date(b.fixTime)
        : new Date(b.fixTime) - new Date(a.fixTime);
    });
    setFilteredItems(sorted);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return "N/A";
    return (
      getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) / 1000
    ).toFixed(2);
  };

  const fetchDistrict = async (lat, lng, deviceId) => {
    const districtName = await getDistrictFromCoordinates(lat, lng);
    setDistricts((prev) => ({ ...prev, [deviceId]: districtName }));
  };

  useEffect(() => {
    filteredItems.forEach((pos) => {
      if (!districts[pos.deviceId]) {
        fetchDistrict(pos.latitude, pos.longitude, pos.deviceId);
      }
    });
  }, [filteredItems]);

  const handleTargetClick = (lat, lng, deviceId) => {
    setMapCenter({ lat, lng });
    setSelectedDeviceId(deviceId);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Device ID</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>
              <TableSortLabel active direction={sortOrder} onClick={handleSort}>
                Last Connection
              </TableSortLabel>
            </TableCell>
            <TableCell>Movement</TableCell>
            <TableCell>App Status</TableCell>
            <TableCell>Subprocess</TableCell>
            <TableCell>License Plate</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Advisor</TableCell>
            <TableCell>Distance (km)</TableCell>
            <TableCell>ETA</TableCell>
            <TableCell>Cost</TableCell>
            <TableCell>Zone Rate</TableCell>
            <TableCell>District</TableCell>
            <TableCell>Initial Base</TableCell>
            <TableCell>Rimac ETA</TableCell>
          </TableRow>

          <TableRow>
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Filter Device ID"
                value={columnFilters.deviceId}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    deviceId: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell /> {/* No filter for Location */}
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Filter Last Connection"
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
                placeholder="Filter Movement (Moving/Stop)"
                value={columnFilters.movement}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    movement: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell /> {/* No filter for App Status */}
            <TableCell /> {/* No filter for Subprocess */}
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Filter License Plate"
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
                placeholder="Filter Type"
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
                placeholder="Filter Advisor"
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
                placeholder="Filter Distance (km)"
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
                placeholder="Filter ETA (min)"
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
                placeholder="Filter Cost"
                value={columnFilters.cost}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    cost: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell /> {/* No filter for Zone Rate */}
            <TableCell>
              <TextField
                size="small"
                variant="standard"
                placeholder="Filter District"
                value={columnFilters.district}
                onChange={(e) =>
                  setColumnFilters((prev) => ({
                    ...prev,
                    district: e.target.value,
                  }))
                }
              />
            </TableCell>
            <TableCell /> {/* No filter for Initial Base */}
            <TableCell /> {/* No filter for Rimac ETA */}
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

              const eta =
                distance !== "N/A"
                  ? `${Math.ceil((distance / AVERAGE_SPEED_KMH) * 60)} min`
                  : "N/A";
              const rimacEta = dayjs().add(30, "minute").format("HH:mm");
              let calculatedCost =
                distance !== "N/A" ? distance * device?.costByKm : 0;

              return (
                <TableRow
                  key={pos.deviceId}
                  hover
                  onClick={() => setSelectedDeviceId(pos.deviceId)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{pos.deviceId}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTargetClick(
                          pos.latitude,
                          pos.longitude,
                          pos.deviceId
                        );
                      }}
                    >
                      <RoomIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    {dayjs(pos.fixTime).format("YYYY-MM-DD HH:mm:ss")}
                  </TableCell>
                  <TableCell
                    sx={{ color: (pos.speed ?? 0) > 5 ? "green" : "yellow" }}
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
                  <TableCell>{eta}</TableCell>
                  <TableCell>{calculatedCost}</TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>
                    {districts[pos.deviceId] ?? <CircularProgress size={15} />}
                  </TableCell>
                  <TableCell>Pending</TableCell>
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
