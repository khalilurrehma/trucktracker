import React, { useState, useEffect } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import EditIcon from "@mui/icons-material/Edit";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteIcon from "@mui/icons-material/Delete";
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
} from "@mui/material";
import { deleteDriverById, getDrivers, getDriversByUserId } from "../apis/api";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import SettingLoader from "./common/SettingLoader";
import { useAppContext } from "../AppContext";
import { useSelector } from "react-redux";
import DriverSlotPicker from "./components/DriverSlotPicker";
import { useTranslation } from "../common/components/LocalizationProvider";

const NewDriversPage = () => {
  const { traccarUser } = useAppContext();
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
    } finally {
      setLoading(false);
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

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "configShifts"]}
    >
      <ToastContainer />
      {/* Filter Controls */}
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
            <MenuItem value="asc">{t("sharedDescending")}</MenuItem>
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
              {/* <TableCell>Location</TableCell> */}
              <TableCell>{t("sharedAction")}</TableCell>
              <TableCell>{t("sharedCalendar")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <SettingLoader />
                </TableCell>
              </TableRow>
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
                    {/* <TableCell>
                      {driver.lat && driver.long ? (
                        <Button
                          sx={{ fontSize: "12px" }}
                          onClick={() =>
                            handleViewLocation(driver.lat, driver.long)
                          }
                        >
                          View Location
                        </Button>
                      ) : (
                        <Button
                          sx={{ fontSize: "12px" }}
                          onClick={() => {
                            navigate(
                              `/settings/new-driver/${driver.id}?field=location`
                            );
                          }}
                        >
                          Add location
                        </Button>
                      )}
                    </TableCell> */}
                    <TableCell sx={{ display: "flex", gap: "8px" }}>
                      <EditIcon
                        sx={{ cursor: "pointer" }}
                        onClick={() => {
                          navigate(`/settings/new-driver/${driver.id}`);
                        }}
                      />
                      <DeleteIcon
                        sx={{ cursor: "pointer" }}
                        onClick={() => {
                          handleDelete(driver.id);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleClickOpen(driver)}>
                        <CalendarMonthIcon sx={{ cursor: "pointer" }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
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
