import express from "express";
import {
  addReport,
  customCalcReport,
  deleteReport,
  generateCalcReport,
  generateCalcReportPaged,
  getAllReports,
  getCronReports,
  getReport,
  getReportByCreatedBy,
  getUserCronReports,
  updateReport,
} from "../controllers/reports.js";

const router = express.Router();

router.get("/reports", getAllReports);

router.get("/report/:id", getReport);

router.post("/c-report/calcs/:calcId/user/:traccarId", generateCalcReport);
router.post("/c-report-paged/calcs/:calcId/user/:traccarId", generateCalcReportPaged);

router.get("/custom/calc/device/report/:calcId", customCalcReport);

router.get("/reports/createdby/:createdBy", getReportByCreatedBy);

router.post("/report", addReport);

router.put("/report/:id", updateReport);

router.delete("/report/:id", deleteReport);

// CRON LOGS REPORTS
router.get("/cron/reports", getCronReports);
router.get("/cron/reports/user/:userId", getUserCronReports);
export default router;
