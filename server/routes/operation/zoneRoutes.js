import express from 'express';
import * as zoneController from '../../controllers/operation/zoneController.js';  // Import the zone controller

const router = express.Router();

// Route to create a new zone
router.post('/zones', zoneController.createZone);

// Route to update an existing zone
router.put('/zones/:id', zoneController.updateZone);

// Route to get all zones
router.get('/zones', zoneController.getAllZones);

// Route to get a single zone by ID
router.get('/zones/:id', zoneController.getZoneById);

// Route to delete a zone
router.delete('/zones/:id', zoneController.deleteZone);

export default router;
