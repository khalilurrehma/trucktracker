import express from "express";
import {
  assignDriverToVehicle,
  deleteDriver,
  dispatchCasesForDriver,
  dispatchTodayCasesForDriver,
  driverAssociateVehicles,
  driverCaseStart,
  driverForgotPassword,
  driverLogin,
  driverLogout,
  getCompanyVehicles,
  getDriver,
  getDriverAvailability,
  getDriverBehaivor,
  getDrivers,
  getDriversByUserId,
  getDriversShiftDetails,
  getDriverStatus,
  postDriver,
  putDriver,
  saveDriverAvailability,
  unAssociateDriverVehicle,
  updateDriverStatus,
} from "../controllers/driver.js";
import { authDriver } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/driver", postDriver);

router.post(
  "/driver/vehicle/association",
  upload.any(),
  authDriver,
  assignDriverToVehicle
);

router.get("/drivers", getDrivers);

router.get("/driver/:id", getDriver);

router.get("/drivers/user/:userId", getDriversByUserId);

router.get("/drivers/shifts", getDriversShiftDetails);

router.get("/driver/availability/view/:id", getDriverAvailability);

router.get("/driver/associated/vehicles", authDriver, driverAssociateVehicles);

router.get(
  "/driver/company/vehicles/:companyId",
  authDriver,
  getCompanyVehicles
);

router.get("/driver/availability/status", authDriver, getDriverStatus);

router.get("/driver/cases/:companyId", authDriver, dispatchCasesForDriver);

router.post("/driver/start/case/:caseId", authDriver, driverCaseStart);

router.put("/driver/:id", putDriver);

router.patch("/driver/availability/:id", saveDriverAvailability);

router.patch("/driver/update/status", authDriver, updateDriverStatus);

router.delete("/driver/:id", deleteDriver);

router.delete(
  "/driver/unassociate/vehicle/:vehicleId",
  authDriver,
  unAssociateDriverVehicle
);

router.get("/driver/behaivor/status/:userId", getDriverBehaivor);

// AUTH for DRIVERs
router.post("/driver/login", driverLogin);

router.post("/driver/logout", driverLogout);

router.post("/driver/forgot-password", driverForgotPassword);

// Driver Dashboard APIs

router.get(
  "/driver/dashboard/today/cases/:companyId",
  authDriver,
  dispatchTodayCasesForDriver
);

export default router;
