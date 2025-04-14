import React, { useState, useEffect } from "react";
import DatePicker from "react-multi-date-picker";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useSelector } from "react-redux";
import { fetchShifts, fetchShiftsByUserId } from "../../apis/api";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";

const mockShifts = ["Morning Shift", "Evening Shift", "Night Shift"];

const DriverSlotPicker = ({ open, selectedDriver, onClose }) => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [values, setValues] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [groupedDates, setGroupedDates] = useState([]);
  const [assignedShifts, setAssignedShifts] = useState([]);
  const adminId = useSelector((state) => state.session.user.id);

  useEffect(() => {
    setValues([]);
    setGroupedDates([]);
    setAssignedShifts([]);
    getShifts();
  }, [open]);

  const normalizeAvailabilityDetails = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map((entry) => ({
      dates: entry.dates,
      shift: {
        ...entry.shift,
        start_day: JSON.parse(entry.shift.start_day),
        end_day: JSON.parse(entry.shift.end_day),
      },
    }));
  };

  useEffect(() => {
    if (selectedDriver?.availability_details) {
      const normalized = normalizeAvailabilityDetails(
        JSON.parse(selectedDriver.availability_details)
      );

      const dateGroups = normalized.map((item) => item.dates);
      const shiftGroups = normalized.map((item) => item.shift.id); // store only shift IDs

      // Populate the calendar
      const parsedValues = normalized.map((entry) =>
        entry.dates.length === 1
          ? new Date(entry.dates[0])
          : entry.dates.map((d) => new Date(d))
      );

      setGroupedDates(dateGroups);
      setAssignedShifts(shiftGroups);
      setValues(parsedValues);
    }
  }, [selectedDriver]);

  const getShifts = async () => {
    try {
      const response =
        adminId === 1
          ? await fetchShifts()
          : await fetchShiftsByUserId(adminId);

      setShifts(response.filter((item) => item.shift_type === "preset"));
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const handleChange = (newDates) => {
    setValues(newDates);

    if (!newDates || newDates.length === 0) {
      setGroupedDates([]);
      setAssignedShifts([]);
      return;
    }

    const groups = newDates.map((rangeOrSingle) => {
      const group = Array.isArray(rangeOrSingle)
        ? rangeOrSingle
        : [rangeOrSingle];
      return group.map((dateObj) => {
        const year = dateObj.year;
        const month = String(dateObj.month.index + 1).padStart(2, "0");
        const day = String(dateObj.day).padStart(2, "0");
        return `${year}-${month}-${day}`;
      });
    });

    setGroupedDates(groups);
    setAssignedShifts(groups.map(() => ""));
  };

  const handleShiftChange = (index, shiftId) => {
    const newShifts = [...assignedShifts];
    newShifts[index] = shiftId;
    setAssignedShifts(newShifts);
  };

  const handleSubmit = async () => {
    const finalData = groupedDates.map((group, idx) => {
      const fullShift = shifts.find((s) => s.id === assignedShifts[idx]);
      return {
        dates: group,
        shift: fullShift,
      };
    });

    try {
      const { data } = await axios.patch(
        `${url}/driver/availability/${selectedDriver.id}`,
        finalData
      );
      if (data.status) {
        toast.success(data.message);
        setValues([]);
        setGroupedDates([]);
        setAssignedShifts([]);
        onClose();
      }
    } catch (error) {
      toast.error(error?.message || "Error saving data");
    }
  };

  const handleClear = () => {
    setValues([]);
    setGroupedDates([]);
    setAssignedShifts([]);
  };

  const handleDeleteGroup = (index) => {
    const updatedGroups = [...groupedDates];
    const updatedShifts = [...assignedShifts];

    updatedGroups.splice(index, 1);
    updatedShifts.splice(index, 1);

    const parsedValues = updatedGroups.map((group) =>
      group.length === 1 ? new Date(group[0]) : group.map((d) => new Date(d))
    );

    setGroupedDates(updatedGroups);
    setAssignedShifts(updatedShifts);
    setValues(parsedValues);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          overflow: "visible",
          minHeight: "auto",
        },
      }}
    >
      <DialogTitle>Select Date Range & Shifts</DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} py={2}>
          <Typography variant="body2" color="textSecondary" align="center">
            Select one or more date ranges and assign a shift to each
          </Typography>

          <DatePicker
            multiple
            range
            minDate={today}
            value={values}
            onChange={handleChange}
            dateSeparator=" to "
            multipleRangeSeparator=" & "
            style={{ width: "100%" }}
            containerStyle={{ width: "100%" }}
          />

          {groupedDates.map((group, idx) => (
            <Box
              key={idx}
              display="flex"
              flexDirection="column"
              gap={1}
              position="relative"
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography fontSize={14}>
                  Dates: {group.join(" to ")}
                </Typography>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDeleteGroup(idx)}
                  sx={{ minWidth: "auto", fontSize: 12 }}
                >
                  ✕
                </Button>
              </Box>

              <FormControl fullWidth>
                <InputLabel>Select Shift</InputLabel>
                <Select
                  value={assignedShifts[idx] || ""}
                  label="Select Shift"
                  onChange={(e) => handleShiftChange(idx, e.target.value)}
                >
                  {shifts?.map((shift) => (
                    <MenuItem key={shift.id} value={shift.id}>
                      {shift?.shift_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        <Button onClick={handleClear} color="secondary" variant="outlined">
          Clear
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={groupedDates.length === 0 || assignedShifts.includes("")}
        >
          Done
        </Button>
      </DialogActions>
      <ToastContainer />
    </Dialog>
  );
};

export default DriverSlotPicker;
