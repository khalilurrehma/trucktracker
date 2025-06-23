import React, { useEffect, useState, useCallback } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Box,
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
import { useTranslation } from "../common/components/LocalizationProvider";

const NewEventReportsPage = () => {
  const { mqttReportsEvents } = useAppContext();
  const t = useTranslation();
  const userId = useSelector((state) => state.session.user.id);
  const nonAdmin = useSelector(
    (state) => state.session.user.attributes.non_admin
  );
  const classes = useReportStyles();
  const baseUrl = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  const [initialRESTData, setInitialRESTData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeRow, setActiveRow] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFromAPI = useCallback(
    async (
      id,
      currentPage = 0,
      rows = rowsPerPage,
      search = searchQuery,
      date = selectedDate
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage + 1,
          limit: rows,
          ...(search && { search }),
          ...(date && { date: date.toISOString().split("T")[0] }),
          ...(nonAdmin && { non_admin: true }),
        });

        const { data } = await axios.get(
          `${baseUrl}/devices/reports/events/${id}?${params.toString()}`
        );

        if (data.status) {
          setInitialRESTData(data.message.data || []);
          setTotalCount(data.message.total || 0);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, nonAdmin]
  );

  useEffect(() => {
    if (userId) {
      fetchFromAPI(userId, page, rowsPerPage, searchQuery, selectedDate);
    }
  }, [userId, page, rowsPerPage, searchQuery, selectedDate, fetchFromAPI]);

  useEffect(() => {
    if (mqttReportsEvents.length > 0 && userId) {
      setPage(0);
      fetchFromAPI(userId, 0, rowsPerPage, searchQuery, selectedDate);
    }
  }, [
    mqttReportsEvents,
    userId,
    rowsPerPage,
    searchQuery,
    selectedDate,
    fetchFromAPI,
  ]);

  const handleLocationToggle = (index, location) => {
    if (activeRow === index) {
      setActiveRow(null);
      setSelectedLocation(null);
    } else {
      setActiveRow(index);
      setSelectedLocation(location);
    }
  };

  const handleSearchChange = (e) => {
    const newSearch = e.target.value;
    setSearchQuery(newSearch);
    setPage(0);
  };

  const handleDateChange = (newValue) => {
    setSelectedDate(newValue);
    setPage(0);
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
              label={t("sharedSelectDate")}
              value={selectedDate}
              onChange={handleDateChange}
              slotProps={{ textField: { size: "small" } }}
              disableFuture
            />
          </LocalizationProvider>
          <TextField
            label={t("sharedSearch")}
            variant="outlined"
            value={searchQuery}
            onChange={handleSearchChange}
            className="mb-4"
            sx={{ width: "30%" }}
          />
          <Button
            variant="outlined"
            onClick={() => {
              setSelectedDate(null);
              setSearchQuery("");
              setPage(0);
            }}
          >
            {t("sharedClear")}
          </Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>{t("sharedBegin")}</TableCell>
              <TableCell>{t("reportDeviceID")}</TableCell>
              <TableCell>{t("reportDeviceName")}</TableCell>
              <TableCell>{t("sharedAlarmType")}</TableCell>
              <TableCell>{t("sharedEnd")}</TableCell>
              <TableCell>{t("sharedEventTime")}</TableCell>
              <TableCell>{t("sharedEventCreatedAt")}</TableCell>
            </TableRow>
          </TableHead>
          {initialRESTData.length === 0 && !loading ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography align="center" mt={2}>
                    No Alarm Logs found
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : !loading ? (
            <TableBody>
              {initialRESTData.map((msg, index) => {
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

                const formattedBegin = formatUnixTimestamp(intervalJSON?.begin);
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
          count={totalCount}
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
