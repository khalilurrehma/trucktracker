import express from "express";
import {
  assignDriverToVehicle,
  deleteDriver,
  driverLogin,
  driverLogout,
  getCompanyVehicles,
  getDriver,
  getDriverAvailability,
  getDriverBehaivor,
  getDrivers,
  getDriversByUserId,
  getDriversShiftDetails,
  postDriver,
  putDriver,
  saveDriverAvailability,
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

router.get(
  "/driver/company/vehicles/:companyId",
  authDriver,
  getCompanyVehicles
);

router.put("/driver/:id", putDriver);

router.patch("/driver/availability/:id", saveDriverAvailability);

router.delete("/driver/:id", deleteDriver);

router.get("/driver/behaivor/status/:userId", getDriverBehaivor);

// AUTH for DRIVERs
router.post("/driver/login", driverLogin);
router.post("/driver/logout", driverLogout);

export default router;
