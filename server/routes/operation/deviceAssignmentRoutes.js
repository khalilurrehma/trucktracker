// server/routes/operation/deviceAssignmentRoutes.js
import express from "express";
import {
  createAssignment,
  fetchAllAssignments,
  fetchAssignmentById,
  completeAssignment,
  removeAssignment,
  getOperationStats,
  getDevicePositions,
} from "../../controllers/operation/deviceAssignmentController.js";

const router = express.Router();

// POST /api/device-assignments
router.post("/device-assignments", createAssignment);

// GET /api/device-assignments
router.get("/device-assignments", fetchAllAssignments);
router.get("/device-positions", getDevicePositions);
// GET /api/device-assignments/:id
router.get("/device-assignments/:id", fetchAssignmentById);

// PUT /api/device-assignments/:id/complete
router.put("/device-assignments/:id/complete", completeAssignment);

// DELETE /api/device-assignments/:id
router.delete("/device-assignments", removeAssignment);
router.get("/operation-calculator/:deviceId", getOperationStats);

export default router;
