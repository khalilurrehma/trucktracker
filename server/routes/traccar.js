import express from "express";
import { allDevicesLists } from "../controllers/traccar.js";

const router = express.Router();

router.get("/traccar/all/devices", allDevicesLists);

export default router;
