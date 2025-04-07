import express from "express";
import { getProtocols } from "../controllers/protocols.js";

const router = express.Router();

router.get("/protocols", getProtocols);

export default router;
