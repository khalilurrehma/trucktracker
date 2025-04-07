import express from "express";
import {
  getAllDispatchServices,
  postDispatchServices,
} from "../../controllers/dispatch/services.js";

const router = express.Router();

router.post("/dispatch/services", postDispatchServices);

router.get("/dispatch/services", getAllDispatchServices);

export default router;
