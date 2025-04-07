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

    const formattedStart = StartEndFormatTime(startTime);
    const formattedEnd = StartEndFormatTime(endTime);
    const formattedReSend = getResendTimeData(reSendTime);
    const formattedGrace = StartEndFormatTime(graceTime, true);
    const currentTime = new Date();
    const formattedCurrentTime = StartEndFormatTime(currentTime);

    const { newStartTime, newEndTime } = selectedShift
      ? adjustTimes(
          selectedShift?.start_time,
          selectedShift?.end_time,
          selectedShift?.grace_time
        )
      : adjustTimes(
          formattedStart.formattedTime,
          formattedEnd.formattedTime,
          formattedGrace
        );

    const currentToStartIntervalTIme = calculateIntervalTime(
      newStartTime,
      formattedCurrentTime.formattedTime
    );

    const startEndIntervalTimeValue = calculateIntervalTime(
      newEndTime,
      newStartTime
    );

    const calculateEndsIn =
      currentToStartIntervalTIme.inSeconds +
      startEndIntervalTimeValue.inSeconds;

    const customApiData = {
      shift_name: customShiftName,
      shift_type: shiftType,
      start_day: startDay,
      start_time: formattedStart?.formattedTime,
      end_day: endDay,
      end_time: formattedEnd?.formattedTime,
      grace_time: formattedGrace,
      queue_ttl: queuettl,
      queue_status: selectedQueue,
      userId,
      queue_startsIn: currentToStartIntervalTIme.inSeconds,
      queue_EndsIn: calculateEndsIn,
      // resend_time: formattedReSend,
    };

    try {
      setIsLoading(true);
      // const onResponse = await sendFlespiDeviceCommands(
      //   selectedDevice.flespiId,
      //   commandOn,
      //   currentToStartIntervalTIme.inSeconds
      // );

      // if (onResponse.status === false) {
      //   throw new Error("Flespi command execution failed!");
      // }

      if (shiftType === "custom") {
        const customApiRes = await saveCustomShift(customApiData);
        if (!customApiRes.status) {
          throw new Error("Failed to save custom shift!");
        }
        const presetApiData = {
          device: selectedDevice,
          deviceId: selectedDevice.id,
          driver_id: selectedDriver?.id,
          shiftId: customApiRes.message,
          queue: selectedQueue,
          queue_time: queuettl,
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
      }

      if (shiftType === "preset") {
        const presetApiData = {
          device: selectedDevice,
          deviceId: selectedDevice.id,
          driver_id: selectedDriver?.id,
          shiftId: selectedShift?.id,
          queue: selectedShift.queue_status,
          queue_time: selectedShift.queue_ttl,
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
      }
    } catch (error) {
      toast.error(error.message || "An unexpected error occurred!");
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

      const devicesWithDoutStatus = await Promise.all(
        filterAssignedDevices.map(async (device) => {
          try {
            let doutStatusResponse;
            if (device.flespiId) {
              doutStatusResponse = await fetchDeviceDin(device?.flespiId);
            }

            const devicesIgnitionStatus =
              doutStatusResponse[0]?.telemetry?.din?.value ?? 0;

            return {
              ...device,
              devicesIgnitionStatus,
            };
          } catch (error) {
            return {
              ...device,
              devicesIgnitionStatus: 0,
            };
          }
        })
      );

      const finalFilteredDevices = devicesWithDoutStatus.filter((device) =>
        [0, 1, 4, 5].includes(device.devicesIgnitionStatus)
      );

      setDevices(finalFilteredDevices);
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

      const filterDriver = response.filter((driver) => driver.assigned !== 1);

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
      // setGraceTime = presetShifts.find(
      //   (s) => s.id === e.target.value
      // ).grace_time;
    }
  };

  const fetchActionCommand = async (typeId) => {
    const { data } = await axios.get(`${apiUrl}/action/command/${typeId}`);
    if (data.status === true) {
      const commands = data.message;
      const onCommand = commands?.find((cmd) =>
        cmd?.actionName.toLowerCase().includes("on")
      );
      const offCommand = commands?.find((cmd) =>
        cmd?.actionName.toLowerCase().includes("off")
      );

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
                <span
                  style={{
                    width: "15px",
                    height: "15px",
                    borderRadius: "50%",
                    marginRight: "15px",
                    backgroundColor: [0, 1, 4, 5].includes(
                      option.devicesIgnitionStatus
                    )
                      ? "red"
                      : "green",
                    display: "inline-block",
                  }}
                />
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

        <FormControl fullWidth>
          <InputLabel>
            Preset Shifts<span className="text-red-600">*</span>
          </InputLabel>
          <Select
            value={selectedShift?.id || (customShift ? "custom" : "preset")}
            onChange={handleShiftSelector}
          >
            <MenuItem value="preset" disabled>
              Select Shifts
            </MenuItem>

            <MenuItem key="custom" value="custom">
              Custom
            </MenuItem>
            {presetShifts.map((shift) => (
              <MenuItem key={shift.id} value={shift.id}>
                {shift.shift_name} {shift.start_time} - {shift.end_time}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {customShift ? (
          <>
            <TextField
              label="Shift Name"
              placeholder="Name"
              value={customShiftName}
              onChange={(e) => setCustomShiftName(e.target.value)}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={(newValue) => setStartTime(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                ampm={true}
              />
            </LocalizationProvider>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="End Time"
                value={endTime}
                onChange={(newValue) => setEndTime(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                ampm={true}
              />
            </LocalizationProvider>

            <Autocomplete
              options={days}
              getOptionLabel={(option) => option.name}
              value={startDay}
              onChange={(e, newValue) => handleDayChange(newValue, "start")}
              renderInput={(params) => (
                <TextField {...params} label="Start Day" variant="outlined" />
              )}
            />

            <Autocomplete
              options={days}
              getOptionLabel={(option) => option.name}
              value={endDay}
              onChange={(e, newValue) => handleDayChange(newValue, "end")}
              renderInput={(params) => (
                <TextField {...params} label="End Day" variant="outlined" />
              )}
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="Grace Time"
                value={graceTime}
                onChange={(newValue) => setGraceTime(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                ampm={false}
              />
            </LocalizationProvider>

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

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                // marginBottom: "10px",
              }}
            >
              <FormControl sx={{ width: "45%" }}>
                <InputLabel>
                  Queue<span className="text-red-600">*</span>
                </InputLabel>
                <Select
                  value={selectedQueue || "no"}
                  onChange={(e) => setSelectedQueue(e.target.value)}
                >
                  {queues.map((queue) => (
                    <MenuItem key={queue.id} value={queue.name}>
                      {queue.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                sx={{ width: "45%" }}
                label="Queue Time"
                placeholder="ttl"
                type="number"
                disabled={selectedQueue === "yes" ? false : true}
                value={queuettl}
                onChange={(e) => setQueueTTL(e.target.value)}
              />
            </Box>
            {/* <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Command</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Ignition On - Queue</TableCell>
                    <TableCell>
                      <TextField
                        sx={{ width: "100%" }}
                        label="Enter command"
                        value={commandOn}
                        variant="outlined"
                        onChange={(e) => setCommandOn(e.target.value)}
                        disabled={true}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer> */}
          </>
        ) : selectedShift ? (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Grace Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>{selectedShift.start_time}</TableCell>
                    <TableCell>{selectedShift.end_time}</TableCell>
                    <TableCell>{selectedShift.grace_time}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="Re-Send time"
                value={reSendTime}
                onChange={(newValue) => setResendTime(newValue)}
                renderInput={(params) => <TextField {...params} />}
                ampm={false}
                views={["minutes", "seconds"]}
              />
            </LocalizationProvider>

            {/* <TableContainer sx={{ marginTop: "16px" }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Command</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Ignition On - Queue</TableCell>
                    <TableCell>
                      <TextField
                        sx={{ width: "100%" }}
                        label="Enter command"
                        value={commandOn}
                        variant="outlined"
                        onChange={(e) => setCommandOn(e.target.value)}
                        disabled={true}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer> */}
          </>
        ) : (
          ""
        )}
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
