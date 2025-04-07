import express from "express";
import {
  addNewGeofence,
  allNewGeofences,
  updateNewGeofence,
  deleteNewGeofence,
  newGeofenceById,
  newGeofenceByUserId,
} from "../controllers/geofences.js";

const router = express.Router();

router.post("/new-geofences", addNewGeofence);
router.get("/new-geofences", allNewGeofences);
router.get("/new-geofences/:id", newGeofenceById);
router.get("/new-geofences/user/:userId", newGeofenceByUserId);
router.put("/new-geofences/:id", updateNewGeofence);
router.delete("/new-geofences/:id", deleteNewGeofence);

export default router;
