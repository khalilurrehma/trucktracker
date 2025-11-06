// routes/kpiDashboardRoutes.js
import express from "express";
import { getOperationStatsController } from "../../controllers/operation/dashboardController.js";

const router = express.Router();

// POST /api/kpis/dashboard
router.post("/dashboard", getOperationStatsController);

export default router;
