import express from "express";
import {
  alarmsEventsDropdown,
  allNotificationsType,
  configuredProtocolNotifications,
  connfiguredNotifications,
  getAllSubscribedNotifications,
  getAllSubscribedProtocolNotifications,
  protocolNotification,
  protocolNotifications,
  subscribeNotification,
  subscribeProtocolNotification,
} from "../controllers/notifications.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.get("/notifications", allNotificationsType);
router.get("/subscribed/notifications", getAllSubscribedNotifications);
router.get("/subscribed/protocol/notifications", getAllSubscribedProtocolNotifications);
router.post("/subscribe/notification", upload.any(), subscribeNotification);
router.post(
  "/subscribe/protocol/notification",
  upload.any(),
  subscribeProtocolNotification
);
router.get("/dropdown/alarms-events", alarmsEventsDropdown);
router.post("/protocol/notification", protocolNotification);
router.get("/protocol/notifications", protocolNotifications);
router.get("/configured/protocol/:id", configuredProtocolNotifications);
router.get(
  "/configured/notifications/:device_type_id",
  connfiguredNotifications
);
// router.post("/notification");

export default router;
