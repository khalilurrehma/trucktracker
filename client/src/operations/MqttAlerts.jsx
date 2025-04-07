import React, { useState, useEffect } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  IconButton,
  TablePagination,
  Box,
  TextField,
  Button,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import { useAppContext } from "../AppContext";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import LocationSearchingIcon from "@mui/icons-material/LocationSearching";
import axios from "axios";
import {
  convertISODate,
  formatUnixTimestamp,
} from "../settings/common/New.Helper";
import TableShimmer from "../common/components/TableShimmer";
import FleetMap from "../map/FleetMap";
import { useSelector } from "react-redux";

const MqttAlertsPage = () => {
  const { mqttMessages } = useAppContext();
  const userId = useSelector((state) => state.session.user.id);
  const nonAdmin = useSelector(
    (state) => state.session.user.attributes.non_admin
  );
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [dbMessage, setDbMessage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeRow, setActiveRow] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchFromApi(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (mqttMessages.length > 0) {
      fetchFromApi(userId);
    }
  }, [mqttMessages]);

  const fetchFromApi = async (id) => {
    setLoading(true);
    try {
      const { data } = nonAdmin
        ? await axios.get(`${url}/devices/alarm/logs/${id}?non_admin=true`)
        : await axios.get(`${url}/devices/alarm/logs/${id}`);
      if (data.status === true) {
        setDbMessage(data.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = dbMessage?.filter((msg) => {
    const createdAtDate = new Date(msg?.createdAt);
    const createdAtMidnight = new Date(
      createdAtDate.getFullYear(),
      createdAtDate.getMonth(),
      createdAtDate.getDate()
    ).getTime();

    const selectedDateMidnight = selectedDate
      ? new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        ).getTime()
      : null;

    const matchesDevice =
      msg?.deviceId?.toString().includes(searchQuery) ||
      msg?.deviceName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate =
      !selectedDateMidnight || createdAtMidnight === selectedDateMidnight;

    return matchesDevice && matchesDate;
  });

  const handleLocationToggle = (index, location) => {
    if (activeRow === index) {
      setActiveRow(null);
      setSelectedLocation(null);
    } else {
      setActiveRow(index);
      setSelectedLocation(location);
    }
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Mqtt Alerts"]}
    >
      {selectedLocation && <FleetMap selectedLocation={selectedLocation} />}
      <Box p={4}>
        <Box sx={{ display: "flex", justifyContent: "start", gap: 4, mb: 5 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              slotProps={{ textField: { size: "small" } }}
              disableFuture
              renderInput={(params) => (
                <TextField {...params} size="small" sx={{ width: "30%" }} />
              )}
            />
          </LocalizationProvider>
          <TextField
            label="Search"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
            sx={{ width: "30%" }}
          />
          <Button variant="outlined" onClick={() => setSelectedDate(null)}>
            Clear Date
          </Button>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Begin</TableCell>
              <TableCell>Device ID</TableCell>
              <TableCell>Device Name</TableCell>
              <TableCell>Alarm Code</TableCell>
              <TableCell>Alarm Type</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Event Time</TableCell>
              <TableCell>Alarm Created At</TableCell>
            </TableRow>
          </TableHead>
          {filteredMessages.length === 0 ? (
            <Typography>No Alarm Logs found</Typography>
          ) : !loading ? (
            <TableBody>
              {filteredMessages
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((msg, index) => {
                  let intervalJSON = {};

                  try {
                    intervalJSON =
                      typeof msg.message === "string"
                        ? JSON.parse(msg.message)
                        : msg.message;
                  } catch (error) {
                    console.error("Invalid JSON format:", error);
                  }

                  const formattedBegin = formatUnixTimestamp(
                    intervalJSON?.begin
                  );
                  const formattedEnd = formatUnixTimestamp(intervalJSON?.end);
                  const formattedCreatedAt = convertISODate(msg?.createdAt);

                  return (
                    <TableRow key={`${msg.deviceId}-${msg.createdAt}-${index}`}>
                      <TableCell>
                        <IconButton
                          onClick={() => {
                            handleLocationToggle(index, {
                              latitude: intervalJSON.latitude,
                              longitude: intervalJSON.longitude,
                              deviceName: msg?.deviceName,
                            });
                          }}
                        >
                          {activeRow === index ? (
                            <MyLocationIcon />
                          ) : (
                            <LocationSearchingIcon />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell>{formattedBegin}</TableCell>
                      <TableCell>{msg?.deviceId}</TableCell>
                      <TableCell>{msg?.deviceName}</TableCell>
                      <TableCell>{msg?.alarmCode}</TableCell>
                      <TableCell>{msg?.alarmType}</TableCell>
                      <TableCell>{formattedEnd}</TableCell>
                      <TableCell>{intervalJSON?.event_time}</TableCell>
                      <TableCell>{formattedCreatedAt}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          ) : (
            <TableShimmer columns={8} />
          )}
        </Table>

        <TablePagination
          rowsPerPageOptions={[15, 25, 35]}
          component="div"
          count={filteredMessages.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Box>
    </PageLayout>
  );
};

export default MqttAlertsPage;
