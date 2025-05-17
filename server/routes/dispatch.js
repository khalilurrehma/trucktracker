import express from "express";
import { handleNewDispatchCase } from "../controllers/dispatch.js";

const router = express.Router();

router.post("/dispatch/task", handleNewDispatchCase);

export default router;
