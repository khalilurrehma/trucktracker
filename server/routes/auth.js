import express from "express";
import { issueWebToken } from "../controllers/auth.js";

const router = express.Router();

router.post("/auth/token", issueWebToken);

export default router;
