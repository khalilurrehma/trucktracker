import React, { useState, useEffect } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import EditIcon from "@mui/icons-material/Edit";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TablePagination,
  Button,
  CircularProgress,
  Typography,
  Box,
  Paper,
  useTheme,
} from "@mui/material";
import { deleteDriverById, getDrivers, getDriversByUserId } from "../apis/api";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import SettingLoader from "./common/SettingLoader";
import { useSelector } from "react-redux";
import DriverSlotPicker from "./components/DriverSlotPicker";
import { useTranslation } from "../common/components/LocalizationProvider";
import axios from "axios";
import TableShimmer from "../common/components/TableShimmer";

const NewDriversPage = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const t = useTranslation();
  const [drivers, setDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [rows, setRows] = useState(25);
  const [sortColumn, setSortColumn] = useState("name");
  const [sortType, setSortType] = useState("asc");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [openLogsModal, setOpenLogsModal] = useState(false);
  const [logsData, setLogsData] = useState({
    vehicleDetails: [],
    loginLogs: [],
  });
  const [logsLoading, setLogsLoading] = useState(false);
  const userId = useSelector((state) => state.session.user.id);

  let lat = null;
  let long = null;
  const navigate = useNavigate();

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response =
        userId === 1 ? await getDrivers() : await getDriversByUserId(userId);

      const processedDrivers = response.map((driver) => {
        const attributes = JSON.parse(driver.attributes);
        if (driver.location && driver.location !== "NULL") {
          const location = JSON.parse(driver.location);
          lat = location.latitude;
          long = location.longitude;
        }

        return {
          id: driver.id,
          name: driver.name,
          lastName: attributes.surname || "N/A",
          grade: attributes.grade || "N/A",
          internalCode: attributes.internalCode || "N/A",
          licenceId: attributes.licenceId || "N/A",
          DNI: attributes.DNI || "N/A",
          phone: attributes.phone || "N/A",
          email: attributes.email || "N/A",
          station: attributes.station || "N/A",
          lat: lat,
          long: long,
          availability_details: driver.availability_details,
        };
      });
      setDrivers(processedDrivers);
      setFilteredDrivers(processedDrivers);
    } catch (error) {
      console.error("Error fetching drivers", error);
      toast.error("Failed to fetch drivers");
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverLogs = async (driverId) => {
    setLogsLoading(true);
    try {
      const response = await axios.get(`${url}/driver/login/logs/${driverId}`);
      const data = response.data;

      if (data.status) {
        setLogsData({
          vehicleDetails: data.message.vehicleDetails || [],
          loginLogs: data.message.loginLogs || [],
        });
      } else {
        throw new Error("Failed to fetch logs");
      }
    } catch (error) {
      console.error("Error fetching driver logs", error);
      toast.error("Failed to fetch driver logs");
      setLogsData({ vehicleDetails: [], loginLogs: [] });
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    const searchTerm = value.toLowerCase();

    const filtered = drivers.filter((driver) =>
      Object.values(driver).some((field) => {
        return String(field || "")
          .toLowerCase()
          .includes(searchTerm);
      })
    );

    setFilteredDrivers(filtered);
  };

  const handleSort = (column) => {
    const sorted = [...filteredDrivers].sort((a, b) => {
      if (sortType === "asc") {
        return a[column] < b[column] ? -1 : 1;
      }
      return a[column] > b[column] ? -1 : 1;
    });
    setFilteredDrivers(sorted);
  };

  const handleDelete = async (id) => {
    try {
      const response = await deleteDriverById(id);
      if (response.status === true) {
        toast.success(response.message);
        fetchDrivers();
      }
    } catch (error) {
      if (error.message) {
        toast.error(error.message);
      }
    }
  };

  useEffect(() => {
    handleSort(sortColumn);
  }, [sortColumn, sortType]);

  const handleRowsPerPageChange = (event) => {
    setRows(parseInt(event.target.value, 10));
    setPage(1);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  useEffect(() => {
    setTotalPages(Math.ceil(filteredDrivers.length / rows));
  }, [filteredDrivers, rows]);

  const handleViewLocation = (lat, long) => {
    navigate(`/settings/location/${lat}/${long}`);
  };

  const handleClickOpen = (driver) => {
    setSelectedDriver(driver);
    setOpenCalendar(true);
  };

  const handleClose = () => {
    setOpenCalendar(false);
    setSelectedDriver(null);
    fetchDrivers();
  };

  const handleOpenLogsModal = (driver) => {
    setSelectedDriver(driver);
    setOpenLogsModal(true);
    fetchDriverLogs(driver.id);
  };

  const handleCloseLogsModal = () => {
    setOpenLogsModal(false);
    setSelectedDriver(null);
    setLogsData({ vehicleDetails: [], loginLogs: [] });
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "configShifts"]}
    >
      <ToastContainer />
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          gap: "16px",
          padding: "10px",
          marginTop: "15px",
        }}
      >
        <FormControl sx={{ width: "15%" }} size="small">
          <InputLabel>{t("sharedRows")}</InputLabel>
          <Select value={rows} onChange={(e) => setRows(e.target.value)}>
            {[25, 50, 100, 200].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ width: "25%" }} size="small">
          <InputLabel>{t("sharedSortColumns")}</InputLabel>
          <Select
            value={sortColumn}
            onChange={(e) => setSortColumn(e.target.value)}
          >
            {[
              t("sharedName"),
              t("sharedLastName"),
              t("shareGrade"),
              t("sharedinternalCode"),
              t("sharedlicenceId"),
              "DNI",
              t("sharedPhone"),
              t("userEmail"),
              t("sharedStation"),
            ].map((column) => (
              <MenuItem key={column} value={column}>
                {column}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ width: "25%" }} size="small">
          <InputLabel>{t("sharedSortType")}</InputLabel>
          <Select
            value={sortType}
            onChange={(e) => setSortType(e.target.value)}
          >
            <MenuItem value="asc">{t("sharedAscending")}</MenuItem>
            <MenuItem value="desc">{t("sharedDescending")}</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label={t("sharedSearch")}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          size="small"
        />
      </div>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("sharedName")}</TableCell>
              <TableCell>{t("sharedLastName")}</TableCell>
              <TableCell>{t("shareGrade")}</TableCell>
              <TableCell>{t("sharedinternalCode")}</TableCell>
              <TableCell>{t("sharedlicenceId")}</TableCell>
              <TableCell>DNI</TableCell>
              <TableCell>{t("sharedPhone")}</TableCell>
              <TableCell>{t("userEmail")}</TableCell>
              <TableCell>{t("sharedStation")}</TableCell>
              <TableCell>{t("sharedAction")}</TableCell>
              <TableCell>{t("sharedCalendar")}</TableCell>
              <TableCell>App logs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableShimmer columns={12} />
            ) : filteredDrivers.length > 0 ? (
              filteredDrivers
                .slice((page - 1) * rows, page * rows)
                .map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>{driver.name}</TableCell>
                    <TableCell>{driver.lastName}</TableCell>
                    <TableCell>{driver.grade}</TableCell>
                    <TableCell>{driver.internalCode}</TableCell>
                    <TableCell>{driver.licenceId}</TableCell>
                    <TableCell>{driver.DNI}</TableCell>
                    <TableCell>{driver.phone}</TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell>{driver.station}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex" }}>
                        <IconButton
                          sx={{ cursor: "pointer" }}
                          onClick={() => {
                            navigate(`/settings/new-driver/${driver.id}`);
                          }}
                        >
                          <EditIcon />
                        </IconButton>

                        <IconButton
                          sx={{ cursor: "pointer" }}
                          onClick={() => {
                            handleDelete(driver.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleClickOpen(driver)}>
                        <CalendarMonthIcon sx={{ cursor: "pointer" }} />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenLogsModal(driver)}>
                        <InfoIcon sx={{ cursor: "pointer" }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  No Data Found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DriverSlotPicker
          open={openCalendar}
          selectedDriver={selectedDriver}
          onClose={handleClose}
        />
        <Dialog
          open={openLogsModal}
          onClose={handleCloseLogsModal}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: isDark
                ? "0 4px 24px rgba(0,0,0,0.7)"
                : "0 4px 20px rgba(0,0,0,0.1)",
              maxHeight: "90vh",
              overflowY: "auto",
              bgcolor: theme.palette.background.paper,
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: theme.palette.background.default,
              borderBottom: `1px solid ${theme.palette.divider}`,
              py: 2,
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="h5" fontWeight="600">
                App logs for {selectedDriver?.name}
              </Typography>
              <IconButton
                onClick={handleCloseLogsModal}
                sx={{
                  color: theme.palette.text.secondary,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent
            sx={{ p: 3, bgcolor: theme.palette.background.default }}
          >
            {logsLoading ? (
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                minHeight="300px"
                bgcolor={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}
                borderRadius={2}
              >
                <CircularProgress
                  size={40}
                  thickness={4}
                  sx={{ color: theme.palette.primary.main }}
                />
                <Typography variant="body2" color="text.secondary" mt={2}>
                  Loading logs...
                </Typography>
              </Box>
            ) : (
              <>
                <Typography
                  variant="h6"
                  fontWeight="500"
                  color="text.primary"
                  gutterBottom
                  sx={{ mt: 1 }}
                >
                  Vehicle Details
                </Typography>
                {logsData.vehicleDetails.length > 0 ? (
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      bgcolor: theme.palette.background.paper,
                      transition: "transform 0.2s ease-in-out",
                      "&:hover": { transform: "translateY(-2px)" },
                    }}
                  >
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                      <Typography variant="body1" color="text.secondary">
                        <strong>Device Name:</strong>{" "}
                        {logsData.vehicleDetails[0].device_name}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        <strong>Driver Name:</strong>{" "}
                        {logsData.vehicleDetails[0].driver_name}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        <strong>Odometer Reading:</strong>{" "}
                        {logsData.vehicleDetails[0].odometer_reading}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        <strong>Device Status:</strong>{" "}
                        {logsData.vehicleDetails[0].device_status}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        <strong>Created At:</strong>{" "}
                        {new Date(
                          logsData.vehicleDetails[0].created_at
                        ).toLocaleString()}
                      </Typography>
                    </Box>
                  </Paper>
                ) : (
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      mb: 3,
                      borderRadius: 2,
                      textAlign: "center",
                      bgcolor: theme.palette.background.paper,
                    }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      No vehicle details available.
                    </Typography>
                  </Paper>
                )}
                <Typography
                  variant="h6"
                  fontWeight="500"
                  color="text.primary"
                  gutterBottom
                >
                  Login Logs
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{
                    borderRadius: 2,
                    boxShadow: isDark
                      ? "0 2px 12px rgba(0,0,0,0.4)"
                      : "0 2px 10px rgba(0,0,0,0.05)",
                    bgcolor: theme.palette.background.paper,
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{ bgcolor: theme.palette.background.default }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: "600",
                            color: theme.palette.text.primary,
                          }}
                        >
                          Device accessed
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: "600",
                            color: theme.palette.text.primary,
                          }}
                        >
                          Login Time
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logsData.loginLogs.length > 0 ? (
                        logsData.loginLogs.map((log, index) => (
                          <TableRow
                            key={log.id}
                            sx={{
                              "&:hover": {
                                bgcolor: isDark
                                  ? "rgba(255,255,255,0.03)"
                                  : "#f9f9f9",
                              },
                              transition: "background-color 0.2s",
                            }}
                          >
                            <TableCell>{log.device_id}</TableCell>
                            <TableCell>
                              {new Date(log.login_time).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No login logs found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </DialogContent>
          <DialogActions
            sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}
          >
            <Button
              onClick={handleCloseLogsModal}
              variant="contained"
              sx={{
                borderRadius: 1,
                textTransform: "none",
                px: 3,
                py: 1,
                bgcolor: theme.palette.primary.main,
                "&:hover": { bgcolor: theme.palette.primary.dark },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
        <TablePagination
          component="div"
          count={filteredDrivers.length}
          page={page - 1}
          onPageChange={handlePageChange}
          rowsPerPage={rows}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[25, 50, 100, 200]}
        />
      </TableContainer>

      <CollectionFab editPath={"/settings/new-driver"} />
    </PageLayout>
  );
};

export default NewDriversPage;
