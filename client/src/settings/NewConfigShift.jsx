import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Input,
  Autocomplete,
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
  CircularProgress,
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { toast, ToastContainer } from "react-toastify";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import {
  fetchDeviceConnection,
  fetchDeviceDin,
  fetchDeviceTelemetryDout,
  fetchShifts,
  fetchShiftsById,
  fetchShiftsByUserId,
  getDrivers,
  getDriversByUserId,
  getFlespiDevices,
  getFlespiDevicesByUserId,
  getShifts,
  saveCustomShift,
  saveDeviceShift,
  sendFlespiDeviceCommands,
  updateDeviceShift,
} from "../apis/api";
import { useNavigate, useParams } from "react-router-dom";
import {
  adjustTimes,
  calculateIntervalTime,
  getResendTimeData,
  graceTimeConverter,
  StartEndFormatTime,
} from "./common/New.Helper";
import axios from "axios";
import { useSelector } from "react-redux";
import { useAppContext } from "../AppContext";

const NewConfigShift = () => {
  let apiUrl = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;
  const [devices, setDevices] = useState([]);
  const [mergedDevices, setMergedDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [presetShifts, setPresetShifts] = useState([]);
  const [selectedCommand, setSelectedCommand] = useState("");
  const [presetShiftsFullArray, setPresetShiftsFullArray] = useState([]);
  const [customShift, setCustomShift] = useState(false);
  const [customShiftName, setCustomShiftName] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [reSendTime, setResendTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [startDay, setStartDay] = useState(null);
  const [endDay, setEndDay] = useState(null);
  const [graceTime, setGraceTime] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [commandOn, setCommandOn] = useState("");
  const [commandOff, setCommandOff] = useState("");
  const [queue_ttl, setQueue_ttl] = useState("");
  const [queues, setQueues] = useState([
    {
      id: 1,
      name: "yes",
    },
    {
      id: 2,
      name: "no",
    },
  ]);
  const days = [
    { id: 1, name: "Monday" },
    { id: 2, name: "Tuesday" },
    { id: 3, name: "Wednesday" },
    { id: 4, name: "Thursday" },
    { id: 5, name: "Friday" },
    { id: 6, name: "Saturday" },
    { id: 7, name: "Sunday" },
  ];
  const [queuettl, setQueueTTL] = useState(0);
  const { id, driverId: prevDriver } = useParams();
  const { traccarUser, mqttDeviceDin } = useAppContext();
  const userId = useSelector((state) => state.session.user.id);
  const INACTIVITY_TIME = 30000;
  let inactivityTimer;

  const navigate = useNavigate();

  const isValidCommandFormat = (command) => {
    const regex = /^\d{3},\d{1},\d{1}$/;
    return regex.test(command);
  };

  const handleSubmit = async (id) => {
    if (!commandOn && !commandOff) {
      toast.error("Command is not configured for this device type!");
      return;
    }
    if (!reSendTime) {
      toast.error("Re-Send time is required!");
      return;
    }
    const formattedReSend = getResendTimeData(reSendTime);

    try {
      setIsLoading(true);

      const presetApiData = {
        device: selectedDevice,
        deviceId: selectedDevice.id,
        driver_id: selectedDriver?.id,
        selectedCommand,
        resend_time: formattedReSend,
        commandOn,
        commandOff,
        userId,
      };

      const presetApiRes = id
        ? await updateDeviceShift(id, prevDriver, presetApiData)
        : await saveDeviceShift(presetApiData);
      if (!presetApiRes.status) {
        throw new Error("Failed to save device shift!");
      }
      toast.success(presetApiRes.message);
      navigate(-1);
    } catch (error) {
      const customMessage =
        error?.response?.data?.message ||
        error.message ||
        "An unexpected error occurred!";
      toast.error(customMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayChange = (newValue, period) => {
    if (period === "start") {
      setStartDay(newValue);
    } else if (period === "end") {
      setEndDay(newValue);
    }
  };

  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      fetchDevices();
    }, INACTIVITY_TIME);
  };

  useEffect(() => {
    if (id) {
      shiftById(id);
    }
  }, [id]);

  useEffect(() => {
    fetchDevices();
    fetchDrivers();
    getShifts();
  }, []);

  useEffect(() => {
    setMergedDevices((prevMergedDevices) => {
      const updatedDevices = [...devices];

      mqttDeviceDin.forEach((mqttDevice) => {
        const index = updatedDevices.findIndex(
          (d) => d.deviceId === mqttDevice.deviceId
        );

        if (index !== -1) {
          updatedDevices[index].devicesIgnitionStatus =
            mqttDevice.devicesIgnitionStatus;
        } else if ([0, 1, 4, 5].includes(mqttDevice.devicesIgnitionStatus)) {
          updatedDevices.push(mqttDevice);
        }
      });

      return updatedDevices;
    });
  }, [devices, mqttDeviceDin]);

  useEffect(() => {
    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    resetInactivityTimer();

    return () => {
      window.removeEventListener("mousemove", resetInactivityTimer);
      window.removeEventListener("keydown", resetInactivityTimer);
      clearTimeout(inactivityTimer);
    };
  }, []);

  const shiftById = async (id) => {
    try {
      const response = await fetchShiftsById(id);
      response.map((item) => {
        setSelectedDevice(item.device);
        setSelectedDriver({ id: item.driver_id, name: item.driver_name });
        setSelectedShift({
          id: item.shiftId,
          shift_name: item.shift_name,
          start_time: item.start_time,
          end_time: item.end_time,
          grace_time: item.grace_time,
        });
        setShiftType(item.shift_type);
        setQueue_ttl(item.queue_time);
      });
    } catch (error) {
      console.error("Error fetching device shift:", error);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response =
        userId === 1
          ? await getFlespiDevices()
          : await getFlespiDevicesByUserId(userId);

      const filterAssignedDevices = response?.data?.filter(
        (device) => device.shift_assigned === 0
      );

      setDevices(filterAssignedDevices);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = traccarUser?.superAdmin
        ? await getDrivers()
        : await getDriversByUserId(userId);

      const filterDriver = response.filter(
        (driver) =>
          driver.assigned !== 1 && driver.availability_details.length > 0
      );

      setDrivers(filterDriver);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const getShifts = async () => {
    try {
      const response = traccarUser?.superAdmin
        ? await fetchShifts()
        : await fetchShiftsByUserId(userId);

      setPresetShifts(response.filter((item) => item.shift_type === "preset"));
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const handleShiftSelector = (e) => {
    const value = e.target.value;
    if (value === "custom") {
      setCustomShift(true);
      setShiftType("custom");
      setSelectedShift(null);
    } else {
      setCustomShift(false);
      setShiftType("preset");
      setSelectedShift(presetShifts.find((s) => s.id === e.target.value));
    }
  };

  const fetchActionCommand = async (typeId) => {
    const { data } = await axios.get(`${apiUrl}/action/command/${typeId}`);
    if (data.status === true) {
      const commands = data.message;
      const onCommand = commands?.find((cmd) => cmd?.actionName.includes("U"));
      const offCommand = commands?.find((cmd) => cmd?.actionName.includes("L"));

      setCommandOn(onCommand?.actionCommand);
      setCommandOff(offCommand?.actionCommand);
    }
  };

  useEffect(() => {
    if (selectedDevice) {
      fetchActionCommand(selectedDevice.device_type_id);
    }
  }, [selectedDevice]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "configShifts"]}
    >
      <div className="flex justify-center flex-col my-0 mx-[30%] mt-12 gap-6">
        <FormControl fullWidth>
          <Autocomplete
            value={selectedDevice || null}
            onChange={(e, newValue) => setSelectedDevice(newValue)}
            options={mergedDevices.filter((device) => device.id)}
            loading={loading}
            noOptionsText={loading ? "Loading devices..." : "No devices found"}
            getOptionLabel={(option) => option.name || "Unnamed Device"}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option) => (
              <li {...props} key={option.id || Math.random()}>
                {option.name || "Unnamed Device"}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Device"
                required
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            disableClearable
            disabled={loading || !!id} // ✅ Simplified condition
          />
        </FormControl>

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

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <TimePicker
            label="Re-Send time"
            value={reSendTime}
            onChange={(newValue) => {
              if (newValue) {
                newValue.setHours(0);
                setResendTime(newValue);
              }
            }}
            renderInput={(params) => <TextField {...params} />}
            ampm={false}
          />
        </LocalizationProvider>

        <FormControl fullWidth>
          <InputLabel>
            Command<span>*</span>
          </InputLabel>
          <Select
            value={selectedCommand}
            onChange={(e) => setSelectedCommand(e.target.value)}
            displayEmpty
          >
            <MenuItem value="force">Force Command</MenuItem>
            <MenuItem value="unforce">Unforce Command</MenuItem>
          </Select>
        </FormControl>
      </div>

      <div className="flex justify-center mt-6 gap-6 mb-8">
        <Button
          variant="outlined"
          sx={{ padding: "20px" }}
          onClick={() => navigate(-1)}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          sx={{ padding: "20px" }}
          onClick={() => handleSubmit(id)}
        >
          Submit
        </Button>
      </div>
      <ToastContainer />
    </PageLayout>
  );
};

export default NewConfigShift;
