import express from "express";
import {
  companyValidCustomCalc,
  realmUserCalcs,
} from "../controllers/session.js";

const router = express.Router();

router.get("/session/realm-user/calcs/:traccarId", realmUserCalcs);
router.get("/session/company/custom/calc/:traccarId", companyValidCustomCalc);

export default router;
