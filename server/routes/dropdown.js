import express from "express";
import { getAllDevicesDropDown } from "../controllers/dropdown.js";

const router = express.Router();

router.get("/dropdown/devices", getAllDevicesDropDown);
router.get("/dropdown/groups");

export default router;
