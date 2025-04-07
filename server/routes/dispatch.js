import express from "express";
import {
  dispatchTask,
  getDispatchData,
  getNewDevices,
  getNewDrivers,
  getNewGroups,
} from "../controllers/dispatch.js";

const router = express.Router();

router.get("/dispatch", getDispatchData);

router.get("/new-drivers", getNewDrivers);

router.get("/new-devices", getNewDevices);

router.get("/new-groups", getNewGroups);

router.post("/dispatch/task", dispatchTask);

export default router;
