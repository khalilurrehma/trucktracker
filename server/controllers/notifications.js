import {
  allConfiguredNotifications,
  allSubscribedNotifications,
  configuredNotificationByDeviceTypeId,
  fetchDefaultAlarmsEvents,
  newConfiguredNotification,
  newTrackDeviceIdNotification,
  notificationTypeById,
  notificationTypes,
  saveSubscribedNotification,
  saveSubscribedProtocolNotification,
  trackNotificationByDeviceTypeId,
  updateNotification,
  allSubscribedProtocolNotifications,
} from "../model/notifications.js";
import { s3 } from "../services/azure.s3.js";

export const allNotificationsType = async (req, res) => {
  try {
    const notifications = await notificationTypes();

    if (!notifications || notifications.length === 0) {
      return res.status(404).json({ error: "No notifications found" });
    }

    res.status(200).json({ status: true, message: notifications });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const subscribeNotification = async (req, res) => {
  const { type, notificators } = req.body;

  const notificationType = await notificationTypeById(type);

  if (!notificationType) {
    return res.status(404).json({ error: "Notification type not found" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No audio file provided" });
  }

  const audioFile = req.files[0];

  try {
    let uploadedFile;
    try {
      uploadedFile = await s3
        .upload({
          Bucket: process.env.CONTABO_BUCKET_NAME,
          Key: `audio/${Date.now()}-${audioFile.originalname}`,
          Body: audioFile.buffer,
          ContentType: audioFile.mimetype,
          ACL: "public-read",
        })
        .promise();

      const signedUrl = s3.getSignedUrl("getObject", {
        Bucket: process.env.CONTABO_BUCKET_NAME,
        Key: `audio/${audioFile.originalname}`,
        Expires: 60 * 60,
      });
      console.log("Temporary URL:", signedUrl);
    } catch (awsError) {
      console.error("AWS S3 Upload Error:", awsError);
      return res.status(500).json({
        error: "Failed to upload audio file to S3",
        details: awsError.message || awsError,
      });
    }

    const newSubscribedNotificationBody = {
      name: notificationType.name,
      mqtt_topic: notificationType.mqtt_topic,
      channels: notificators,
      audio_filename: audioFile.originalname,
      audio_file: uploadedFile.Location,
    };

    const dbResp = await saveSubscribedNotification(
      newSubscribedNotificationBody
    );

    if (!dbResp) {
      return res
        .status(500)
        .json({ error: "Failed to save notification in DB" });
    } else {
      await updateNotification(1, type);
    }

    res.status(201).json({ status: true, message: "Notification subscribed" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const subscribeProtocolNotification = async (req, res) => {
  const { device_type_id, configured_items, userId } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No audio file provided" });
  }

  const audioFile = req.files[0];

  try {
    let uploadedFile;
    try {
      uploadedFile = await s3
        .upload({
          Bucket: process.env.CONTABO_BUCKET_NAME,
          Key: `audio/${Date.now()}-${audioFile.originalname}`,
          Body: audioFile.buffer,
          ContentType: audioFile.mimetype,
          ACL: "public-read",
        })
        .promise();
    } catch (awsError) {
      console.error("AWS S3 Upload Error:", awsError);
      return res.status(500).json({
        error: "Failed to upload audio file to S3",
        details: awsError.message || awsError,
      });
    }

    const newSubscribedProtocolNotificationBody = {
      device_type_id,
      configured_items,
      audio_filename: audioFile.originalname,
      audio_file: uploadedFile.Location,
      userId,
    };

    await saveSubscribedProtocolNotification(
      newSubscribedProtocolNotificationBody
    );

    res.status(201).json({ status: true, message: "Notification subscribed" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAllSubscribedNotifications = async (req, res) => {
  try {
    const subscribedNotifications = await allSubscribedNotifications();

    res.status(200).json({ status: true, message: subscribedNotifications });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAllSubscribedProtocolNotifications = async (req, res) => {
  try {
    const subscribedProtocolNotifications =
      await allSubscribedProtocolNotifications();

    res
      .status(200)
      .json({ status: true, message: subscribedProtocolNotifications });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const alarmsEventsDropdown = async (req, res) => {
  try {
    const dropdown = await fetchDefaultAlarmsEvents();

    if (!dropdown) {
      return res.status(404).json({ error: "No dropdown events found" });
    }

    res.status(200).json({ status: true, message: dropdown });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const protocolNotification = async (req, res) => {
  const { defaultType, notificationType, deviceTypeId, parameterValue, value } =
    req.body;

  if (
    !defaultType ||
    !notificationType ||
    !deviceTypeId ||
    !parameterValue ||
    !value
  ) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    let dbBody = {
      notification_id: defaultType.Id,
      notification_name: defaultType.name,
      notification_type: notificationType.label,
      device_type_id: deviceTypeId,
      parameter_value: parameterValue.label,
      notification_code: parseInt(value),
    };
    let firstResp = await newConfiguredNotification(dbBody);

    if (!firstResp) {
      return res.status(500).json({
        status: false,
        message: "Failed to save default notification in DB",
      });
    }

    let trackBody = {
      alarm_event_id: defaultType.Id,
      alarm_event_name: defaultType.name,
      device_type_id: deviceTypeId,
    };

    await newTrackDeviceIdNotification(trackBody);

    res.status(201).json({ status: true, message: "Notification Configured!" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const protocolNotifications = async (req, res) => {
  try {
    const notifications = await allConfiguredNotifications();
    const formattedBody = notifications?.map((item) => {
      return {
        id: item.id,
        name: item.notification_name,
        type: item.notification_type,
        deviceType: item.device_type_id,
        parameter: item.parameter_value,
        "Alarm Code": item.notification_code,
        createdAt: item.created_at,
      };
    });

    res.status(200).json({ status: true, message: formattedBody });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const configuredProtocolNotifications = async (req, res) => {
  const { id } = req.params;
  try {
    const notifications = await configuredNotificationByDeviceTypeId(id);

    if (!notifications || notifications.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No notifications found for this device type",
      });
    }

    res.status(200).json({ status: true, message: notifications });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const connfiguredNotifications = async (req, res) => {
  const { device_type_id } = req.params;
  try {
    const notifications = await trackNotificationByDeviceTypeId(device_type_id);

    if (!notifications) {
      return res.status(404).json({ error: "No notifications found" });
    }

    res.status(200).json({ status: true, message: notifications });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
