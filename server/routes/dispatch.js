import express from "express";
import {
  authorizeCaseReport,
  dispatchCaseCompleteService,
  dispatchCaseReport,
  fetchAllDispatchCases,
  getDispatchCaseReport,
  handleCaseAction,
  handleNewDispatchCase,
  notificationStatusUpdate,
  newCaseReportNotifications,
  allCaseReportsNotifications,
  processTemplate,
  rimacReport,
  adminProcessTemplate,
  dispatchCaseSearch,
  getDispatchCaseTracking,
  adminOverrideTemplate,
  subservicesLocationData,
  addNewSubservicePrice,
  fetchSearchHistory,
  fetchSearchHistoryByUserId,
  suggestedServicesApproval,
  getSuggestedServiceApprovals,
  responseSuggestedService,
  fetchAllRimacCases,
  getRimacReportById,
  towcarServiceLocationData,
  addTowCarServicePrice,
  updateTowCarServicePrice,
} from "../controllers/dispatch.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authDriver } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/dispatch/case", upload.any(), handleNewDispatchCase);

router.get("/dispatch/cases", fetchAllDispatchCases);

router.get("/dispatch/case/search", dispatchCaseSearch);

router.get("/dispatch/case/:caseId/tracking", getDispatchCaseTracking);

router.get("/dispatch/case/report/:caseId", getDispatchCaseReport);

router.get("/dispatch/process/template", processTemplate);

router.get("/dispatch/process/template/admin/:adminId", adminProcessTemplate);

router.get("/dispatch/subservices/locations", subservicesLocationData);

router.get("/dispatch/towcarservice/locations", towcarServiceLocationData);

router.get("/dispatch/search/history", fetchSearchHistory);

router.get("/dispatch/search/history/:userId", fetchSearchHistoryByUserId);

router.get(
  "/dispatch/case/:caseId/suggestedservices/approvals",
  getSuggestedServiceApprovals
);

router.get("/rimac/cases", fetchAllRimacCases);

router.get("/rimac/case/report/:id", getRimacReportById);

router.post(
  "/dispatch/case/:caseId/action/:companyId",
  authDriver,
  handleCaseAction
);

router.post(
  "/dispatch/case/report/authorize/:reportId/:driverId",
  authorizeCaseReport
);

router.post(
  "/dispatch/:companyId/case/:caseId/suggestedservice-approvals/request",
  authDriver,
  suggestedServicesApproval
);

router.post(
  "/dispatch/case/report/:caseId/:companyId",
  authDriver,
  upload.any(),
  dispatchCaseReport
);

router.post("/dispatch/process/template/override", adminOverrideTemplate);

router.post("/dispatch/rimac/report", rimacReport);

router.post("/dispatch/subservice-prices", addNewSubservicePrice);

router.post("/dispatch/towcarservice/price", addTowCarServicePrice);

router.get("/dispatch/notifications/all", allCaseReportsNotifications);

router.get("/dispatch/notifications/:userId", newCaseReportNotifications);

router.put(
  "/dispatch/case/:caseId/complete/service",
  authDriver,
  dispatchCaseCompleteService
);

router.put("/dispatch/towcarservice/price", updateTowCarServicePrice);

router.patch(
  "/dispatch/update/report/notification/:id",
  notificationStatusUpdate
);

router.patch("/dispatch/service-approvals/:id", responseSuggestedService);
export default router;
