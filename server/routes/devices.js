import express from "express";
import {
  commandExecution,
  deviceInstantCommand,
  deviceLiveLocation,
  devicesAlarmLogs,
  devicesConnectionStatus,
  devicesEngineStatus,
  devicesEvents,
  devicesIgnitionStatus,
  deviceWithInRadius,
  getAllDevices,
  getAllDevicesDropDown,
  getDeviceDoutState,
  getDevices_DevicesTypes,
  getDevicesTypes,
  handleDeviceStatus,
  updateDeviceShift,
  // manualDeviceStatusControl,
} from "../controllers/device.js";
import {
  addNewDevice,
  allNewDevices,
  deleteNewDevice,
  devicesNotifications,
  extractDeviceIMEIS,
  newDeviceById,
  newDeviceByUserId,
  updateNewDevice,
} from "../controllers/devices.js";
import { checkDeviceLimit } from "../middlewares/limit.middleware.js";

const router = express.Router();

router.get("/devices", getAllDevices);
router.get("/dropdown/devices", getAllDevicesDropDown);
router.get("/devices/flespi-device-type", getDevicesTypes);
router.get("/devices/device-type/:id", getDevices_DevicesTypes);
router.get("/devices/telemetry/dout/:deviceId", getDeviceDoutState);
router.get("/devices/connection/status/:deviceId", devicesConnectionStatus);
router.get("/devices/engine/ignition/status/:deviceId", devicesEngineStatus);
router.get("/v2/devices/din/status/:deviceId", devicesIgnitionStatus);
router.get("/devices/flespi/realtime/location/:deviceId", deviceLiveLocation);
router.get("/devices/alarm/logs/:userId", devicesAlarmLogs);
router.get("/devices/reports/events/:userId", devicesEvents);
router.get("/traccar/db/all/devices");

router.get(
  "/devices/:deviceId/command/:commandId/confirm/execution",
  commandExecution
);

// ------------------------------------------------------------------------------------------

router.post(
  "/devices/status/command-queue/device/:deviceId",
  handleDeviceStatus
);
router.post("/devices/status/command/device/:deviceId", deviceInstantCommand);
router.post("/devices/distance/radius/geofence-check", deviceWithInRadius);
// router.post(
//   "/devices/status/manual/command/device/:deviceId",
//   manualDeviceStatusControl
// );
// NEW DEVICES ROUTE

router.post(
  "/new-devices",
  //  checkDeviceLimit
  addNewDevice
);

router.get("/new-devices", allNewDevices);
router.get("/new-devices/:id", newDeviceById);
router.get("/new-devices/user/:userId", newDeviceByUserId);
router.put("/new-devices/:id", updateNewDevice);
router.delete("/new-devices/:id", deleteNewDevice);

router.post("/extract-imeis", extractDeviceIMEIS);
router.post("/devices-by-imeis");

// ------------------------------------------------------------------------------------------ DEVICES Notifications

router.get("/devices/notifications", devicesNotifications);

export default router;
