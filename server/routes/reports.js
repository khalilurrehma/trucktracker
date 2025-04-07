import express from "express";
import {
  addReport,
  customCalcReport,
  deleteReport,
  generateCalcReport,
  getAllReports,
  getReport,
  getReportByCreatedBy,
  updateReport,
} from "../controllers/reports.js";

const router = express.Router();

router.get("/reports", getAllReports);

router.get("/report/:id", getReport);

router.post("/c-report/calcs/:calcId/user/:traccarId", generateCalcReport);

router.get("/custom/calc/device/report/:calcId", customCalcReport);

router.get("/reports/createdby/:createdBy", getReportByCreatedBy);

router.post("/report", addReport);

router.put("/report/:id", updateReport);

router.delete("/report/:id", deleteReport);

export default router;
