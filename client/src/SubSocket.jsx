import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAppContext } from "./AppContext";
import { Snackbar, Alert, Slide } from "@mui/material";
import alertSound from "./resources/echong-notification-official.wav";
import { useSelector } from "react-redux";
import { getAuthenticatedAudioUrl } from "./settings/common/New.Helper";
import store, { updateTelemetry } from "./store";

const TempNotification = ({ notifications, setNotifications }) => {
  const handleCloseNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  return (
    <>
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={notification.open}
          autoHideDuration={5000}
          onClose={() => handleCloseNotification(notification.id)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          TransitionComponent={Slide}
          style={{ top: `${index * 60}px` }}
        >
          <Alert
            severity="info"
            onClose={() => handleCloseNotification(notification.id)}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

const SubSocket = () => {
  const { updateMqttMessage, serverMessage, setServerMessage } =
    useAppContext();
  const [notifications, setNotifications] = useState([]);
  const sessionUserId = useSelector((state) => state.session.user.id);
  // const [doutProcessedData, setDoutProcessedData] = useState([]);
  const socketRef = useRef(null);
  const reconnectTimeout = useRef(null);

  const wsURL = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;
  const finalWsURL = wsURL.replace("http", "ws").replace("/api", "");

  const sendMessageToServer = (message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("⚠️ WebSocket not connected. Message not sent.");
    }
  };

  useEffect(() => {
    if (serverMessage) {
      sendMessageToServer(serverMessage);
    }
  }, [serverMessage]);

  useEffect(() => {
    const connectWebSocket = () => {
      if (socketRef.current) {
        socketRef.current.close();
      }

      socketRef.current = new WebSocket(finalWsURL);

      socketRef.current.onopen = () => {
        console.log("✅ WebSocket connected");
        clearTimeout(reconnectTimeout.current);

        sendMessageToServer({
          action: "identify-client",
          clientType: "admin",
        });
      };

      socketRef.current.onmessage = (event) => {
        try {
          const recievedData = JSON.parse(event.data);

          if (recievedData?.subprocessEvent === "subprocessEvent-update") {
            console.log("Subprocess Event Update:", recievedData);
            updateMqttMessage(recievedData, "subprocessEvent-update");
          }

          if (recievedData?.type === "cronLogs") {
            updateMqttMessage(recievedData, "cronLogs");
          }

          if (recievedData?.topic?.endsWith("/connected")) {
            updateMqttMessage(recievedData, "deviceConnected");
          }
          if (
            recievedData?.topic?.endsWith("telemetry/engine.ignition.status")
          ) {
            updateMqttMessage(recievedData, "engineIgnitionStatus");
          }
          if (recievedData?.topic?.endsWith("telemetry/position")) {
            updateMqttMessage(recievedData, "deviceLiveLocation");
          }
          if (recievedData?.topic?.endsWith("telemetry/din")) {
            // console.log(recievedData);
            updateMqttMessage(recievedData, "deviceDin");
          }
          if (recievedData?.topic?.includes("/telemetry/")) {
            const topicParts = recievedData.topic.split("/");
            const deviceId = recievedData.deviceId;
            const key = topicParts.slice(-1)[0];
            const value = recievedData?.value;

            if (deviceId && key && value !== undefined) {
              store.dispatch(updateTelemetry({ deviceId, key, value }));
            }
          }
          if (recievedData?.topic?.includes("calcs/1742074")) {
            // console.log(recievedData);
            updateMqttMessage(recievedData, "Events");
          }
          if (recievedData?.topic?.includes("calcs/1742075")) {
            // console.log(recievedData);
            updateMqttMessage(recievedData, "Alarms");
          }
          if (recievedData?.topic?.includes("calcs/1742077")) {
            updateMqttMessage(recievedData, "Behaivor");
          }
          if (recievedData?.topic?.includes("calcs/2193946")) {
            updateMqttMessage(recievedData, "operationCalculator");
          }

          if (
            (recievedData.suggestedServices ===
              "suggestedServices-notification" &&
              (recievedData?.companyId === sessionUserId ||
                sessionUserId === 1)) ||
            (Array.isArray(recievedData?.superVisorIds) &&
              recievedData.superVisorIds.includes(sessionUserId))
          ) {
            console.log(recievedData);

            updateMqttMessage(recievedData, "suggestedServices");
            addNotification(recievedData.message);
          }

          if (recievedData?.rimacCase === "rimacCase") {
            updateMqttMessage(recievedData, "rimacCase");
          }

          if (
            (recievedData.dispatchNotification === "newcase-notification" &&
              (recievedData.reportDetails?.companyId === sessionUserId ||
                sessionUserId === 1)) ||
            (Array.isArray(recievedData.reportDetails?.superVisorIds) &&
              recievedData.reportDetails.superVisorIds.includes(sessionUserId))
          ) {
            addNotification("Case Authorize request received");
          }

          if (recievedData?.notificationStatus) {
            const {
              eventType,
              deviceName,
              deviceId,
              audio_file,
              userId,
              traccarId,
            } = recievedData;

            const isSuperAdmin = sessionUserId === 1;
            const isAdmin = sessionUserId === userId;
            const isSupervisor = sessionUserId === traccarId;

            if (isSuperAdmin || isAdmin || isSupervisor) {
              const message = `${eventType} : ${deviceName} ID (${deviceId})`;
              addNotification(message, audio_file);
            }
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      socketRef.current.onclose = () => {
        console.warn("⚠️ WebSocket Disconnected! Reconnecting in 5s...");
        reconnectTimeout.current = setTimeout(connectWebSocket, 5000);
      };

      socketRef.current.onerror = (error) => {
        console.error("⚠️ WebSocket Error:", error);
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      clearTimeout(reconnectTimeout.current);
      console.log("🔌 WebSocket connection closed");
    };
  }, [finalWsURL]);

  const addNotification = (message, audioUrl) => {
    setNotifications((prev) => [
      ...prev,
      { id: uuidv4(), open: true, message, audioUrl },
    ]);

    const soundToPlay = audioUrl
      ? getAuthenticatedAudioUrl(audioUrl)
      : alertSound;

    try {
      const audio = new Audio(soundToPlay);
      audio.load();
      audio
        .play()
        .catch((error) => console.warn("⚠️ Audio play error:", error));
    } catch (error) {
      console.error("🚨 Failed to play audio:", error);
    }
  };

  return (
    <TempNotification
      notifications={notifications}
      setNotifications={setNotifications}
    />
  );
};

export default SubSocket;
