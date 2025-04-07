import React, { useState, useEffect, useRef } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import EditIcon from "@mui/icons-material/Edit";
import moment from "moment";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Switch,
  Checkbox,
  Select,
  MenuItem,
} from "@mui/material";
import {
  allDeviceUsageControl,
  allDeviceUsageControlByUserId,
  fetchDeviceConnection,
  fetchDeviceShifts,
  fetchDeviceTelemetryDout,
  fetchDriverById,
  fetchShiftByid,
  fetchShiftsByUserId,
  getDrivers,
  getShifts,
  modifyDeviceShift,
  modifyUsageControlShift,
  postUsageControlLogAndReport,
  sendFlespiDeviceCommands,
  setReason,
} from "../apis/api";
import { ToastContainer, toast } from "react-toastify";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { useNavigate } from "react-router-dom";
import SettingLoader from "./common/SettingLoader";
import { useSelector } from "react-redux";
import OperationsMenu from "./components/OperationsMenu";
import { useAppContext } from "../AppContext";

const ControlUsage = () => {
  const [devicesShiftData, setDevicesShiftData] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState({});
  const [filters, setFilters] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const userId = useSelector((state) => state.session.user?.id);
  const { traccarUser } = useAppContext();
  const loaderRef = useRef(null);

  useEffect(() => {
    if (page === 1 && devicesShiftData.length === 0) {
      allDeviceControl(1);
    }
  }, []);

  const allDeviceControl = async (pageParam = 1) => {
    try {
      setIsLoading(true);
      const response =
        userId === 1
          ? await allDeviceUsageControl(pageParam)
          : await allDeviceUsageControlByUserId(userId, pageParam);

      if (!response || response.length === 0) {
        setHasMore(false);
        return;
      }

      const formattedData = await Promise.all(
        response.map(async (item) => {
          const driverLocation = item?.location
            ? JSON.parse(item.location)
            : null;
          const deviceShiftResponse = item?.device_shift_response
            ? JSON.parse(item?.device_shift_response)
            : null;
          const deviceShiftResend = item?.device_shift_resend_time
            ? JSON.parse(item?.device_shift_resend_time)
            : null;

          let devicesDoutStatus = 0;
          let connectionStatusValue = null;

          try {
            const doutStatusResponse = await fetchDeviceTelemetryDout(
              item.flespiId
            );

            const connectionStatus = await fetchDeviceConnection(item.flespiId);

            connectionStatusValue = connectionStatus?.map(
              (value) => value.connected
            );

            devicesDoutStatus = doutStatusResponse?.map(
              (value) => value?.telemetry?.dout?.value ?? 0
            ) ?? [0];
          } catch (error) {
            devicesDoutStatus = [0];
          }

          return {
            deviceId: item.id,
            deviceName: item.name,
            deviceFlespiId: item?.flespiId,
            deviceIdent: item?.ident,
            deviceTypeId: item?.device_type_id,
            // status: 0,
            status: connectionStatusValue ? connectionStatusValue[0] : [false],
            doutStatus: devicesDoutStatus[0],
            // doutStatus: 1,
            driverId: item?.driver_id,
            driverName: item?.driver_name,
            driverLocation,
            shiftId: item.shift_id,
            shiftName: item.shift_name,
            graceTime: item.grace_time,
            authLocation: driverLocation ? "Yes" : "NO",
            manualControl: item.manualControl || "OFF",
            deviceShift_response: deviceShiftResponse,
            deviceShift_resentTime: deviceShiftResend,
            deviceShift_queueTime: item?.device_shift_queue_time,
          };
        })
      );

      setDevicesShiftData((prev) => [...prev, ...formattedData]);
      setPage(pageParam);
    } catch (error) {
      console.error("Error fetching vehicles data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = devicesShiftData?.filter((item) => {
    return (
      item?.deviceName?.toLowerCase().includes(filters.toLowerCase()) ||
      item?.driverName?.toLowerCase().includes(filters.toLowerCase()) ||
      item?.shiftName?.toLowerCase().includes(filters.toLowerCase())
    );
  });

  useEffect(() => {
    if (filters.trim() !== "") {
      setHasMore(false);
    } else {
      setHasMore(true);
    }
  }, [filters]);

  const handleSwitchChange = async (
    event,
    deviceId,
    flespiId,
    doutStatus,
    driverId,
    driverLocation,
    shiftId
  ) => {
    const isSwitchOn = event.target.checked;
    const status = doutStatus === 1 ? "900,1,1" : "900,1,0";
    let body;
    const logTimestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    let logBody;

    const isConfirmed = window.confirm(
      doutStatus === 1
        ? "Are you sure you want to turn on the device?"
        : "Are you sure you want to turn off the device?"
    );

    if (isConfirmed) {
      const reason = prompt("Please provide a reason for this action:");

      if (!reason || reason.trim().length < 3) {
        toast.warn("Please provide a valid reason (at least 3 characters)");
        return;
      }

      try {
        setDeviceStatus((prev) => ({ ...prev, [deviceId]: true }));

        const commandResponse = await sendFlespiDeviceCommands(
          flespiId,
          status
        );

        if (commandResponse.message) {
          toast.success(`Device status updated successfully`);
          body = {
            deviceId,
            reason,
          };

          const resReason = await setReason(body);

          if (resReason.status) {
            toast.success(resReason.message);
            logBody = {
              log_timestamp: logTimestamp,
              device_id: deviceId,
              driver_id: driverId,
              shift_id: shiftId,
              action_command: status,
              performed_by: userId,
              location: driverLocation ? "Yes" : "No",
              action_reason: reason,
              complied: commandResponse.status ? "Yes" : "No",
            };

            const log = await postUsageControlLogAndReport(logBody);
            if (log.message) {
              toast.success("Log added successfully");
            }
          } else {
            toast.error("Failed to set reason for device status update");
          }

          setDevicesShiftData((prevData) =>
            prevData.map((device) =>
              device.deviceId === deviceId
                ? { ...device, doutStatus: isSwitchOn ? 1 : 0 }
                : device
            )
          );

          setDeviceStatus((prevStatus) => ({
            ...prevStatus,
            [deviceId]: isSwitchOn ? "ON" : "OFF",
          }));
        } else {
          toast.warn("Failed to update device status");
        }
      } catch (error) {
        console.error("Error sending command:", error);
        toast.error(
          "An error occurred while updating the device status. Please try again."
        );
      } finally {
        setTimeout(() => {
          setDeviceStatus((prev) => ({ ...prev, [deviceId]: false }));
        }, 7000);
      }
    }
  };

  const openLiveLocation = (deviceId, deviceFlespiId, lat, long) => {
    navigate(
      `/settings/live-location/${deviceId}/${deviceFlespiId}/auth-location/${lat}/${long}`
    );
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoading &&
          filters.trim() === ""
        ) {
          allDeviceControl(page + 1);
        }
      },
      { threshold: 1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [loaderRef, page, hasMore, isLoading]);

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "configVehicles"]}
    >
      <ToastContainer />

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
            label="Search"
            value={filters}
            onChange={(e) => setFilters(e.target.value)}
          />
        </Box>
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell>Resend Time</TableCell>
                  <TableCell>Execution Status</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Auth Location Map</TableCell>
                  <TableCell>Auth Location</TableCell>
                  <TableCell>Manual Control</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData?.map((deviceReport, index) => {
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            backgroundColor: deviceReport.status
                              ? "green"
                              : "red",
                            marginRight: 1,
                          }}
                        ></Box>
                      </TableCell>

                      <TableCell>{deviceReport.deviceName}</TableCell>
                      <TableCell>
                        {deviceReport.shiftName
                          ? deviceReport.shiftName
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {deviceReport?.deviceShift_resentTime
                          ? deviceReport?.deviceShift_resentTime?.formattedTime
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {deviceReport?.deviceShift_response?.executed === true
                          ? "true"
                          : "false"}
                      </TableCell>
                      <TableCell>
                        {deviceReport.driverName
                          ? deviceReport.driverName
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {deviceReport.driverLocation ? (
                          <Button
                            sx={{ fontSize: "12px" }}
                            onClick={() => {
                              openLiveLocation(
                                deviceReport.deviceId,
                                deviceReport.deviceFlespiId,
                                deviceReport.driverLocation.latitude,
                                deviceReport.driverLocation.longitude
                              );
                            }}
                          >
                            View Live Location
                          </Button>
                        ) : (
                          <Button disabled>No Live Location</Button>
                        )}
                      </TableCell>

                      <TableCell>{deviceReport.authLocation}</TableCell>
                      <TableCell>
                        {deviceStatus[deviceReport.deviceId] ? (
                          <CountdownCircleTimer
                            isPlaying
                            duration={7}
                            colors={["#1A237E"]}
                            colorsTime={[7]}
                            size={25}
                            strokeWidth={4}
                          />
                        ) : (
                          <Switch
                            checked={deviceReport.doutStatus === 0}
                            disabled={
                              deviceReport.doutStatus == null ||
                              deviceReport.doutStatus == 2 ||
                              deviceReport.doutStatus == 3
                            }
                            onChange={(e) =>
                              handleSwitchChange(
                                e,
                                deviceReport.deviceId,
                                deviceReport.deviceFlespiId,
                                deviceReport.doutStatus,
                                deviceReport.driverId,
                                deviceReport.driverLocation,
                                deviceReport.shiftId
                              )
                            }
                            color="primary"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
        <div ref={loaderRef} style={{ height: "30px", textAlign: "center" }}>
          {isLoading && <p>Loading more devices...</p>}
          {!hasMore && <p>No more devices to load.</p>}
        </div>
      </Box>
    </PageLayout>
  );
};

export default ControlUsage;
