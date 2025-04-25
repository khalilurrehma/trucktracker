import {
  getDeviceNameByFlespId,
  getDeviceUserIdByFlespiId,
} from "../model/devices.js";
import {
  getLatestOperationAlarms,
  newDeviceEvent,
  newOperationAlarm,
  saveNotificationLogs,
  newDriverBehaivorReport,
  alarmCodeOfConfiguredNotifications,
  subcribedEventPNByDeviceTypeId,
  subcribedAlarmPNByDeviceTypeId,
} from "../model/notifications.js";
import { fetchDeviceShiftByFlespiId } from "../model/usageControl.js";
import { getDeviceRadiusReport } from "../utils/device.radius.js";
import { getRealmUsersWithDeviceIds } from "../utils/mqtt.helper.js";

const deviceNames = {};
const deviceShiftCache = {};

export const deviceTopicAinHandler = async (topic, message) => {
  if (!topic.includes("ain.1")) return;

  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = topicParts[deviceIdIndex];

  if (!deviceId) return console.warn("⚠️ No device ID found in topic:", topic);

  const deviceName = await getDeviceNameByFlespId(deviceId);

  const processedData = {
    topic,
    ainDevice: { deviceId, deviceName },
    ain: message,
    timestamp: new Date().toISOString(),
  };

  const dbBody = {
    device_id: deviceId,
    device_name: deviceName,
    topic,
    notification_body: processedData,
  };

  // await saveNotificationLogs(dbBody);

  return processedData;
};

export const deviceTopicDoutHandler = async (topic, message) => {
  if (!topic.includes("calcs")) return;

  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = topicParts[deviceIdIndex];

  const deviceName = await getDeviceNameByFlespId(deviceId);

  // const processedData = {
  //   topic,
  //   doutDevice: { deviceId, deviceName },
  //   dout: message,
  //   timestamp: new Date().toISOString(),
  // };

  // const dbBody = {
  //   device_id: deviceId,
  //   device_name: deviceName,
  //   topic,
  //   notification_body: processedData,
  // };

  // await saveNotificationLogs(dbBody);

  // return processedData;
};
export const activatedDoutHandler = async (topic, message) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = topicParts[deviceIdIndex];
  const deviceName = await getDeviceNameByFlespId(deviceId);

  var processedDbData = {
    device_id: deviceId,
    device_name: deviceName,
    topic,
    notification_body: message,
  };

  await saveNotificationLogs(processedDbData);

  var processedData = {
    deviceId,
    deviceName,
    doutBody: message,
  };

  return { topic, processedData };
};
export const mqttDoutAlerts = async (topic, message) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = topicParts[deviceIdIndex];

  if (!deviceNames[deviceId]) {
    deviceNames[deviceId] = await getDeviceNameByFlespId(deviceId);
  }

  const deviceName = deviceNames[deviceId];

  var processedData = {
    deviceId,
    deviceName,
    topic,
    doutValue: message,
    timestamp: Math.floor(Date.now() / 1000),
  };

  return processedData;
};

export const devicesAlarmMQTT = async (topic, message) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = parseInt(topicParts[deviceIdIndex]);

  if (!deviceId || !message?.device_type_id) return;

  const configured_notification = await subcribedAlarmPNByDeviceTypeId(
    message.device_type_id,
    message.alarm_code
  );

  if (!configured_notification) return;

  const deviceUserId = await getDeviceUserIdByFlespiId(deviceId);
  if (!deviceUserId) {
    console.error(
      "devicesAlarmMQTT: Device not found for Flespi ID:",
      deviceId
    );
    return;
  }

  await newOperationAlarm({
    deviceId,
    deviceName: message.device_name,
    alarmCode: message.alarm_code,
    alarmType: message.alarm_type,
    topic,
    message,
    userId: deviceUserId,
  });

  const realmUser = await getRealmUsersWithDeviceIds(deviceUserId);
  const filteredRealmUser = realmUser?.length > 1 ? realmUser.slice(1) : [];

  const matchingUser = filteredRealmUser.find((user) =>
    user.deviceIds?.includes(deviceId)
  );

  return {
    deviceId,
    deviceName: message.device_name || "Unknown device",
    eventType: message.alarm_type,
    topic,
    message: JSON.stringify(message),
    userId: deviceUserId,
    traccarId: matchingUser?.traccarId || null,
    audio_file: configured_notification?.audio_file,
    notificationStatus: true,
  };
};

export const deviceNewEvent = async (topic, message) => {
  try {
    const topicParts = topic.split("/");
    const deviceIdIndex = topicParts.indexOf("devices") + 1;

    const deviceId = parseInt(topicParts[deviceIdIndex]);

    if (!deviceId) {
      return;
    }

    if (!message?.device_type_id) {
      return;
    }

    const configured_notification = await subcribedEventPNByDeviceTypeId(
      message?.device_type_id,
      message?.alarm_code
    );

    if (!configured_notification) {
      return;
    }

    const deviceUserId = await getDeviceUserIdByFlespiId(deviceId);

    if (!deviceUserId) {
      console.error(
        "deviceNewEvent: Device not found for Flespi ID:",
        deviceId
      );
      return null;
    }

    const processedDbData = {
      deviceId,
      deviceName: message.device_name || "Unknown device",
      eventType: message.event_type || "unknown",
      topic,
      message,
      userId: deviceUserId || null,
    };

    await newDeviceEvent(processedDbData);

    const realmUser = await getRealmUsersWithDeviceIds(deviceUserId);

    const filteredRealmUser =
      Array.isArray(realmUser) && realmUser.length > 1
        ? realmUser.slice(1)
        : [];

    if (filteredRealmUser.length > 0) {
      const matchingUser = filteredRealmUser.find((user) =>
        user.deviceIds?.includes(deviceId)
      );

      if (matchingUser) {
        processedDbData.traccarId = matchingUser.traccarId;
      }
    }

    processedDbData.audio_file = configured_notification?.audio_file;
    // processedDbData.notificationStatus = true;
    return processedDbData;
  } catch (error) {
    console.error("Error processing device event:", error);
    return null;
  }
};

export const driverBehaivor = async (topic, message) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = parseInt(topicParts[deviceIdIndex]);

  if (!deviceId) {
    return;
  }

  const deviceUserId = await getDeviceUserIdByFlespiId(deviceId);

  if (!deviceUserId) {
    console.error("driverBehaivor: Device not found for Flespi ID:", deviceId);
    return null;
  }

  var processedDbData = {
    deviceId: parseInt(deviceId),
    deviceName: message.device_name,
    driverBehaivorEvent: message.driver_behaivor_event,
    topic,
    message,
    userId: deviceUserId || null,
  };

  await newDriverBehaivorReport(processedDbData);

  return processedDbData;
};

export const handleDeviceLiveLocation = async (topic, message) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = parseInt(topicParts[deviceIdIndex]);

  if (!deviceShiftCache[deviceId]) {
    const shiftData = await fetchDeviceShiftByFlespiId(deviceId);
    deviceShiftCache[deviceId] = shiftData;
  }

  const deviceName = await getDeviceNameByFlespId(deviceId);

  const shiftData = deviceShiftCache[deviceId]?.[0];
  const driverLocation = shiftData?.driver_location;

  const deviceLocation = {
    latitude: message.latitude,
    longitude: message.longitude,
  };

  const authLocation = driverLocation
    ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
    : null;

  let withinRadius = false;

  if (authLocation) {
    withinRadius = getDeviceRadiusReport(deviceLocation, authLocation, 100);
  }

  return {
    deviceId,
    deviceName: deviceName || "unknown device",
    latitude: message.latitude,
    longitude: message.longitude,
    topic,
  };
};

export const handleDeviceDin = async (topic, message) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = parseInt(topicParts[deviceIdIndex]);

  if (!deviceId) {
    return;
  }

  const obj = {
    deviceId,
    din: message,
    topic,
  };

  return obj;
};

export const handleDeviceConnection = async (topic, message) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = parseInt(topicParts[deviceIdIndex]);

  if (!deviceId) {
    return;
  }

  const dataFormat = {
    deviceId,
    connected: message,
    topic,
  };

  return dataFormat;
};

export const handleDeviceIgnition = async (topic, message) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = parseInt(topicParts[deviceIdIndex]);

  if (!deviceId) {
    return;
  }

  const dataFormat = {
    deviceId,
    connected: message,
    topic,
  };

  return dataFormat;
};
