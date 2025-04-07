import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControl,
  Autocomplete,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import PageLayout from "../common/components/PageLayout";
import { StartEndFormatTime } from "./common/New.Helper";
import SettingsMenu from "./components/SettingsMenu";
import {
  fetchDeviceUCById,
  fetchShiftsById,
  getDrivers,
  getShifts,
  updateDeviceShift,
  updateUsageControlDeviceConfig,
} from "../apis/api";
import AutocompleteSearch from "./components/AutocompleteSearch";

const EditControlUsage = () => {
  const { id, prevDriverId } = useParams();
  const [deviceName, setDeviceName] = useState("");
  const [presetShifts, setPresetShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftOut, setShiftOut] = useState(null);
  const [graceTime, setGraceTime] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [hasErrors, setHasErrors] = useState(false);
  const navigate = useNavigate();
  let extractGraceTime;

  useEffect(() => {
    fetchDrivers();
    fetchShifts();
    fetchDeviceData();
  }, [id]);

  const fetchDrivers = async () => {
    try {
      const response = await getDrivers();
      const filterDriver = response.filter(
        (driver) => driver.assigned === null
      );

      setDrivers(filterDriver);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await getShifts();

      setPresetShifts(response.filter((item) => item.shift_type === "preset"));
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const fetchDeviceData = async () => {
    try {
      const response = await fetchDeviceUCById(id);

      const deviceData = response[0];
      console.log("Device Data:", deviceData);

      setDeviceName(deviceData.device_name);

      setSelectedDriver({
        id: deviceData.driverId,
        name: deviceData.driver_name,
      });

      setSelectedShift({
        id: deviceData.shiftId,
        shift_name: deviceData.shift_name,
        start_time: deviceData.start_time,
        end_time: deviceData.end_time,
      });
    } catch (error) {
      console.error("Error fetching device data:", error);
    }
  };

  const handleShiftSelector = (e) => {
    const value = e.target.value;
    const selected = presetShifts.find((s) => s.id === value);

    if (selected) {
      setSelectedShift(selected);
      extractGraceTime = selected.grace_time;
    } else {
      console.error("Selected shift not found in presetShifts:", value);
    }
  };

  const handleSave = async (deviceId) => {
    const body = {
      shiftId: selectedShift?.id,
      driverId: selectedDriver?.id,
      prevDriver: parseInt(prevDriverId),
    };

    try {
      const response = await updateUsageControlDeviceConfig(deviceId, body);
      if (response.status === true) {
        toast.success(response.message);
        navigate(-1);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error("Error updating device shift:", error);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["Settings", "EditControlUsage"]}
    >
      <ToastContainer />
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f5f5f5",
          padding: "2rem",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: "50%",
            padding: "2rem",
            borderRadius: "12px",
            backgroundColor: "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <TextField
              label="Device Name"
              value={deviceName}
              disabled
              fullWidth
            />

            <FormControl fullWidth>
              <Autocomplete
                value={selectedDriver || null}
                onChange={(e, newValue) => setSelectedDriver(newValue)}
                options={drivers}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField {...params} label="Drivers" required />
                )}
                disableClearable
              />
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>
                Preset Shifts<span className="text-red-600">*</span>
              </InputLabel>
              <Select
                value={selectedShift?.id || ""}
                onChange={handleShiftSelector}
              >
                <MenuItem value="" disabled>
                  Select Shifts
                </MenuItem>
                {presetShifts.map((shift) => (
                  <MenuItem key={shift.id} value={shift.id}>
                    {shift.shift_name} ({shift.start_time} - {shift.end_time})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box
              sx={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}
            >
              <Button
                variant="outlined"
                color="primary"
                size="large"
                onClick={() => navigate(-1)}
                sx={{ alignSelf: "flex-end", padding: "0.5rem 2rem" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => handleSave(id)}
                sx={{ alignSelf: "flex-end", padding: "0.5rem 2rem" }}
              >
                Save
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </PageLayout>
  );
};

export default EditControlUsage;

// const [startHour, startMinute] = deviceData.start_time
//   .substring(0, 5)
//   .split(":");
// const [endHour, endMinute] = deviceData.end_time
//   .substring(0, 5)
//   .split(":");
// const [graceHour, graceMinute] = deviceData.grace_time
//   .substring(0, 5)
//   .split(":");

// setShiftIn(
//   new Date(
//     currentDate.getFullYear(),
//     currentDate.getMonth(),
//     currentDate.getDate(),
//     startHour,
//     startMinute
//   )
// );
// setShiftOut(
//   new Date(
//     currentDate.getFullYear(),
//     currentDate.getMonth(),
//     currentDate.getDate(),
//     endHour,
//     endMinute
//   )
// );
// setGraceTime(
//   new Date(
//     currentDate.getFullYear(),
//     currentDate.getMonth(),
//     currentDate.getDate(),
//     graceHour,
//     graceMinute
//   )
// );
