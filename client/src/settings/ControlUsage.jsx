import React, { useState, useEffect, useRef } from "react";
import PageLayout from "../common/components/PageLayout";
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
  Chip,
  Tooltip,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {
  allDeviceUsageControl,
  allDeviceUsageControlByUserId,
  fetchDeviceConnection,
  fetchDeviceEngineStatus,
  fetchDeviceTelemetryDout,
  postUsageControlLogAndReport,
  sendFlespiDeviceCommands,
  setReason,
} from "../apis/api";
import { ToastContainer, toast } from "react-toastify";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import OperationsMenu from "./components/OperationsMenu";
import { useAppContext } from "../AppContext";
import { graceTimeConverter } from "./common/New.Helper";

const formatTime = (date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const ControlUsage = () => {
  const [devicesShiftData, setDevicesShiftData] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState({});
  const [filters, setFilters] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [peruTime, setPeruTime] = useState(new Date());
  const navigate = useNavigate();
  const userId = useSelector((state) => state.session.user?.id);

  const { traccarUse, mqttDeviceIgnitionStatus, mqttDeviceConnected } =
    useAppContext();
  const loaderRef = useRef(null);

  useEffect(() => {
    if (page === 1 && devicesShiftData.length === 0) {
      allDeviceControl(1);
    }
  }, []);

  const allDeviceControl = async (searchTerm = "", pageParam = 1) => {
    console.log("searchTerm", searchTerm);
    try {
      setIsLoading(true);
      const response =
        userId === 1
          ? await allDeviceUsageControl(pageParam, searchTerm)
          : await allDeviceUsageControlByUserId(userId, pageParam, searchTerm);

      if (!response || response.length === 0) {
        setHasMore(false);
        return;
      }

      const formattedData = await Promise.all(
        response.map(async (item) => {
          const driverAvalibility =
            item.availability_details &&
            typeof item.availability_details === "string"
              ? JSON.parse(item.availability_details)
              : item.availability_details || [];
          const driverLocation = item?.location
            ? JSON.parse(item.location)
            : null;

          let devicesDoutStatus = 0;
          let connectionStatusValue = null;
          let engineValueStatus = null;

          const dates = [];
          const shifts = new Set();

          driverAvalibility.forEach((entry) => {
            const grace_time = entry.shift?.grace_time
              ? graceTimeConverter(entry.shift.grace_time)
              : "N/A";
            let mergeData = `${entry.shift?.shift_name} - ${grace_time}`;

            if (entry.shift?.shift_name) {
              shifts.add(mergeData);
            }
          });

          try {
            const doutStatusResponse = await fetchDeviceTelemetryDout(
              item.flespiId
            );

            const connectionStatus = await fetchDeviceConnection(item.flespiId);

            const engineStatus = await fetchDeviceEngineStatus(item.flespiId);

            engineValueStatus = engineStatus?.map(
              (item) =>
                item?.telemetry?.["engine.ignition.status"]?.value ?? false
            );

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
            status: connectionStatusValue ? connectionStatusValue[0] : false,
            doutStatus: devicesDoutStatus[0],
            engineIgnitionStatus: engineValueStatus
              ? engineValueStatus[0]
              : false,
            driverId: item?.driver_id,
            driverName: item?.driver_name,
            driverShiftName: [...shifts] || [],
            driverLocation,
            authLocation: driverLocation ? "Yes" : "NO",
            manualControl: item.manualControl || "OFF",
          };
        })
      );

      if (searchTerm) {
        setDevicesShiftData(formattedData);
      } else {
        setDevicesShiftData((prev) => [...prev, ...formattedData]);
      }

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
    shiftId,
    ignitionStatus,
    connectionStatus
  ) => {
    const isSwitchOn = event.target.checked;
    const status = doutStatus === 1 ? "900,1,0" : "900,1,1";
    let body;
    const logTimestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    let logBody;
    let ignitionAndConnection;

    if (ignitionStatus && connectionStatus) {
      ignitionAndConnection = window.confirm(
        `The vehicle is with ignition status on. Do you still want to execute?`
      );
    } else if (!ignitionStatus && connectionStatus) {
      ignitionAndConnection = window.confirm(
        `The vehicle is with ignition status off. Do you want to execute?`
      );
    } else {
      alert(`Device is not connected , commanad can not be execute`);
    }
    if (ignitionAndConnection) {
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
                  ? { ...device, doutStatus: device.doutStatus === 1 ? 0 : 1 }
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
          allDeviceControl(filters, page + 1);
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

  useEffect(() => {
    if (!mqttDeviceIgnitionStatus.length && !mqttDeviceConnected.length) return;

    setDevicesShiftData((prevDevices) => {
      return prevDevices.map((device) => {
        const ignitionUpdate = mqttDeviceIgnitionStatus.find(
          (d) => d.deviceId === device.deviceFlespiId
        );
        const connectionUpdate = mqttDeviceConnected.find(
          (d) => d.deviceId === device.deviceFlespiId
        );

        console.log(ignitionUpdate, connectionUpdate, device.deviceFlespiId);

        return {
          ...device,
          engineIgnitionStatus:
            ignitionUpdate?.connected ?? device.engineIgnitionStatus,
          status: connectionUpdate?.connected ?? device.status,
        };
      });
    });
  }, [mqttDeviceIgnitionStatus, mqttDeviceConnected]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Calculate Peru time (UTC-5)
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const peruDate = new Date(utc - 5 * 60 * 60000); // GMT-5
      setPeruTime(peruDate);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
            onChange={(e) => {
              setFilters(e.target.value), allDeviceControl(e.target.value);
            }}
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              px: 2,
              py: 1,
              borderRadius: "10px",
              backgroundColor: "#E3F2FD",
              color: "#0D47A1",
              fontWeight: 600,
              fontFamily: "monospace",
              animation: "pulse 1s infinite",
            }}
          >
            <AccessTimeIcon fontSize="small" />
            Peru Time: {formatTime(peruTime)}
          </Box>
        </Box>

        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Ignition Status</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Shift Names - Grace Time</TableCell>
                  <TableCell>Auth Location Map</TableCell>
                  <TableCell>Auth Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Manual Control</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData?.map((deviceReport, index) => {
                  return (
                    <TableRow
                      key={index}
                      sx={
                        Date.now() -
                          new Date(deviceReport.lastUpdated)?.getTime() <
                        3000
                          ? {
                              animation: "fadeEffect 2s ease-in-out",
                              "@keyframes fadeEffect": {
                                "0%": {
                                  backgroundColor: "#fff59d",
                                },
                                "100%": {
                                  backgroundColor: "transparent",
                                },
                              },
                            }
                          : {}
                      }
                    >
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
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            backgroundColor: deviceReport.engineIgnitionStatus
                              ? "green"
                              : "red",
                            marginRight: 1,
                          }}
                        ></Box>
                      </TableCell>

                      <TableCell>{deviceReport.deviceName}</TableCell>
                      <TableCell>
                        {deviceReport.driverName
                          ? deviceReport.driverName
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {deviceReport.driverShiftName &&
                        deviceReport.driverShiftName.length > 0 ? (
                          <Box
                            sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                          >
                            {deviceReport.driverShiftName.map(
                              (shift, index) => (
                                <Tooltip title="Shift name & grace time">
                                  <Chip
                                    key={index}
                                    label={shift}
                                    color="primary"
                                    variant="outlined"
                                    size="small"
                                  />
                                </Tooltip>
                              )
                            )}
                          </Box>
                        ) : (
                          "N/A"
                        )}
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
                        {deviceReport.doutStatus ? "Locked" : "Unlocked"}
                      </TableCell>
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
                                deviceReport.shiftId,
                                deviceReport.engineIgnitionStatus,
                                deviceReport.status
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
