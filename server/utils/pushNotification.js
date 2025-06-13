import { messaging } from "../firebase/firebase.js";

export const sendPushNotification = async (
  fcmTokens,
  title,
  body,
  data = {}
) => {
  if (!fcmTokens?.length) {
    console.log("No FCM tokens provided for notification");
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message = {
      tokens: fcmTokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          typeof value === "object" ? JSON.stringify(value) : String(value),
        ])
      ),
      priority: "high",
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            alert: { title, body },
            contentAvailable: true,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log("Successfully sent notifications:", response);

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error("Error sending notifications:", error);
    return { successCount: 0, failureCount: fcmTokens.length };
  }
};
