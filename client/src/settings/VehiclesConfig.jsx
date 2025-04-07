import React, { useState, useEffect } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Switch,
  Checkbox,
} from "@mui/material";
import { fetchDeviceShifts } from "../apis/api";

const VehiclesConfig = () => {
  const [devicesShiftData, setDevicesShiftData] = useState([]);
  const [switchBtn, setSwitchBtn] = useState(false);
  const [filters, setFilters] = useState({ name: "", status: "", driver: "" });

  useEffect(() => {
    devicesData();
  }, []);

  const formatTime = (time) => {
    const [hour, minute] = time.split(":");
    return `${parseInt(hour, 10)}:${minute}`;
  };

  const devicesData = async () => {
    try {
      const response = await fetchDeviceShifts();

      const formattedData = response.map((item) => {
        const device = JSON.parse(item.device);
        const driver = item.driver;
        return {
          name: device.name,
          status: device.status || "ON",
          driver: driver.name,
          shift: `${formatTime(item.start_time)} to ${formatTime(
            item.end_time
          )}`,
          graceTime: item.grace_time,
          authLocation: item.authLocation || "NO",
          manualControl: item.manualControl || "OFF",
        };
      });
      setDevicesShiftData(formattedData);
    } catch (error) {
      console.error("Error fetching vehicles data:", error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const filteredData = devicesShiftData.filter(
    (vehicle) =>
      (!filters.name ||
        vehicle.name.toLowerCase().includes(filters.name.toLowerCase())) &&
      (!filters.driver ||
        vehicle.driver.toLowerCase().includes(filters.driver.toLowerCase()))
  );

  const handleSwitchChange = (event, vehicleId) => {
    const { checked } = event.target;
    // Update the state or make an API call here
    console.log(`Switch for vehicle ID ${vehicleId} changed to:`, checked);
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "configVehicles"]}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "100%",
          padding: "1rem",
          borderRadius: "8px",
        }}
      >
        <Box sx={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <TextField
            label="Device Name"
            value={filters.name}
            onChange={(e) => handleFilterChange("name", e.target.value)}
          />
          <TextField
            label="Status"
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          />
          <TextField
            label="Driver"
            value={filters.driver}
            onChange={(e) => handleFilterChange("driver", e.target.value)}
          />
          <Button
            variant="contained"
            onClick={() => setFilters({ name: "", status: "", driver: "" })}
          >
            Clear Filters
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Shift</TableCell>
                <TableCell>Grace Time</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Auth Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Manual Control</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((vehicle, index) => (
                <TableRow key={index}>
                  <TableCell>{vehicle.name}</TableCell>
                  <TableCell>{vehicle.shift}</TableCell>
                  <TableCell>{vehicle.graceTime}</TableCell>
                  <TableCell>{vehicle.driver}</TableCell>
                  <TableCell>{vehicle.authLocation}</TableCell>
                  <TableCell>{vehicle.manualControl}</TableCell>
                  <TableCell>
                    <Switch
                      checked={vehicle.manualControl}
                      onChange={(e) => handleSwitchChange(e, switchBtn)}
                      color="primary"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </PageLayout>
  );
};

export default VehiclesConfig;
