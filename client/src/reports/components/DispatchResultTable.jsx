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
} from "@mui/material";
import RoomIcon from "@mui/icons-material/Room";
import dayjs from "dayjs";
import {
  getDistanceFromLatLonInMeters,
  getDistrictFromCoordinates,
} from "../../settings/common/New.Helper";

const AVERAGE_SPEED_KMH = 40; // For ETA calculation

const DispatchResultTable = ({
  devicesInRadius,
  markerPosition,
  searchValue,
  newAllDevices,
  setMapCenter,
  setSelectedDeviceId,
}) => {
  const [filteredItems, setFilteredItems] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const [districts, setDistricts] = useState({});

  useEffect(() => {
    const filtered = devicesInRadius.filter((pos) => {
      const matchingDevice = newAllDevices.find((d) => d.id === pos.deviceId);
      const licensePlate =
        matchingDevice?.attributes?.["device.licensePlate"]?.toLowerCase() ??
        "";
      const advisor = matchingDevice?.attributes?.advisor?.toLowerCase() ?? "";
      return (
        licensePlate.includes(searchValue.toLowerCase()) ||
        advisor.includes(searchValue.toLowerCase())
      );
    });
    setFilteredItems(filtered);
  }, [searchValue, devicesInRadius, newAllDevices]);

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
                  <TableCell>
                    {(pos.speed ?? 0) > 5 ? "Moving" : "Stationary"}
                  </TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>
                    {device?.attributes?.["device.licensePlate"] ?? "Pending"}
                  </TableCell>
                  <TableCell>
                    {device?.attributes?.["device.type"] ?? "Unknown"}
                  </TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>{distance}</TableCell>
                  <TableCell>{eta}</TableCell>
                  <TableCell>Pending</TableCell>
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
