import express from "express";
import {
  getAllNewCases,
  postNewCase,
} from "../../controllers/dispatch/newCases.js";

const router = express.Router();

router.post("/dispatch/new-case", postNewCase);

router.get("/dispatch/new-cases", getAllNewCases);
export default router;
