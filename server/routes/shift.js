import express from "express";
import {
  getShiftById,
  getShiftByType,
  getShiftByUserId,
  getShifts,
  modifyShifts,
  newShift,
  removeShift,
} from "../controllers/shift.js";

const router = express.Router();

router.post("/new/shift", newShift);

router.get("/shifts", getShifts);

router.get("/shifts/user/:userId", getShiftByUserId);

router.get("/shift/:id", getShiftById);

router.get("/shifts/by-type", getShiftByType);

router.put("/shift/:id", modifyShifts);

router.delete("/shift/:id", removeShift);

export default router;
