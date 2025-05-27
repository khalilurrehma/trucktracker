import { messaging } from "../firebase/firebase.js";

export const sendPushNotification = async (fcmTokens, title, body) => {
  if (!fcmTokens || fcmTokens.length === 0) {
    console.log("No FCM tokens provided for notification");
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message = {
      tokens: fcmTokens,
      notification: {
        title,
        body,
      },
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
            alert: {
              title,
              body,
            },
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
