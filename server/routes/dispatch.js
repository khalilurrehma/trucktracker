import express from "express";
import {
  fetchAllDispatchCases,
  handleNewDispatchCase,
} from "../controllers/dispatch.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/dispatch/case", upload.any(), handleNewDispatchCase);

router.get("/dispatch/cases", fetchAllDispatchCases);

router.post("/dispatch/case/accept/:caseId");

router.post("/dispatch/case/reject/:caseId");

export default router;
