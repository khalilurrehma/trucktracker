import express from "express";
import {
  actionCommand,
  deleteDeviceShiftId,
  deleteUsageReport,
  generateLogAndReport,
  getAllGeneratedLogs,
  getAllGeneratedLogsByUserId,
  getAllUsageReports,
  getAllUsageReportsByUserId,
  getControlAllDevice,
  getControlDevicesByUserId,
  getDeviceShiftByDeviceId,
  getDeviceShiftById,
  getDeviceShiftByUserId,
  getDeviceShiftId,
  getUsageActionsOfUser,
  getUsageControlDeviceById,
  getUsageReportByUserId,
  modifyControlUsageDeviceConfig,
  modifyUsageControlReason,
  modifyUsageControlShift,
  postDeviceShift,
  postUsageActions,
  postUsageReport,
  putUsageReport,
  updateDeviceShiftId,
} from "../controllers/usageControl.js";

const router = express.Router();

router.post("/usage/action", postUsageActions);

router.post("/usage/report", postUsageReport);

router.get("/usage/actions/:userId", getUsageActionsOfUser);

router.get("/usage/reports/:userId", getUsageReportByUserId);

router.get("/action/command/:typeId", actionCommand);

router.put(
  "/usage/modify/command/response/:deviceId/:commandId",
  putUsageReport
);

// ----------------------------------------------------------

// Shift CRUD:
router.post("/device/shift", postDeviceShift);

router.get("/device/shifts", getDeviceShiftId);

router.get("/device/shift/:id", getDeviceShiftById);

router.get("/device/shift/user/:userId", getDeviceShiftByUserId);

router.get("/shift/by/device/:deviceId", getDeviceShiftByDeviceId);

router.put("/put/device/shift/:id/driver/:prevDriverId", updateDeviceShiftId);

router.delete("/device/shift/:id", deleteDeviceShiftId);

// Control Usage Table
router.post("/control/device/log/report", generateLogAndReport);
router.get("/control/devices", getControlAllDevice);
router.get("/control/devices/user/:userId", getControlDevicesByUserId);
router.get("/control/usage/devices/logs", getAllGeneratedLogs);
router.get(
  "/control/usage/devices/logs/user/:userId",
  getAllGeneratedLogsByUserId
);
router.get("/control/usage/devices/reports", getAllUsageReports);
router.get(
  "/control/usage/devices/reports/user/:userId",
  getAllUsageReportsByUserId
);
router.get("/control/usage/get/device/:deviceId", getUsageControlDeviceById);

router.put(
  "/control/update/shift/:shiftId/deviceId/:deviceId/driverId/:driverId",
  modifyUsageControlShift
);

router.put("/control/update/reason", modifyUsageControlReason);

router.put(
  "/control/update/device/config/:deviceId",
  modifyControlUsageDeviceConfig
);

// ----------------- DELETE --------------------

router.delete("/usage/action/:id", deleteUsageReport);

export default router;
