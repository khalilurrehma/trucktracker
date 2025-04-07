import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Box,
  TablePagination,
} from "@mui/material";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  fetchCommandExecution,
  fetchDeviceShifts,
  fetchDeviceShiftsOfUser,
  modifyCommandResponse,
  removeDeviceShiftById,
} from "../apis/api";
import { TailSpin } from "react-loader-spinner";
import CachedIcon from "@mui/icons-material/Cached";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import SettingLoader from "./common/SettingLoader";
import {
  calculateTimeLeft,
  getDayRangeString,
  graceTimeConverter,
  queueTimeConvertor,
} from "./common/New.Helper";
import { useAppContext } from "../AppContext";
import { useSelector } from "react-redux";

const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US");
};

const ConfigShift = () => {
  const [filters, setFilters] = useState({
    device_name: "",
    startDate: "",
    endDate: "",
    driver_name: "",
  });
  const [devicesShifts, setDevicesShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [updateLoad, setUpdateLoad] = useState(false);
  const [timers, setTimers] = useState({});
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { mqttMessages, traccarUser } = useAppContext();
  const userId = useSelector((state) => state.session.user?.id);

  const navigate = useNavigate();

  useEffect(() => {
    getDevicesShifts();
  }, []);

  const getDevicesShifts = async () => {
    try {
      const response =
        userId === 1
          ? await fetchDeviceShifts()
          : await fetchDeviceShiftsOfUser(userId);

      setDevicesShifts(
        response?.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )
      );
    } catch (error) {
      console.error("Error fetching device shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const filteredData = devicesShifts.filter((row) => {
    const device = row.device || {};
    const driver = row.driver || {};

    return (
      (!filters.device_name ||
        device.name
          ?.toLowerCase()
          .includes(filters.device_name.toLowerCase())) &&
      (!filters.startDate ||
        row.shift?.start_time?.includes(filters.startDate)) &&
      (!filters.endDate || row.shift?.end_time?.includes(filters.endDate)) &&
      (!filters.driver_name ||
        driver.name?.toLowerCase().includes(filters.driver_name.toLowerCase()))
    );
  });

  const handleDelete = async (rowId, driverId, shiftId, deviceId) => {
    try {
      const response = await removeDeviceShiftById(
        rowId,
        driverId,
        shiftId,
        deviceId
      );
      if (response.status === true) {
        toast.success(response.message);
        getDevicesShifts();
      } else {
        toast.error("Error deleting shift");
      }
    } catch (error) {
      if (error.message) {
        toast.error(error.message);
      }
    }
  };

  const handleClick = async (deviceId, commandId) => {
    try {
      const response = await fetchCommandExecution(deviceId, commandId);

      if (response.message) {
        const res = response.message;
        setUpdateLoad(true);
        const modifiedResponse = await modifyCommandResponse(
          deviceId,
          commandId,
          res
        );
        if (modifiedResponse.status === true) {
          setUpdateLoad(false);
          getDevicesShifts();
          toast.success("Successfully loaded!");
        }
      }
    } catch (error) {
      console.error("Error clicking command:", error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimers = paginatedData.reduce((acc, item) => {
        const shiftObj = JSON.parse(item.shift);

        acc[item.id] = calculateTimeLeft(shiftObj.start_time, userTimeZone);
        return acc;
      }, {});

      setTimers(updatedTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [paginatedData, userTimeZone]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "configShifts"]}
    >
      <ToastContainer />
      <Box sx={{ margin: 2 }}>
        <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
          <TextField
            label="Device Name"
            value={filters.device_name}
            onChange={(e) => handleFilterChange("device_name", e.target.value)}
          />
          <TextField
            label="Start Date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            placeholder="MM/DD/YYYY"
          />
          <TextField
            label="End Date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            placeholder="MM/DD/YYYY"
          />
          <TextField
            label="Driver Name"
            value={filters.driver_name}
            onChange={(e) => handleFilterChange("driver_name", e.target.value)}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device Name</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Grace Time</TableCell>
                <TableCell>Resend Time</TableCell>
                <TableCell>Queue Time</TableCell>
                {/* <TableCell>Execution Status</TableCell> */}
                <TableCell>Driver Name</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <SettingLoader />
              ) : (
                paginatedData.map((row) => {
                  const device = JSON.parse(row.device) || {};
                  const shift = JSON.parse(row.shift) || {};
                  const shiftStart = JSON.parse(shift.start_day);
                  const shiftEnd = JSON.parse(shift.end_day);
                  const driver = JSON.parse(row.driver) || {};
                  const response = JSON.parse(row.response) || {};
                  const graceTime = shift.grace_time
                    ? graceTimeConverter(shift.grace_time)
                    : "N/A";
                  const resend_time = JSON.parse(row.resend_time);

                  const shiftTimer = timers[row.id] || "Calculating...";

                  return (
                    <TableRow key={row.id}>
                      <TableCell>{device.name || "N/A"}</TableCell>
                      <TableCell>{shift.start_time || "N/A"}</TableCell>
                      <TableCell>{shift.end_time || "N/A"}</TableCell>
                      <TableCell>
                        {shiftStart && shiftEnd
                          ? getDayRangeString(shiftStart, shiftEnd)
                          : "N/A"}
                      </TableCell>
                      <TableCell>{graceTime || "N/A"}</TableCell>
                      <TableCell>
                        {resend_time.formattedTime + " min" || "N/A"}
                      </TableCell>
                      <TableCell>{shiftTimer}</TableCell>
                      {/* <TableCell>
                        {response.executed ? "True" : "False"}
                      </TableCell> */}
                      <TableCell>{driver.name || "N/A"}</TableCell>
                      <TableCell sx={{ display: "flex", gap: "8px" }}>
                        <EditIcon
                          sx={{ cursor: "pointer" }}
                          onClick={() => {
                            navigate(
                              `/settings/new-shift/${row.id}/${driver.id}`
                            );
                          }}
                        />
                        <DeleteIcon
                          sx={{ cursor: "pointer" }}
                          onClick={() => {
                            handleDelete(
                              row.id,
                              driver.id,
                              row.shiftId,
                              device.id
                            );
                          }}
                        />
                        {/* {updateLoad === true ? (
                          <TailSpin height="20" width="20" color="black" />
                        ) : (
                          <CachedIcon
                            sx={{ cursor: "pointer" }}
                            onClick={() =>
                              handleClick(device.flespiId, response.id)
                            }
                          />
                        )} */}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>
      <CollectionFab editPath="/settings/new-shift" />
    </PageLayout>
  );
};

export default ConfigShift;
