import express from "express";
import {
  addCalculators,
  allCalculators,
  allcustomCalcs,
  assignedCustomCalcs,
  calculatorById,
  calculatorByTraccarId,
  calculatorsByType,
  companyCustomCalcs,
  companyDefaultCalcs,
  customCalcDevices,
  deleteCalculator,
  linkedCalculators,
  spAdminCustomCalcsDevices,
  updateCalculator,
} from "../controllers/calculator.js";

const router = express.Router();

router.post("/calcs", addCalculators);
router.get("/calcs", allCalculators);
router.get("/calcs/:id", calculatorById);
router.get("/calcs/by/type", calculatorsByType);
router.get("/calcs/custom/all", allcustomCalcs);
router.get("/calcs/traccarId/:traccarId", calculatorByTraccarId);
router.get("/calcs/company/default/:traccarId", companyDefaultCalcs);
router.get("/calcs/company/custom/:traccarId", companyCustomCalcs);
router.get("/calc/company/custom/assigned/:traccarId", assignedCustomCalcs);
router.get(
  "/calcs/custom/assigned/devices/:deviceId/:traccarId",
  customCalcDevices
);
router.get(
  "/calcs/custom/admin/assigned/devices/:deviceId",
  spAdminCustomCalcsDevices
);
router.get(
  "/calcs/linked/realm/:realmId/user/:realmuserId/:traccarId",
  linkedCalculators
);
router.put("/calcs/:id", updateCalculator);
router.delete("/calcs/:id", deleteCalculator);

export default router;
