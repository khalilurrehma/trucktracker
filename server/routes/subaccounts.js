import express from "express";
import {
  deleteSubaccount,
  fetchTraccarToken,
  generateAndSaveUFT,
  generateUFT,
  getSubaccountById,
  getSubaccountByTraccarId,
  getSubaccountByUserId,
  getSubaccounts,
  getTraccarTokenByUserId,
  getUFTbyId,
  postSubaccount,
  subaccountCounterByFlespiId,
  subaccountCounterItems,
  subaccountRealmUsers,
  traccarToken,
  updateSubaccount,
} from "../controllers/subaccounts.js";
import { getTraccarToken } from "../model/traccarToken.js";

const router = express.Router();

router.post("/subaccount", postSubaccount);

router.get("/subaccounts", getSubaccounts);

router.get("/subaccount/:id", getSubaccountById);

router.get("/subaccount/traccar/:traccarId", getSubaccountByTraccarId);

router.get("/subaccount/counter/:flespiId", subaccountCounterByFlespiId);

router.get("/subaccount/counter/items/:flespiId/:item", subaccountCounterItems);

router.get("/subaccount/counter/realm/users/:flespiId", subaccountRealmUsers);

router.get("/subaccount/user/:userId", getSubaccountByUserId);

router.put("/subaccount/:id", updateSubaccount);

router.delete("/subaccount/:id", deleteSubaccount);

router.post("/uft", generateAndSaveUFT);

router.post("/uft2", generateUFT);

router.get("/uft/:id", getUFTbyId);

router.post("/traccar-token", traccarToken);

router.get("/traccar-token", fetchTraccarToken);

router.get("/traccar-token/:UserId", getTraccarTokenByUserId);

export default router;
