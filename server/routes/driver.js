import express from "express";
import {
  deleteDriver,
  getDriver,
  getDriverBehaivor,
  getDrivers,
  getDriversByUserId,
  postDriver,
  putDriver,
} from "../controllers/driver.js";

const router = express.Router();

router.post("/driver", postDriver);

router.get("/drivers", getDrivers);

router.get("/driver/:id", getDriver);

router.get("/drivers/user/:userId", getDriversByUserId);

router.put("/driver/:id", putDriver);

router.delete("/driver/:id", deleteDriver);

router.get("/driver/behaivor/status/:userId", getDriverBehaivor);

export default router;
