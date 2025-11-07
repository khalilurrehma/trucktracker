import {
  getDeviceIdByFlespId,
  getDeviceInitialGeofence,
  getDeviceNameByFlespId,
  getDeviceUserIdByFlespiId,
  saveDeviceInitialGeofence,
} from "../model/devices.js";
import {
  pickFirstNumeric,
  sumNumeric,
  secondsToMin,
  formatDuration,
  toISO,
} from "../utils/opKpis.js";
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
import {
  fetchAttendanceByDateAndDeviceId,
  updateAttendanceField,
} from "../model/shift.js";
import { fetchDeviceShiftByFlespiId } from "../model/usageControl.js";
import { getDeviceRadiusReport } from "../utils/device.radius.js";
import { getRealmUsersWithDeviceIds } from "../utils/mqtt.helper.js";
import dayjs from "dayjs";
import {
  currentCaseProcess,
  getLatestActiveCaseByDeviceId,
  isInReferenceStageExists,
  isOnTheWayStageExists,
  saveInReferenceStage,
  updateOnTheWayStageStatus,
} from "./dispatchService.js";
import { updateCaseCurrentProcess } from "../model/dispatch.js";
import { EventEmitter } from "events";

export const DispatchEmitter = new EventEmitter();

const deviceNames = {};
const deviceShiftCache = {};
const deviceIdCache = {};
const TIME_FORMAT_12H = "hh:mm:ss A";

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
    const [attendanceDate, time] = message?.event_time?.split(" ");
    const deviceId = parseInt(topicParts[deviceIdIndex]);
    let attendanceReport;

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

    if (message.event_type === "ignition on") {
      attendanceReport = await fetchAttendanceByDateAndDeviceId(
        deviceId,
        attendanceDate
      );

      if (!attendanceReport) {
        return;
      }

      if (!attendanceReport?.ignition_before_shift_begin) {
        await updateAttendanceField(
          deviceId,
          attendanceDate,
          "ignition_before_shift_begin",
          time
        );
      } else {
        console.log(
          `Ignition status already updated for device ${deviceId} on ${attendanceDate}`
        );
      }
    }

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
  let withinRadius = false;

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

export const handleInReferenceStage = async (topic, message) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const flespiDeviceId = parseInt(topicParts[deviceIdIndex]);

  let dbDeviceId = deviceIdCache[flespiDeviceId];

  if (!dbDeviceId) {
    dbDeviceId = await getDeviceIdByFlespId(flespiDeviceId);
    if (!dbDeviceId) return;
    deviceIdCache[flespiDeviceId] = dbDeviceId;
  }

  const caseData = await getLatestActiveCaseByDeviceId(dbDeviceId);
  if (!caseData || !caseData.latitude || !caseData.longitude) return;

  if (message.speed && message.speed > 5) {
    const alreadyStageExist = await isOnTheWayStageExists(
      caseData.dispatch_case_id
    );
    if (!alreadyStageExist) {
      await Promise.all([
        updateOnTheWayStageStatus(caseData.dispatch_case_id, "on the way"),
        updateCaseCurrentProcess(caseData.dispatch_case_id, "on_the_way"),
      ]);
      DispatchEmitter.emit("subprocessEvent", {
        id: caseData.dispatch_case_id,
        current_subprocess: "on_the_way",
      });
    } else {
      const alreadyRecordedCaseProcess = await currentCaseProcess(
        caseData.dispatch_case_id
      );

      if (
        alreadyRecordedCaseProcess.current_subprocess.includes([
          "advisor_assignment",
          "reception_case",
        ])
      ) {
        await updateCaseCurrentProcess(caseData.dispatch_case_id, "on_the_way");
        DispatchEmitter.emit("subprocessEvent", {
          id: caseData.dispatch_case_id,
          current_subprocess: "on_the_way",
        });
      }
    }
  }

  const deviceLocation = {
    latitude: message.latitude,
    longitude: message.longitude,
  };
  const caseLocation = {
    latitude: caseData.latitude,
    longitude: caseData.longitude,
  };

  const isNearby = getDeviceRadiusReport(deviceLocation, caseLocation, 200);

  if (isNearby) {
    const alreadyRecorded = await isInReferenceStageExists(
      caseData.dispatch_case_id
    );
    if (!alreadyRecorded) {
      await Promise.all([
        saveInReferenceStage(caseData.dispatch_case_id),
        updateCaseCurrentProcess(caseData.dispatch_case_id, "in_reference"),
      ]);
      DispatchEmitter.emit("subprocessEvent", {
        id: caseData.dispatch_case_id,
        current_subprocess: "in_reference",
      });
    }
  }
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

export const geofenceEntryAndExit = async (topic, payload) => {
  try {
    const topicParts = topic.split("/");
    const deviceIdIndex = topicParts.indexOf("devices") + 1;
    const deviceId = parseInt(topicParts[deviceIdIndex]);

    if (!payload || payload.event_type !== "enter") {
      return;
    }

    const currentDate = dayjs().format("YYYY-MM-DD");
    const currentTime = dayjs().format(TIME_FORMAT_12H);

    const initialBase = await getDeviceInitialGeofence(deviceId, currentDate);

    if (!initialBase) {
      await saveDeviceInitialGeofence(
        deviceId,
        payload.enter_geofence,
        currentDate
      );
    }

    const attendanceReport = await fetchAttendanceByDateAndDeviceId(
      deviceId,
      currentDate
    );

    if (!attendanceReport) {
      console.log(
        `No attendance report for device ${deviceId} on ${currentDate}`
      );
      return;
    }

    if (!attendanceReport.station_arrival_time) {
      await updateAttendanceField(
        deviceId,
        currentDate,
        "station_arrival_time",
        currentTime
      );

      const shiftStart = attendanceReport.shift_begin;

      if (shiftStart) {
        const actualShiftStart = dayjs(shiftStart, TIME_FORMAT_12H);
        const arrivalTime = dayjs(currentTime, TIME_FORMAT_12H);

        let shiftBeginStatus = "";

        if (arrivalTime.isBefore(actualShiftStart)) {
          const minutesEarly = actualShiftStart.diff(arrivalTime, "minute");
          shiftBeginStatus = `${minutesEarly} min early`;
        } else {
          const minutesLate = arrivalTime.diff(actualShiftStart, "minute");
          shiftBeginStatus = `${minutesLate} min late`;
        }

        await updateAttendanceField(
          deviceId,
          currentDate,
          "shift_begin_status",
          shiftBeginStatus
        );
      }
    } else {
      console.log(
        `Station arrival time already set for device ${deviceId} on ${currentDate}`
      );
    }
  } catch (error) {
    console.error("Error in geofenceEntryAndExit:", error.message);
  }
};

export const detailedTelemetry = async (topic, payload) => {
  const topicParts = topic.split("/");
  const deviceIdIndex = topicParts.indexOf("devices") + 1;
  const deviceId = parseInt(topicParts[deviceIdIndex]);
  const key = topicParts.slice(-1)[0];

  if (!deviceId || !key) {
    return null;
  }

  return {
    deviceId,
    key,
    value: payload,
    topic,
  };
};

export const operationCalculator = async (topic, message) => {
  try {
    const topicParts = String(topic || "").split("/");
    const deviceIdIndex = topicParts.indexOf("devices") + 1;
    const flespiDeviceId = Number.parseInt(topicParts[deviceIdIndex], 10);
    const key = topicParts.slice(-1)[0];

    // ------- Extract KPIs -------
    const cycleEfficiency = pickFirstNumeric(message, "cycle_efficiency", "operation_efficiency_pct");
    const tripsToday =
      pickFirstNumeric(message, "cycle_haul_trips_count") ??
      pickFirstNumeric(message, "L2D_trip_count", "D2L_trip_count") ??
      0;

    const cycleDurationSec =
      pickFirstNumeric(message, "cycle_duration") ??
      pickFirstNumeric(message, "op_avg_cycle_duration") ??
      0;

    const avgVolumeM3 =
      pickFirstNumeric(message, "avg_cycle_volume_m3") ??
      pickFirstNumeric(message, "op_avg_cycle_volume_m3") ??
      pickFirstNumeric(message, "trip_volume_m3") ??
      0;

    const energyPerM3 =
      pickFirstNumeric(message, "avg_energy_efficiency_lm3") ??
      pickFirstNumeric(message, "energy_efficiency_lm3") ??
      0;

    const failures = sumNumeric(
      message,
      "L2D_stops_during_trip",
      "D2L_stops_during_trip"
    );

    const queueAvgSec = pickFirstNumeric(message, "op_avg_queue_time", "queue_area_stop_time") ?? 0;
    const vehicleCount =
      pickFirstNumeric(message, "op_vehicle_count", "zone_vehicle_count", "Active_vehicles") ?? 0;
    const loaderCount = pickFirstNumeric(message, "op_loaders_count", "active_loaders") ?? 0;

    const ts =
      pickFirstNumeric(message, "timestamp") ??
      (Array.isArray(message?.result)
        ? Math.max(
            ...message.result
              .map((it) => (typeof it?.timestamp === "number" ? it.timestamp : -Infinity))
              .filter((v) => Number.isFinite(v))
          )
        : null);

    const opStats = {
      flespiDeviceId,
      efficiency: cycleEfficiency ?? 0,
      trips: tripsToday || 0,
      avgVolumeM3: avgVolumeM3 || 0,
      fuelPerM3: energyPerM3 || 0,
      failures: failures || 0,
      vehicleCount,
      loaderCount,
      queueTimeAvgMin: secondsToMin(queueAvgSec),
      durationSec: cycleDurationSec || 0,
      durationFormatted: formatDuration(cycleDurationSec),
      queueTimeFormatted: formatDuration(queueAvgSec),
      timestamp: toISO(ts),
    };

    // console.log("📊 Operation KPIs:", opStats);

    return {
      flespiDeviceId,
      key,
      value: opStats,
      topic,
    };
  } catch (err) {
    console.error("❌ Error in operationCalculator:", err.message);
    return null;
  }
};
// handleGeofenceEvent.js
export async function handleGeofenceEvent(
  topic,
  message,
  {
    upsert = null,      // optional
    remove = null,      // optional
    broadcast = null,   // optional
  } = {}
) {
  // ------------------ helpers ------------------
  const normalizeGeometry = (g = {}) => {
    const t = String(g.type || "").toLowerCase();

    if (t === "circle") {
      const c = g.center || g.centre || {};
      return {
        type: "circle",
        center: { lat: Number(c.lat), lon: Number(c.lon) },
        radius: Number(g.radius), // Flespi = km
      };
    }

    if (t === "polygon") {
      if (Array.isArray(g.path)) {
        return {
          type: "polygon",
          path: g.path.map(p => ({ lat: Number(p.lat), lon: Number(p.lon) })),
        };
      }

      const ring = g.coordinates?.[0] || [];
      return {
        type: "polygon",
        path: ring.map(([lon, lat]) => ({
          lat: Number(lat),
          lon: Number(lon),
        })),
      };
    }

    return g;
  };

  const resolveAction = (topic = "", msg = {}) => {
    const last = topic.split("/").slice(-1)[0].toLowerCase();
    if (["created", "updated", "deleted"].includes(last)) return last;

    const code = Number(msg.event_code);
    if (code === 3) return "deleted";
    if (code === 2) return "updated";
    if (code === 0 || code === 1) return "created";

    return "updated";
  };

  const buildGeofence = (id, msg = {}) => {
    const base = msg.http_data || msg.new || msg.old || {};
    return {
      id: Number(id),
      name: base.name || "",
      priority: Number(base.priority ?? 50),
      enabled: base.enabled !== false,
      geometry: normalizeGeometry(base.geometry || {}),
      metadata: { ...(base.metadata || {}) },
    };
  };

  // ------------------ parse topic ------------------
  const parts = String(topic).split("/");
  const idx = parts.indexOf("geofences");
  if (idx < 0) return null;

  const geofenceId = Number(parts[idx + 1]);
  const action = resolveAction(topic, message);

  // ------------------ DB operations ------------------
  let model = { id: geofenceId };

  if (action !== "deleted") {
    model = buildGeofence(geofenceId, message);
    if (typeof upsert === "function") await upsert(model);
  } else {
    if (typeof remove === "function") await remove(geofenceId);
  }

  // ------------------ unified payload ------------------
  const payload = {
    type: "geofence",
    action,
    topic,
    timestamp: Number(message?.timestamp) || Math.floor(Date.now() / 1000),
    data: model,
    diff: {
      new: message?.new ?? null,
      old: message?.old ?? null,
    },
  };

  return payload;
}
