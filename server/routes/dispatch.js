import express from "express";
import {
  dispatchCaseCompleteService,
  dispatchCaseReport,
  fetchAllDispatchCases,
  handleCaseAction,
  handleNewDispatchCase,
} from "../controllers/dispatch.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authDriver } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/dispatch/case", upload.any(), handleNewDispatchCase);

router.get("/dispatch/cases", fetchAllDispatchCases);

router.post("/dispatch/case/:caseId/action", authDriver, handleCaseAction);

router.post(
  "/dispatch/case/report/:caseId",
  authDriver,
  upload.array("photos", 12),
  dispatchCaseReport
);

router.put(
  "/dispatch/case/:caseId/complete/service",
  authDriver,
  dispatchCaseCompleteService
);
export default router;
