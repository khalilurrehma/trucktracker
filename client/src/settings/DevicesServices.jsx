import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Autocomplete,
  TextField,
  Chip,
  CircularProgress,
  Typography,
} from "@mui/material";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";

const DevicesServices = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const [services, setServices] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [assignedDevice, setAssignedDevice] = useState(null);
  const [assignedServices, setAssignedServices] = useState([]);
  const [serviceLoader, setServiceLoader] = useState(false);
  const [devicesLoader, setDevicesLoader] = useState(false);
  const [loader, setLoader] = useState(false);
  const [mode, setMode] = useState("assign");

  const fetchDevices = async () => {
    try {
      setDevicesLoader(true);
      const { data } = await axios.get(`${url}/new-devices`);
      setDevices(data.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setDevicesLoader(false);
    }
  };

  const fetchServices = async () => {
    setServiceLoader(true);
    try {
      const { data } = await axios.get(`${url}/all/device/service-types`);
      if (data.status) {
        setServices(data.message);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setServiceLoader(false);
    }
  };

  const fetchAssignedServices = async (deviceId) => {
    try {
      const { data } = await axios.get(`${url}/device/${deviceId}/services`);

      setAssignedServices(data.services);
    } catch (error) {
      console.error("Error fetching assigned services:", error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchServices();
  }, []);

  const handleAssignServices = async () => {
    if (selectedDevices.length === 0 || selectedServices.length === 0) {
      toast.warn("Please select devices and services.");
      return;
    }

    setLoader(true);
    try {
      const response = await axios.post(`${url}/services/bulk/assign`, {
        deviceIds: selectedDevices.map((device) => device.id),
        serviceIds: selectedServices.map((service) => service.id),
      });

      if (response.data.status) {
        const { skippedAssignments, newAssignments } = response.data;
        const skippedCount = skippedAssignments.length;
        const newCount = newAssignments.length;

        const skippedMessage =
          skippedCount > 0
            ? `${skippedCount} assignments were skipped because they already exist: ${skippedAssignments
                .map((assignment) => assignment.deviceName)
                .join(", ")}`
            : "";

        const newMessage =
          newCount > 0
            ? `${newCount} new device-service assignments created: ${newAssignments
                .map((assignment) => assignment.deviceName)
                .join(", ")}`
            : "";

        const message =
          skippedCount > 0 || newCount > 0
            ? skippedMessage + " " + newMessage
            : "All services assigned successfully.";

        toast.success(message);
        setSelectedDevices([]);
        setSelectedServices([]);
        setLoader(false);
      }
    } catch (error) {
      toast.error("An error occurred while assigning services.");
      setLoader(false);
    }
  };

  const handleUnassignService = async () => {
    if (!assignedDevice || assignedServices.length === 0) {
      toast.warn("Please select a device and services to unassign.");
      return;
    }

    setLoader(true);
    try {
      const response = await axios.post(`${url}/services/unassign`, {
        deviceId: assignedDevice.id,
        serviceIds: assignedServices.map((service) => service.id),
      });

      if (response.data.status) {
        toast.success("Services successfully unassigned.");
        setAssignedDevice(null);
        setAssignedServices([]);
        setLoader(false);
      }
    } catch (error) {
      toast.error("An error occurred while unassigning services.");
      setLoader(false);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Assigns Services"]}
    >
      <ToastContainer />
      <Box sx={{ display: "flex", justifyContent: "center", gap: 8, mt: 4 }}>
        <Button
          variant="outlined"
          sx={{ paddingX: 4 }}
          onClick={() => setMode("assign")}
        >
          Assign
        </Button>
        <Button
          variant="outlined"
          sx={{ paddingX: 4 }}
          onClick={() => setMode("unassign")}
        >
          Unassign
        </Button>
      </Box>

      {mode === "assign" && (
        <Box sx={{ p: 3 }}>
          <Button
            variant="text"
            color="primary"
            onClick={() => setSelectedDevices(devices)}
            sx={{ mb: 2 }}
          >
            Select All Devices
          </Button>
          <Autocomplete
            multiple
            id="devices"
            options={devices || []}
            getOptionLabel={(option) => option.name || ""}
            value={selectedDevices}
            onChange={(event, newValue) => setSelectedDevices(newValue)}
            disableCloseOnSelect
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Devices"
                variant="outlined"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  key={index}
                  label={option.name}
                  {...getTagProps({ index })}
                />
              ))
            }
            sx={{ marginBottom: 4 }}
          />

          <Button
            variant="text"
            color="primary"
            onClick={() => setSelectedServices(services)}
            sx={{ mb: 2 }}
          >
            Select All Services
          </Button>
          <Autocomplete
            multiple
            id="services"
            options={services || []}
            getOptionLabel={(option) => option.name || ""}
            value={selectedServices}
            onChange={(event, newValue) => setSelectedServices(newValue)}
            disableCloseOnSelect
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Services"
                variant="outlined"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  key={index}
                  label={option.name}
                  {...getTagProps({ index })}
                />
              ))
            }
          />

          {loader || serviceLoader || devicesLoader ? (
            <CircularProgress sx={{ mt: 3 }} />
          ) : (
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 3 }}
              onClick={handleAssignServices}
            >
              Assign Services
            </Button>
          )}
        </Box>
      )}

      {mode === "unassign" && (
        <Box sx={{ p: 3 }}>
          <Autocomplete
            id="unassign-device"
            options={devices || []}
            getOptionLabel={(option) => option.name || ""}
            value={assignedDevice}
            onChange={(event, newValue) => {
              setAssignedDevice(newValue);
              fetchAssignedServices(newValue.id);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Select Device" variant="outlined" />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                {option.name} - {option.deviceId}
              </li>
            )}
            sx={{ marginBottom: 4 }}
          />

          <Autocomplete
            multiple
            id="unassign-services"
            options={assignedServices || []}
            getOptionLabel={(option) => option.name || ""}
            value={assignedServices}
            onChange={(event, newValue) => setAssignedServices(newValue)}
            disableCloseOnSelect
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Services to Unassign"
                variant="outlined"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  key={index}
                  label={option.name}
                  {...getTagProps({ index })}
                />
              ))
            }
          />

          {loader ? (
            <CircularProgress sx={{ mt: 3 }} />
          ) : (
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 3 }}
              onClick={handleUnassignService}
            >
              Unassign Services
            </Button>
          )}
        </Box>
      )}
    </PageLayout>
  );
};

export default DevicesServices;
