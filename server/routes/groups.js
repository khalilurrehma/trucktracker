import express from "express";
import {
  addNewGroup,
  allNewGroups,
  deleteNewGroup,
  newGroupById,
  newGroupByUserId,
  updateNewGroup,
} from "../controllers/groups.js";

const router = express.Router();

router.post("/new-groups", addNewGroup);
router.get("/new-groups/user/:userId", newGroupByUserId);
router.get("/new-groups", allNewGroups);
router.get("/new-groups/:id", newGroupById);
router.put("/new-groups/:id", updateNewGroup);
router.delete("/new-groups/:id", deleteNewGroup);

export default router;
