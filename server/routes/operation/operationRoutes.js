import express from 'express';
import * as operationController from '../../controllers/operation/operationController.js';
import * as operationLayersController from '../../controllers/operation/operationLayersController.js';
import { authWebToken } from '../../middlewares/webAuth.middleware.js';

const router = express.Router();

// Route for creating a new operation (POST /api/operations)
router.post('/operations', authWebToken, operationController.createOperation);

// Route for updating an operation (PUT /api/operations/:id)
router.put('/operations/:id', authWebToken, operationController.updateOperation);

// Route for getting all operations (GET /api/operations)
router.get('/operations', authWebToken, operationController.getAllOperations);

// Route for getting a single operation by ID (GET /api/operations/:id)
router.get('/operations/:id', authWebToken, operationController.getSingleOperation);
// Route for getting calculator IDs by operation (GET /api/operations/:id/calcs)
router.get('/operations/:id/calcs', authWebToken, operationController.getOperationCalculatorIds);

// Operation layers
router.get('/operations/:id/layers', authWebToken, operationLayersController.listOperationLayers);
router.post('/operations/:id/layers', authWebToken, operationLayersController.createLayer);
router.put('/operations/:id/layers/:layerId', authWebToken, operationLayersController.updateLayer);
router.delete('/operations/:id/layers/:layerId', authWebToken, operationLayersController.removeLayer);

// Route for deleting an operation by ID (DELETE /api/operations/:id)
router.delete('/operations/:id', authWebToken, operationController.deleteOperation);

export default router;
