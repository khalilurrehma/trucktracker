import express from "express";
import {
  deleteRealmUser,
  getRealmById,
  getRealmByTraccarId,
  getRealms,
  getRealmsByUserId,
  getRealmUserById,
  getRealmUserByUserId,
  getRealmUsers,
  modifyRealmUser,
  newRealmUser,
  postRealm,
} from "../controllers/realms.js";
import { checkUserLimit } from "../middlewares/limit.middleware.js";

const router = express.Router();

router.post("/realm", postRealm);
router.get("/realms", getRealms);
router.get("/realm/:id", getRealmById);
router.get("/realms/user/:userId", getRealmsByUserId);
router.get("/realm/traccarUser/:traccarId", getRealmByTraccarId);

// CREATE REALM USERS
router.post(
  "/subaccount/:subaccountId/realm/:realmId/user",
  checkUserLimit,
  newRealmUser
);
router.get("/realm/:realmId/users", getRealmUsers);
router.get("/realm/:realmId/acc/user/:id", getRealmUserById);
router.get("/realm/:realmId/user/:userId", getRealmUserByUserId);
router.put("/realm/:realmId/user/:id", modifyRealmUser);
router.delete("/realm/:realmId/user/:id/:flespiId", deleteRealmUser);
export default router;
