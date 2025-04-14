import express from "express";
import {
  deleteDriver,
  getDriver,
  getDriverAvailability,
  getDriverBehaivor,
  getDrivers,
  getDriversByUserId,
  postDriver,
  putDriver,
  saveDriverAvailability,
} from "../controllers/driver.js";

const router = express.Router();

router.post("/driver", postDriver);

router.get("/drivers", getDrivers);

router.get("/driver/:id", getDriver);

router.get("/drivers/user/:userId", getDriversByUserId);

router.get("/driver/availability/view/:id", getDriverAvailability);

router.put("/driver/:id", putDriver);

router.patch("/driver/availability/:id", saveDriverAvailability);

router.delete("/driver/:id", deleteDriver);

router.get("/driver/behaivor/status/:userId", getDriverBehaivor);

export default router;
