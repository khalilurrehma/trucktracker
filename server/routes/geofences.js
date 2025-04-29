import express from "express";
import {
  addNewGeofence,
  allNewGeofences,
  updateNewGeofence,
  deleteNewGeofence,
  newGeofenceById,
  newGeofenceByUserId,
  postGeofenceType,
  getGeofencesTypes,
  getGeofencesTypesByUserId,
  getGeofenceTypeById,
  updateGeofenceType,
  deleteGeofenceType,
} from "../controllers/geofences.js";

const router = express.Router();

router.post("/new-geofences", addNewGeofence);
router.get("/new-geofences", allNewGeofences);
router.get("/new-geofences/:id", newGeofenceById);
router.get("/new-geofences/user/:userId", newGeofenceByUserId);
router.put("/new-geofences/:id", updateNewGeofence);
router.delete("/new-geofences/:id", deleteNewGeofence);

router.post("/geofence/geofence-type", postGeofenceType);
router.get("/geofence/geofences-types", getGeofencesTypes);
router.get("/geofence/geofences-types/:id", getGeofencesTypesByUserId);
router.get("/geofence/geofence-type/:id", getGeofenceTypeById);
router.put("/geofence/geofence-type/:id", updateGeofenceType);
router.delete("/geofence/geofence-type/:id", deleteGeofenceType);

export default router;
