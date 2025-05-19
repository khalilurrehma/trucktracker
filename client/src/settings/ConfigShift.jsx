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
  fetchDeviceShifts,
  fetchDeviceShiftsOfUser,
  removeDeviceShiftById,
} from "../apis/api";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import SettingLoader from "./common/SettingLoader";
import { useAppContext } from "../AppContext";
import { useSelector } from "react-redux";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import axios from "axios";
import dayjs from "dayjs";
import { useTranslation } from "../common/components/LocalizationProvider";

const ConfigShift = () => {
  let url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

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
  const [extendTimes, setExtendTimes] = useState({});
  const userId = useSelector((state) => state.session.user?.id);

  const navigate = useNavigate();
  const t = useTranslation();

  useEffect(() => {
    getDevicesShifts();
  }, []);

  const getDevicesShifts = async () => {
    try {
      const response =
        userId === 1
          ? await fetchDeviceShifts()
          : await fetchDeviceShiftsOfUser(userId);

      const processedData = response?.map((row) => {
        const driver =
          typeof row.driver === "string" ? JSON.parse(row.driver) : row.driver;

        const dates = [];
        const shifts = new Set();

        if (Array.isArray(driver.shift_details)) {
          driver.shift_details.forEach((detail) => {
            if (Array.isArray(detail.dates)) {
              dates.push(...detail.dates);
            }
            if (detail.shift?.shift_name) {
              shifts.add(detail.shift.shift_name);
            }
          });
        }

        return {
          ...row,
          device: JSON.parse(row.device || "{}"),
          driver: {
            ...driver,
            combinedDates: [...new Set(dates)].join(", "),
            combinedShifts: [...shifts].join(", "),
          },
        };
      });

      setDevicesShifts(
        processedData.sort(
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
      // (!filters.startDate ||
      //   row.shift?.start_time?.includes(filters.startDate)) &&
      // (!filters.endDate || row.shift?.end_time?.includes(filters.endDate)) &&
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

  const handleExtendTimeChange = async (id, newValue) => {
    setExtendTimes((prev) => ({
      ...prev,
      [id]: newValue,
    }));

    const formattedTime = newValue.format("HH:mm");

    let body = {
      extend_time: formattedTime,
      is_extended: true,
    };

    try {
      const { data } = await axios.patch(
        `${url}/update/device/extend/shift/${id}`,
        body
      );
      if (data.status) {
        toast.success(data.message);
        getDevicesShifts();
      }
    } catch (error) {
      if (error.message) {
        toast.error(error.message);
      }
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "configShifts"]}
    >
      <ToastContainer />
      <Box sx={{ margin: 2 }}>
        <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
          <TextField
            label={t("reportDeviceName")}
            value={filters.device_name}
            onChange={(e) => handleFilterChange("device_name", e.target.value)}
          />
          <TextField
            label={t("sharedDriverName")}
            value={filters.driver_name}
            onChange={(e) => handleFilterChange("driver_name", e.target.value)}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("reportDeviceName")}</TableCell>
                <TableCell>{t("sharedDriverName")}</TableCell>
                <TableCell>{t("allottedShifts")}</TableCell>
                <TableCell>{t("allottedShiftsDate")}</TableCell>
                <TableCell>{t("resendTime")}</TableCell>
                <TableCell>{t("extendTime")}</TableCell>
                <TableCell>{t("sharedAction")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <SettingLoader />
              ) : (
                paginatedData.map((row) => {
                  const device = row.device || {};
                  const driver = row.driver || {};
                  const resend_time = JSON.parse(row.resend_time);

                  return (
                    <TableRow
                      key={row.id}
                      sx={row.is_extended ? { backgroundColor: "#cdffbc" } : {}}
                    >
                      <TableCell>{device.name || "N/A"}</TableCell>
                      <TableCell>{driver.name || "N/A"}</TableCell>
                      <TableCell>{driver.combinedShifts || "N/A"}</TableCell>
                      <TableCell>{driver.combinedDates || "N/A"}</TableCell>
                      <TableCell>
                        {resend_time?.formattedTime + " min" || "N/A"}
                      </TableCell>
                      <TableCell>
                        {!row.is_extended ? (
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <TimePicker
                              ampm={false}
                              label="Extend Time"
                              value={extendTimes[row.id] || null}
                              onChange={(newValue) => {
                                handleExtendTimeChange(row.id, newValue);
                              }}
                              slotProps={{
                                textField: {
                                  size: "small",
                                  variant: "outlined",
                                },
                              }}
                            />
                          </LocalizationProvider>
                        ) : (
                          <span>Extended - {row.extend_time}</span>
                        )}
                      </TableCell>

                      <TableCell sx={{ display: "flex", gap: "8px" }}>
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
