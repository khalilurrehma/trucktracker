import React, { useEffect, useState } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Box,
  Input,
  TextField,
  IconButton,
  TablePagination,
  Button,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { DatePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import LocationSearchingIcon from "@mui/icons-material/LocationSearching";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import axios from "axios";
import TableShimmer from "../common/components/TableShimmer";
import {
  convertISODate,
  formatUnixTimestamp,
} from "../settings/common/New.Helper";
import { useAppContext } from "../AppContext";
import useReportStyles from "./common/useReportStyles";
import FleetMap from "../map/FleetMap";
import { useSelector } from "react-redux";

const NewEventReportsPage = () => {
  const { mqttReportsEvents } = useAppContext();
  const userId = useSelector((state) => state.session.user.id);
  const nonAdmin = useSelector(
    (state) => state.session.user.attributes.non_admin
  );
  const classes = useReportStyles();
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const [initialRESTData, setInitialRESTData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeRow, setActiveRow] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchInitiallyFromAPI(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (mqttReportsEvents.length > 0) {
      fetchInitiallyFromAPI(userId);
    }
  }, [mqttReportsEvents]);

  const fetchInitiallyFromAPI = async (id) => {
    setLoading(true);
    try {
      const { data } = nonAdmin
        ? await axios.get(`${url}/devices/reports/events/${id}?non_admin=true`)
        : await axios.get(`${url}/devices/reports/events/${id}`);
      if (data.status) {
        setInitialRESTData(data.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = initialRESTData?.filter((msg) => {
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
      menu={<ReportsMenu />}
      breadcrumbs2={["reportTitle", "reportEvents"]}
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
              <TableCell>Alarm Type</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Event Time</TableCell>
              <TableCell>Event Created At</TableCell>
            </TableRow>
          </TableHead>
          {filteredData.length === 0 && !loading ? (
            <Typography mt={2} ml={2}>
              No Alarm Logs found
            </Typography>
          ) : !loading ? (
            <TableBody>
              {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((msg, index) => {
                  let intervalJSON;

                  try {
                    intervalJSON =
                      typeof msg.message === "string"
                        ? JSON.parse(msg.message)
                        : msg.message;

                    if (typeof intervalJSON === "string") {
                      intervalJSON = JSON.parse(intervalJSON);
                    }
                  } catch (error) {
                    intervalJSON = {};
                  }

                  const formattedBegin = formatUnixTimestamp(
                    intervalJSON?.begin
                  );
                  const formattedEnd = formatUnixTimestamp(intervalJSON?.end);
                  const formattedCreatedAt = convertISODate(msg?.createdAt);
                  const formattedEventTime = convertISODate(
                    intervalJSON?.event_time
                  );

                  return (
                    <TableRow key={`${msg.deviceId}-${msg.createdAt}-${index}`}>
                      <TableCell>
                        <IconButton
                          onClick={() =>
                            handleLocationToggle(index, {
                              latitude: intervalJSON?.latitude,
                              longitude: intervalJSON?.longitude,
                              deviceName: msg?.deviceName,
                            })
                          }
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
                      <TableCell>{msg?.eventType}</TableCell>
                      <TableCell>{formattedEnd}</TableCell>
                      <TableCell>{formattedEventTime}</TableCell>
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
          count={filteredData.length}
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

export default NewEventReportsPage;
