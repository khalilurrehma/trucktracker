import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  TextField,
  Typography,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  Button,
  FormControl,
} from "@mui/material";
import { format } from "date-fns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import SettingLoader from "./common/SettingLoader";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { useSelector } from "react-redux";
import axios from "axios";
import TableShimmer from "../common/components/TableShimmer";

const DriversShifts = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const userId = useSelector((state) => state.session.user.id);
  const [drivers, setDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedShift, setSelectedShift] = useState("");

  const fetchFromApi = async () => {
    const superAdminUrl = `${url}/drivers/shifts`;
    const companyUrl = `${url}/drivers/shifts?userId=${userId}`;
    setIsLoading(true);
    try {
      const { data } = await axios.get(
        userId === 1 ? superAdminUrl : companyUrl
      );
      if (data.status) setDrivers(data.message);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFromApi();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
    setPage(0);
  };
  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const groupedDrivers = drivers.map((driver) => {
    const availability = driver.availability_details
      ? JSON.parse(driver.availability_details)
      : [];

    const dates = [];
    const shifts = new Set();

    availability.forEach((entry) => {
      if (Array.isArray(entry.dates)) {
        dates.push(...entry.dates);
      }
      if (entry.shift?.shift_name) {
        shifts.add(entry.shift.shift_name);
      }
    });

    return {
      ...driver,
      combinedDates: [...new Set(dates)].join(", "),
      combinedShifts: [...shifts].join(", "),
    };
  });

  const allShiftsSet = new Set();
  groupedDrivers.forEach((driver) => {
    const shifts = driver.combinedShifts?.split(",").map((s) => s.trim());
    shifts?.forEach((s) => allShiftsSet.add(s));
  });
  const uniqueShifts = Array.from(allShiftsSet);

  const filteredDrivers = groupedDrivers.filter((driver) => {
    const name = driver.name?.toLowerCase() || "";
    const shift = driver.combinedShifts?.toLowerCase();
    const dates = driver.combinedDates;

    const selectedDateString = selectedDate
      ? format(new Date(selectedDate), "yyyy-MM-dd")
      : "";

    const matchesSearch =
      name.includes(searchTerm) ||
      shift.includes(searchTerm) ||
      dates.includes(searchTerm);

    const matchesDate =
      !selectedDateString || dates.includes(selectedDateString);

    const matchesShift =
      !selectedShift || shift.includes(selectedShift.toLowerCase());

    return matchesSearch && matchesDate && matchesShift;
  });

  const paginatedDrivers = filteredDrivers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "driversShifts"]}
    >
      <Box p={2}>
        <TextField
          placeholder="Search by name, date, or shift name..."
          variant="outlined"
          value={searchTerm}
          onChange={handleSearch}
          sx={{ mb: 2, width: "30%" }}
        />

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Filter by Date"
            value={selectedDate}
            onChange={(newValue) => {
              setSelectedDate(newValue);
            }}
            slotProps={{ textField: { size: "small" } }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                sx={{ width: "30%", ml: 2 }}
              />
            )}
          />
        </LocalizationProvider>

        <FormControl sx={{ width: "20%", ml: 2 }} size="small">
          <InputLabel>Filter by Shift</InputLabel>
          <Select
            value={selectedShift}
            label="Filter by Shift"
            onChange={(e) => setSelectedShift(e.target.value)}
          >
            <MenuItem value="">All Shifts</MenuItem>
            {uniqueShifts.map((shift, idx) => (
              <MenuItem key={idx} value={shift}>
                {shift}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setSearchTerm("");
            setSelectedDate(null);
            setSelectedShift("");
          }}
          sx={{ ml: 2, height: "40px" }}
        >
          Clear Filters
        </Button>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Name</strong>
                </TableCell>
                <TableCell>
                  <strong>Dates</strong>
                </TableCell>
                <TableCell>
                  <strong>Shift Name</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableShimmer columns={3} />
              ) : paginatedDrivers.length > 0 ? (
                paginatedDrivers.map((driver, index) => (
                  <TableRow key={index}>
                    <TableCell>{driver.name}</TableCell>
                    <TableCell>{driver.combinedDates}</TableCell>
                    <TableCell>{driver.combinedShifts}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "16px",
          }}
        >
          <Typography variant="body2" sx={{ marginLeft: "16px" }}>
            Showing {Math.min(rowsPerPage, filteredDrivers.length)} of{" "}
            {filteredDrivers.length} results
          </Typography>
          <TablePagination
            rowsPerPageOptions={[10, 15, 25]}
            component="div"
            count={filteredDrivers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </Box>
    </PageLayout>
  );
};

export default DriversShifts;
