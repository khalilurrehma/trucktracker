import express from "express";
import {
  assignCalculator,
  deleteUserCalculator,
  deleteUserDevice,
  deleteUserGeofence,
  deleteUserGroups,
  removeDeviceCustomCalc,
  subaccountDevicePermissions,
  subaccountRemoveDevicePermissions,
  superAdminRemovePermission,
  superAdminUpdatePermission,
  unassignCalculator,
  updateDeviceCustomCalc,
  updateUserCalculator,
  updateUserDevice,
  updateUserGeofence,
  updateUserGroups,
} from "../controllers/permission.js";

const router = express.Router();

router.post(
  "/permssion/admin/device/custom/calculator/assign",
  superAdminUpdatePermission
);

router.post(
  "/permssion/admin/device/custom/calculator/remove",
  superAdminRemovePermission
);

router.post(
  "/permission/device/custom/calculator/assign/:traccarId",
  updateDeviceCustomCalc
);

router.post(
  "/permission/device/custom/calculator/remove/:traccarId",
  removeDeviceCustomCalc
);

router.post(
  "/subaccount/assign/calculator/:flespiId/:traccarId",
  assignCalculator
);
router.post(
  "/subaccount/remove/calculator/:flespiId/:traccarId",
  unassignCalculator
);

router.put(
  "/realm/:realmId/user/:realmuserId/permission/devices",
  updateUserDevice
);
router.put(
  "/realm/:realmId/user/:realmuserId/remove/permission/devices",
  deleteUserDevice
);

router.put(
  "/realm/:realmId/user/:realmuserId/permission/groups",
  updateUserGroups
);
router.put(
  "/realm/:realmId/user/:realmuserId/remove/permission/groups",
  deleteUserGroups
);

router.put(
  "/realm/:realmId/user/:realmuserId/permission/geofences",
  updateUserGeofence
);
router.put(
  "/realm/:realmId/user/:realmuserId/remove/permission/geofences",
  deleteUserGeofence
);

router.put(
  "/realm/:realmId/user/:realmuserId/permission/calculators",
  updateUserCalculator
);
router.put(
  "/realm/:realmId/user/:realmuserId/remove/permission/calculators",
  deleteUserCalculator
);

export default router;
