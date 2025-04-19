import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import {
  LocalizationProvider,
  TimePicker,
  DatePicker,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { useNavigate, useParams } from "react-router-dom";
import { postShift, shiftById, updateShift } from "../apis/api";
import {
  adjustTimes,
  calculateIntervalTime,
  StartEndFormatTime,
} from "./common/New.Helper";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../AppContext";

const NewShifts = () => {
  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [shiftType, setShiftType] = useState("preset");
  const [graceTime, setGraceTime] = useState(null);
  const [startDay, setStartDay] = useState(null);
  const [endDay, setEndDay] = useState(null);
  const [queuettl, setQueueTTL] = useState(0);
  const [selectedQueue, setSelectedQueue] = useState("");
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
  const [intervalStartTime, setIntervalStartTime] = useState("");
  const [startEndIntervalTime, setStartEndIntervalTime] = useState("");
  const days = [
    {
      id: 1,
      name: "Monday",
    },
    {
      id: 2,
      name: "Tuesday",
    },
    {
      id: 3,
      name: "Wednesday",
    },
    {
      id: 4,
      name: "Thursday",
    },
    {
      id: 5,
      name: "Friday",
    },
    {
      id: 6,
      name: "Saturday",
    },
    {
      id: 7,
      name: "Sunday",
    },
  ];

  const navigate = useNavigate();
  const { id } = useParams();
  const { traccarUser } = useAppContext();

  useEffect(() => {
    if (startTime && endTime && graceTime) {
      calculateIntervals();
    }
  }, [startTime, endTime, graceTime]);

  useEffect(() => {
    if (id) {
      fetchShiftById(id);
    }
  }, [id]);

  const calculateIntervals = () => {
    const formattedStartTime = StartEndFormatTime(startTime);
    const formattedEndTime = StartEndFormatTime(endTime);
    const graceTimeStr =
      graceTime?.toLocaleTimeString("en-US", { hour12: true }) || "00:00:00";
    const currentTime = new Date();
    const formattedCurrentTime = StartEndFormatTime(currentTime);

    const { newStartTime, newEndTime } = adjustTimes(
      formattedStartTime.formattedTime,
      formattedEndTime.formattedTime,
      graceTimeStr
    );

    const intervalStartTimeValue = calculateIntervalTime(
      newStartTime,
      formattedCurrentTime.formattedTime
    );

    const startEndIntervalTimeValue = calculateIntervalTime(
      newEndTime,
      newStartTime
    );

    const totalQueueTime =
      intervalStartTimeValue.inSeconds + startEndIntervalTimeValue.inSeconds;

    setQueueTTL(totalQueueTime);
    setIntervalStartTime(intervalStartTimeValue);
    setStartEndIntervalTime(startEndIntervalTimeValue);
  };

  const convertTo24Hour = (time) => {
    const [hours, minutes, seconds] = time.split(/[: ]/);
    const isPM = time.toLowerCase().includes("pm");
    const adjustedHours =
      isPM && hours !== "12"
        ? +hours + 12
        : hours === "12" && !isPM
        ? 0
        : +hours;
    return `${adjustedHours.toString().padStart(2, "0")}:${minutes}:${
      seconds.split(" ")[0]
    }`;
  };

  const handleSubmit = async (id) => {
    const formattedStartTime = StartEndFormatTime(startTime);
    const formattedEndTime = StartEndFormatTime(endTime);
    const graceTimeStr =
      graceTime?.toLocaleTimeString("en-US", { hour12: true }) || "00:00:00";
    const currentTime = new Date();
    const formattedCurrentTime = StartEndFormatTime(currentTime);

    const queueStartsIn = intervalStartTime.inSeconds;
    const calculateEndsIn =
      intervalStartTime.inSeconds + startEndIntervalTime.inSeconds;
    const queueEndsIn = calculateEndsIn;

    const graceHour = graceTime?.getHours() || 0;
    const graceMinute = graceTime?.getMinutes() || 0;

    const totalGraceMinutes = graceHour * 60 + graceMinute;

    const formData = {
      shift_name: shiftName,
      start_time: formattedStartTime.formattedTime,
      end_time: formattedEndTime.formattedTime,
      shift_type: shiftType,
      grace_time: totalGraceMinutes || 0,
      userId: traccarUser?.id,
      start_day: startDay,
      end_day: endDay,
      queue_ttl: queuettl,
      queue_status: selectedQueue,
      queue_startsIn: queueStartsIn,
      queue_EndsIn: queueEndsIn,
    };

    try {
      const res = id
        ? await updateShift(id, formData)
        : await postShift(formData);
      if (res.status === true) {
        toast.success(`Shift created successfully with ID: ${res.message}`);
        setTimeout(() => {
          navigate(-1);
        }, 1000);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDayChange = (newValue, period) => {
    if (period === "start") {
      setStartDay(newValue);
    } else if (period === "end") {
      setEndDay(newValue);
    }
  };

  const fetchShiftById = async (id) => {
    try {
      const res = await shiftById(id);
      console.log(res);

      const startTime = res.start_time
        ? new Date(`1970-01-01T${convertTo24Hour(res.start_time)}`)
        : null;

      const endTime = res.end_time
        ? new Date(`1970-01-01T${convertTo24Hour(res.end_time)}`)
        : null;

      const graceTime = res.grace_time
        ? new Date(`1970-01-01T${convertTo24Hour(res.grace_time)}`)
        : null;
      const startDayObj = JSON.parse(res.start_day) || {};
      const endDayObj = JSON.parse(res.end_day) || {};

      const startDayMatch =
        days.find((day) => day.id === startDayObj.id) || null;
      const endDayMatch = days.find((day) => day.id === endDayObj.id) || null;

      setShiftName(res.shift_name);
      setStartTime(startTime);
      setEndTime(endTime);
      setGraceTime(graceTime);
      setStartDay(startDayMatch);
      setEndDay(endDayMatch);
    } catch (error) {
      console.error("Error fetching shift by ID:", error);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "usageControlReport"]}
    >
      <ToastContainer />
      <Box
        sx={{
          width: "40%",
          margin: "0 auto",
          mt: 4,
        }}
      >
        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            label="Shift Name"
            placeholder="Enter shift name"
            value={shiftName}
            onChange={(e) => setShiftName(e.target.value)}
            fullWidth
          />
        </FormControl>

        {/* <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Shift Type</InputLabel>
          <Select
            value={shiftType}
            onChange={(e) => setShiftType(e.target.value)}
          >
            <MenuItem value="preset">Preset</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Select>
        </FormControl> */}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <TimePicker
            label="Start Time"
            value={startTime}
            onChange={(newValue) => setStartTime(newValue)}
            renderInput={(params) => <TextField {...params} fullWidth />}
            ampm
          />

          <TimePicker
            label="End Time"
            value={endTime}
            onChange={(newValue) => setEndTime(newValue)}
            renderInput={(params) => (
              <TextField {...params} fullWidth sx={{ mt: 2 }} />
            )}
            ampm
          />

          <TimePicker
            label="Grace Time"
            value={graceTime}
            onChange={(newValue) => setGraceTime(newValue)}
            renderInput={(params) => (
              <TextField {...params} fullWidth sx={{ mt: 2 }} />
            )}
            ampm={false}
          />
        </LocalizationProvider>

        <Box sx={{ display: "flex", justifyContent: "space-evenly" }}>
          <Button
            variant="outlined"
            sx={{ mt: 4, maxWidth: "30%" }}
            fullWidth
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{ mt: 4, maxWidth: "30%" }}
            fullWidth
            onClick={() => handleSubmit(id)}
          >
            Submit
          </Button>
        </Box>
      </Box>
    </PageLayout>
  );
};

export default NewShifts;
