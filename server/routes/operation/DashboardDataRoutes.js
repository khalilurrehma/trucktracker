// routes/kpiDashboardRoutes.js
import express from "express";
import { getKPIDashboardData } from "../../controllers/operation/dashboardController.js";

const router = express.Router();

// POST /api/kpis/dashboard
router.post("/dashboard", getKPIDashboardData);

export default router;
