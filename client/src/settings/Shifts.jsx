import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import SettingLoader from "./common/SettingLoader";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Box,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import { deleteShift, fetchShifts, fetchShiftsByUserId } from "../apis/api";
import {
  calculateTimeLeft,
  getDayRangeString,
  graceTimeConverter,
} from "./common/New.Helper";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { handleDownloadExcel } from "./common/SettingsExcel";
import { useAppContext } from "../AppContext";
import { useTranslation } from "../common/components/LocalizationProvider";

const Shifts = () => {
  const { traccarUser } = useAppContext();
  const t = useTranslation();
  const [shifts, setShifts] = useState([]);
  const [filteredShifts, setFilteredShifts] = useState([]);
  const [isloading, setIsloading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalShiftsCount, setTotalShiftsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftNameQuery, setShiftNameQuery] = useState("");
  const [timers, setTimers] = useState({});
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const navigate = useNavigate();

  useEffect(() => {
    if (traccarUser) {
      getShifts();
    }
  }, [traccarUser]);

  const getShifts = async () => {
    try {
      setIsloading(true);
      const res = traccarUser?.superAdmin
        ? await fetchShifts()
        : await fetchShiftsByUserId(traccarUser?.id);

      if (res) {
        const sortedShifts = res.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setShifts(sortedShifts);
        setFilteredShifts(sortedShifts);
        setTotalShiftsCount(sortedShifts.length);
        setIsloading(false);
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = shifts.filter((shift) =>
      Object.values(shift).some((value) =>
        value?.toString().toLowerCase().includes(query)
      )
    );
    setFilteredShifts(filtered);
    setPage(0);
  };

  const handleShiftNameSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setShiftNameQuery(query);

    const filtered = shifts.filter((shift) =>
      shift.shift_name.toLowerCase().includes(query)
    );
    setFilteredShifts(filtered);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const paginatedData = filteredShifts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleDeleteShift = async (id) => {
    try {
      const res = await deleteShift(id);
      if (res.status === true) {
        toast.success(res.message);
        getShifts();
      }
    } catch (error) {
      toast.error(error);
    }
  };

  const handleExport = () => {
    const dataToExport = shifts.map((shift) => ({
      "Shift Name": shift.shift_name,
      "Start Time": shift.start_time,
      "End Time": shift.end_time,
      Days: shift.days || "N/A",
      "Grace Time": shift.grace_time || "N/A",
      Queue: shift.queue_status === 1 ? "True" : "False",
      "Queue TTL": shift.queue_ttl || "N/A",
      "Shift Type": shift.shift_type,
    }));

    handleDownloadExcel(dataToExport);
  };

  const handlePrint = () => {
    const printContent = document.getElementById("printableTable");
    const newWindow = window.open("", "", "width=800,height=600");
    newWindow.document.write(printContent.outerHTML);
    newWindow.document.close();
    newWindow.print();
    newWindow.close();
  };

  const convertSecondsToHours = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.round((seconds % 3600) / 60);

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    return `${hours} hrs ${remainingMinutes} min`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimers = paginatedData.reduce((acc, shift) => {
        acc[shift.id] = calculateTimeLeft(shift.start_time, userTimeZone);
        return acc;
      }, {});

      setTimers(updatedTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [paginatedData, userTimeZone]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "usageControlReport"]}
    >
      <ToastContainer />

      <Box
        sx={{
          display: "flex",
          gap: "16px",
          padding: "20px 20px",
          // maxWidth: "60%",
        }}
      >
        <TextField
          label={t("sharedSearchAllData")}
          variant="outlined"
          value={searchQuery}
          onChange={handleSearch}
          sx={{
            width: "25%",
          }}
        />
        <TextField
          label={t("sharedSearchByShiftName")}
          variant="outlined"
          value={shiftNameQuery}
          onChange={handleShiftNameSearch}
          sx={{
            width: "25%",
          }}
        />
        <Button variant="outlined" onClick={handleExport}>
          {t("sharedDownloadExcel")}
        </Button>
        <Button variant="outlined" onClick={handlePrint}>
          {t("sharedPrint")}
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Shift Name</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>End Time</TableCell>
              <TableCell>Grace Time</TableCell>
              {/* <TableCell>Queue</TableCell> */}
              <TableCell>Queue TTL</TableCell>
              {/* <TableCell>Shift Type</TableCell> */}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          {isloading ? (
            <SettingLoader />
          ) : (
            <TableBody>
              {paginatedData.map((shift, index) => {
                const grace_time = shift.grace_time
                  ? graceTimeConverter(shift.grace_time)
                  : "N/A";
                const startDay = JSON.parse(shift.start_day);
                const endDay = JSON.parse(shift.end_day);
                const totalQueueTime = `Starts in: ${convertSecondsToHours(
                  shift.queue_startsIn
                )} Ends in: ${convertSecondsToHours(shift.queue_endsIn)}`;
                const shiftTimer = timers[shift.id] || "Calculating...";

                return (
                  <TableRow key={index}>
                    <TableCell>{shift.shift_name}</TableCell>
                    <TableCell>{shift.start_time}</TableCell>
                    <TableCell>{shift.end_time}</TableCell>
                    {/* <TableCell>
                      {startDay && endDay
                        ? getDayRangeString(startDay, endDay)
                        : "N/A"}
                    </TableCell> */}
                    <TableCell>{grace_time}</TableCell>
                    {/* <TableCell>
                      {shift.queue_status === 1 ? "True" : "False"}
                    </TableCell> */}
                    <TableCell>Starts in: {shiftTimer}</TableCell>
                    {/* <TableCell>{shift.shift_type}</TableCell> */}
                    <TableCell>
                      <EditIcon
                        sx={{ cursor: "pointer" }}
                        onClick={() => {
                          navigate(`/settings/shift/${shift.id}`);
                        }}
                      />
                      <DeleteIcon
                        sx={{
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          handleDeleteShift(shift.id);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          )}
        </Table>
      </TableContainer>

      {/* Pagination with Enhanced Display */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "16px",
        }}
      >
        <Typography variant="body2" sx={{ marginLeft: "16px" }}>
          Showing {Math.min(rowsPerPage, paginatedData.length)} of{" "}
          {filteredShifts.length} results
        </Typography>
        <TablePagination
          rowsPerPageOptions={[15, 10, 25]}
          component="div"
          count={filteredShifts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>

      <CollectionFab editPath="/settings/shift" />
    </PageLayout>
  );
};

export default Shifts;
