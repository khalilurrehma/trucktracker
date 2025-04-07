import express from "express";
import {
  deleteNewUser,
  editNewUserById,
  getNewUser,
  getNewUserById,
  getNewUserByUserId,
} from "../controllers/user.js";

const router = express.Router();

router.get("/new-users", getNewUser);
router.get("/new-users/:id", getNewUserById);
router.get("/new-users/user/:userId", getNewUserByUserId);
router.put("/new-users/:id", editNewUserById);
router.delete("/new-users/:id", deleteNewUser);

export default router;
