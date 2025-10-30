import express from 'express';
import * as operationController from '../../controllers/operation/operationController.js';

const router = express.Router();

// Route for creating a new operation (POST /api/operations)
router.post('/operations', operationController.createOperation);

// Route for updating an operation (PUT /api/operations/:id)
router.put('/operations/:id', operationController.updateOperation);

// Route for getting all operations (GET /api/operations)
router.get('/operations', operationController.getAllOperations);

// Route for getting a single operation by ID (GET /api/operations/:id)
router.get('/operations/:id', operationController.getSingleOperation);

// Route for deleting an operation by ID (DELETE /api/operations/:id)
router.delete('/operations/:id', operationController.deleteOperation);

export default router;
