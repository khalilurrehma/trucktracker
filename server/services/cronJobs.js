import { CronJob } from "cron";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import duration from "dayjs/plugin/duration.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import LocalizedFormat from "dayjs/plugin/localizedFormat.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { getDeviceShift, nullifyExtendTime } from "../model/usageControl.js";
import {
  flespiDevicesConnectionStatus,
  flespiDevicesIgnitionStatus,
  instantExecutionCommand,
  sendCommandToFlespiDevice,
  telemetryDoutStatus,
} from "./flespiApis.js";
import { cron_logs } from "../model/reports.js";
import { EventEmitter } from "events";
import {
  createOrUpdateAttendanceReport,
  updateAttendanceField,
} from "../model/shift.js";
import { getLastIgnitionEventBefore } from "../model/notifications.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(LocalizedFormat);
dayjs.extend(duration);

/**
 * Adjusts the given time by a grace period.
 * @param {string} timeString - Original time (e.g., "09:00:00 PM").
 * @param {string} graceString - Grace period (e.g., "01:00:00").
 * @param {string} operation - "add" or "subtract".
 * @returns {string} - Adjusted time in "HH:mm:ss" format.
 */

// const TIMEZONE = "Asia/Karachi"; // Karachi timezone
const TIMEZONE = "America/Lima"; // Peru timezone

function expandDates(dates) {
  const [startDate, endDate] = dates;
  const allDates = [];
  let current = dayjs(startDate);
  const end = dayjs(endDate);

  while (current.isSameOrBefore(end)) {
    allDates.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }

  return allDates;
}

const applyGraceTime = (timeString, graceMinutes, operation) => {
  const time = dayjs(timeString, ["hh:mm:ss A", "HH:mm:ss"]);
  const minutes = Number(graceMinutes || 0);
  return operation === "subtract"
    ? time.subtract(minutes, "minute")
    : time.add(minutes, "minute");
};

const getCronFromDateTime = (date, time) => {
  const dateTime = dayjs(`${date} ${time}`, "YYYY-MM-DD HH:mm:ss");
  return `${dateTime.second()} ${dateTime.minute()} ${dateTime.hour()} ${dateTime.date()} ${
    dateTime.month() + 1
  } *`;
};

const applyExtendTime = (baseTime, extendTimeStr) => {
  const [extHours, extMinutes] = extendTimeStr.split(":").map(Number);
  return baseTime.add(extHours, "hour").add(extMinutes, "minute");
};

let retryTimeoutMap = new Map();
let resendCompletedMap = new Map();

const scheduleResend = async ({
  shiftId,
  deviceId,
  deviceName,
  commandOff,
  resendTime,
  date,
}) => {
  const resendKey = `${shiftId}-${deviceId}-${date}`;

  if (resendCompletedMap.get(resendKey)) {
    console.log(
      `[${dayjs().format()}] Resend already completed for ${deviceName}, skipping further attempts.`
    );
    clearTimeout(retryTimeoutMap.get(resendKey));
    retryTimeoutMap.delete(resendKey);
    return;
  }

  const [hours, minutes] = resendTime.formattedTime.split(":").map(Number);
  const delayMs = (hours * 60 + minutes) * 60 * 1000;

  const attemptResend = async () => {
    try {
      const ignitionStatus = await flespiDevicesIgnitionStatus(deviceId);
      const connectionStatus = await flespiDevicesConnectionStatus(deviceId);

      const ignitionValue = ignitionStatus.result[0]?.telemetry?.din?.value;
      const isConnected = connectionStatus.result[0]?.connected;

      if ([0, 1, 4, 5].includes(ignitionValue) && isConnected) {
        const body = [{ name: "custom", properties: { text: commandOff } }];
        const response = await instantExecutionCommand(deviceId, body);

        const success = response?.result?.[0];
        const note = success
          ? `[${dayjs().format()}] Resend Success for Device: ${deviceName}`
          : `[${dayjs().format()}] Resend Failed for Device: ${deviceName}`;

        console[success ? "log" : "error"](note);

        await cron_logs({
          device_id: deviceId,
          device_name: deviceName,
          cron_type: "resend",
          cron_expression: `manualRetryAfter:${resendTime.formattedTime}`,
          scheduled_time: new Date(`${date}T${resendTime.formattedTime}`),
          status: success ? "success" : "failed",
          notes: note,
        });
        if (success) {
          const lockTimestamp = dayjs();
          const lastIgnitionOn = await getLastIgnitionEventBefore(
            deviceId,
            "ignition on",
            lockTimestamp.toDate()
          );
          const lastIgnitionOff = await getLastIgnitionEventBefore(
            deviceId,
            "ignition off",
            lockTimestamp.toDate()
          );

          const lastOnTime = lastIgnitionOn
            ? dayjs(lastIgnitionOn.createdAt).format("HH:mm:ss")
            : null;
          const lastOffTime = lastIgnitionOff
            ? dayjs(lastIgnitionOff.createdAt).format("HH:mm:ss")
            : null;

          const report = await fetchAttendanceByDateAndDeviceId(deviceId, date);
          let shiftEndStatus = "";
          if (report && lastOnTime) {
            const lastOn = dayjs(`${date}T${lastOnTime}`);
            const shiftEnd = dayjs(`${date}T${report.shift_end}`);
            shiftEndStatus = lastOn.isBefore(shiftEnd)
              ? `${shiftEnd.diff(lastOn, "minute")} min earlier`
              : `${lastOn.diff(shiftEnd, "minute")} min late`;
          }

          await updateAttendanceField(
            deviceId,
            date,
            "ignition_before_shift_end",
            lastOnTime
          );
          await updateAttendanceField(
            deviceId,
            date,
            "ignition_off_after_shift_end",
            lastOffTime
          );
          await updateAttendanceField(
            deviceId,
            date,
            "shift_end_status",
            shiftEndStatus
          );

          cronEmitter.emit("cronSaved", {
            loaded: true,
          });
          resendCompletedMap.set(resendKey, true);
          const existingTimeout = retryTimeoutMap.get(resendKey);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            retryTimeoutMap.delete(resendKey);
          }

          await nullifyExtendTime(shiftId);
        }
      } else if ([2, 3, 6, 7].includes(ignitionValue) && isConnected) {
        console.log(
          `[${dayjs().format()}] Ignition ON of Device: ${deviceName} Retrying again in ${
            resendTime.formattedTime
          }`
        );

        const existingTimeout = retryTimeoutMap.get(deviceId);
        if (existingTimeout) clearTimeout(existingTimeout);

        const timeoutId = setTimeout(attemptResend, delayMs);
        retryTimeoutMap.set(deviceId, timeoutId);

        await cron_logs({
          device_id: deviceId,
          device_name: deviceName,
          cron_type: "resend",
          cron_expression: `manualRetryAfter:${resendTime.formattedTime}`,
          scheduled_time: new Date(`${date}T${resendTime.formattedTime}`),
          status: "pending",
          notes: `[${dayjs().format()}] Ignition ON of Device: ${deviceName} Retrying again in ${
            resendTime.formattedTime
          }`,
        });

        cronEmitter.emit("cronSaved", {
          loaded: true,
        });
      } else if (!isConnected) {
        console.log(
          `[${dayjs().format()}] Device: ${deviceName} Not Connected. Retrying again in ${
            resendTime.formattedTime
          }`
        );

        const existingTimeout = retryTimeoutMap.get(deviceId);
        if (existingTimeout) clearTimeout(existingTimeout);

        const timeoutId = setTimeout(attemptResend, delayMs);
        retryTimeoutMap.set(deviceId, timeoutId);

        await cron_logs({
          device_id: deviceId,
          device_name: deviceName,
          cron_type: "resend",
          cron_expression: `manualRetryAfter:${resendTime.formattedTime}`,
          scheduled_time: new Date(`${date}T${resendTime.formattedTime}`),
          status: "pending",
          notes: `[${dayjs().format()}] Device: ${deviceName} Not Connected. Retrying again in ${
            resendTime.formattedTime
          }`,
        });
        cronEmitter.emit("cronSaved", {
          loaded: true,
        });
      } else {
        console.warn(
          `[${dayjs().format()}] Unexpected Error Occured. Skipping resend.`
        );
        await cron_logs({
          device_id: deviceId,
          device_name: deviceName,
          cron_type: "resend",
          cron_expression: `manualRetryAfter:${resendTime.formattedTime}`,
          scheduled_time: new Date(`${date}T${resendTime.formattedTime}`),
          status: "failed",
          notes: `[${dayjs().format()}] Resend aborted due to unexpected error.`,
        });
        cronEmitter.emit("cronSaved", {
          loaded: true,
        });
      }
    } catch (error) {
      console.error("Resend Attempt Error:", error.message);
      const existingTimeout = retryTimeoutMap.get(deviceId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeoutId = setTimeout(attemptResend, delayMs);
      retryTimeoutMap.set(deviceId, timeoutId);
    }
  };

  attemptResend();
};

const scheduledJobs = new Map();

const getJobKey = (deviceId, type, date) => `${deviceId}-${type}-${date}`;

export const cronEmitter = new EventEmitter();

const clearExistingJobsForDeviceShift = (deviceId, date) => {
  const startKey = getJobKey(deviceId, "start", date);
  const endKey = getJobKey(deviceId, "end", date);

  if (scheduledJobs.has(startKey)) {
    scheduledJobs.get(startKey).stop();
    scheduledJobs.delete(startKey);
    console.log(
      `[CLEAR START] Cleared old start job for device ${deviceId} on ${date}`
    );
  }

  if (scheduledJobs.has(endKey)) {
    scheduledJobs.get(endKey).stop();
    scheduledJobs.delete(endKey);
    console.log(
      `[CLEAR END] Cleared old end job for device ${deviceId} on ${date}`
    );
  }
};

// CRON FUNCTIONS

const scheduleShiftJobs = async () => {
  console.log(
    "Scheduling Shift Jobs. Time: ",
    dayjs().tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss")
  );

  const shifts = await getDeviceShift();

  if (!shifts || shifts.length === 0) {
    console.log("No device shift found.");
    return;
  }

  for (const {
    id,
    device,
    driver,
    resend_time,
    commandOn,
    commandOff,
    command_option,
    is_extended,
    extend_time,
  } of shifts) {
    const parsedDevice = JSON.parse(device);
    const parsedDriver =
      typeof driver === "string" ? JSON.parse(driver) : driver;
    const parsedResendTime = JSON.parse(resend_time);
    const shiftDetailsArray = parsedDriver.shift_details;
    let executeCommand = command_option === "force" ? true : false;

    if (!shiftDetailsArray || shiftDetailsArray.length === 0) {
      console.log("No shift details found for device:", parsedDevice.flespiId);
      return;
    }

    for (const shiftBlock of shiftDetailsArray) {
      const { dates, shift } = shiftBlock;

      const graceMinutes = shift?.grace_time;
      const allDates = expandDates(dates);

      for (const date of allDates) {
        let shiftStart = applyGraceTime(
          shift?.start_time,
          graceMinutes,
          "subtract"
        ).format("HH:mm:ss");
        let baseShiftEnd = applyGraceTime(shift?.end_time, graceMinutes, "add");

        let shiftEnd = baseShiftEnd;

        if (is_extended && extend_time) {
          shiftEnd = applyExtendTime(baseShiftEnd, extend_time);
        }

        const shiftEndStr = shiftEnd?.format("HH:mm:ss");

        const ttlStartTime = dayjs(`${date}T${shiftStart}`);
        const ttlEndTime = dayjs(`${date}T${shiftEndStr}`);
        const ttlInSeconds = ttlEndTime.diff(ttlStartTime, "second");

        const cronStart = getCronFromDateTime(date, shiftStart);
        const cronEnd = getCronFromDateTime(date, shiftEndStr);

        // console.log(cronStart);
        // console.log(cronEnd);

        const startKey = getJobKey(parsedDevice.flespiId, "start", date);
        const endKey = getJobKey(parsedDevice.flespiId, "end", date);

        clearExistingJobsForDeviceShift(parsedDevice.flespiId, date);

        const startJob = new CronJob(cronStart, async () => {
          try {
            const body = [
              {
                name: "custom",
                properties: { text: commandOn },
                ttl: ttlInSeconds,
              },
            ];

            const response = await sendCommandToFlespiDevice(
              parsedDevice.flespiId,
              body
            );
            const success = response?.result?.[0];

            let bodyForReport = {
              device: { id: parsedDevice.flespiId, name: parsedDevice.name },
              driver: parsedDriver.name,
              shiftStart: shift?.start_time,
              shiftEnd: shift?.end_time,
              graceTime: graceMinutes,
            };

            await createOrUpdateAttendanceReport(
              bodyForReport,
              parsedDevice.flespiId,
              "create"
            );

            await cron_logs({
              device_id: parsedDevice.flespiId,
              device_name: parsedDevice.name,
              cron_type: "cronStart",
              cron_expression: cronStart,
              scheduled_time: new Date(`${date}T${shiftStart}`),
              status: success ? "success" : "failed",
              notes: success
                ? `[${dayjs().format()}] Shift Started for Device: ${
                    parsedDevice.name
                  } Driver: ${parsedDriver.name}`
                : `[${dayjs().format()}] Start Command Failed: ${
                    parsedDevice.name
                  }`,
            });

            cronEmitter.emit("cronSaved", {
              loaded: true,
            });

            console.log(
              success
                ? `[${dayjs().format()}] Shift Started for Device: ${
                    parsedDevice.name
                  } Driver: ${parsedDriver.name}`
                : `[${dayjs().format()}] Start Command Failed: ${
                    parsedDevice.name
                  }`
            );
          } catch (error) {
            console.error("Start Job Error:", error.message);
          } finally {
            startJob.stop();
            scheduledJobs.delete(startKey);
          }
        });

        startJob.start();
        scheduledJobs.set(startKey, startJob);

        const endJob = new CronJob(cronEnd, async () => {
          try {
            const deviceStatus = await flespiDevicesConnectionStatus(
              parsedDevice.flespiId
            );
            const ignitionStatus = await flespiDevicesIgnitionStatus(
              parsedDevice.flespiId
            );

            const ignitionValue =
              ignitionStatus?.result[0]?.telemetry?.din?.value;
            const isConnected = deviceStatus?.result[0]?.connected;

            if ([0, 1, 4, 5].includes(ignitionValue) && isConnected) {
              const body = [
                { name: "custom", properties: { text: commandOff } },
              ];
              const response = await instantExecutionCommand(
                parsedDevice.flespiId,
                body
              );

              const success = response?.result?.[0];

              const lockTimestamp = dayjs();
              const lastIgnitionOn = await getLastIgnitionEventBefore(
                parsedDevice.flespiId,
                "ignition on",
                lockTimestamp.toDate()
              );
              const lastIgnitionOff = await getLastIgnitionEventBefore(
                parsedDevice.flespiId,
                "ignition off",
                lockTimestamp.toDate()
              );

              const lastOnTime = lastIgnitionOn
                ? dayjs(lastIgnitionOn.createdAt).format("HH:mm:ss")
                : null;
              const lastOffTime = lastIgnitionOff
                ? dayjs(lastIgnitionOff.createdAt).format("HH:mm:ss")
                : null;
              let shiftEndStatus = "";

              if (lastOnTime) {
                const lastOn = dayjs(`${date}T${lastOnTime}`);
                const endTime = dayjs(`${date}T${shiftEndStr}`);
                shiftEndStatus = lastOn.isBefore(endTime)
                  ? `${endTime.diff(lastOn, "minute")} min earlier`
                  : `${lastOn.diff(endTime, "minute")} min late`;
              }

              await updateAttendanceField(
                parsedDevice.flespiId,
                date,
                "ignition_before_shift_end",
                lastOnTime
              );
              await updateAttendanceField(
                parsedDevice.flespiId,
                date,
                "ignition_off_after_shift_end",
                lastOffTime
              );
              await updateAttendanceField(
                parsedDevice.flespiId,
                date,
                "shift_end_status",
                shiftEndStatus
              );

              let noteWhenExtendedTime = `[${dayjs().format()}] Extended Shift Ended for Device: ${
                parsedDevice.name
              } with Extended Time: ${extend_time} hours Driver: ${
                parsedDriver.name
              }`;
              let noteWhenSimpleShift = `[${dayjs().format()}] Shift Ended for Device: ${
                parsedDevice.name
              } Driver: ${parsedDriver.name}`;

              await cron_logs({
                device_id: parsedDevice.flespiId,
                device_name: parsedDevice.name,
                cron_type: "cronEnd",
                cron_expression: cronEnd,
                scheduled_time: new Date(`${date}T${shiftEnd}`),
                status: success ? "success" : "failed",
                notes: success
                  ? is_extended
                    ? noteWhenExtendedTime
                    : noteWhenSimpleShift
                  : `[${dayjs().format()}] End Command Failed: ${
                      parsedDevice.name
                    }`,
              });

              if (success) {
                await nullifyExtendTime(id);
                cronEmitter.emit("cronSaved", {
                  loaded: true,
                });
              }

              console.log(
                success
                  ? `[${dayjs().format()}] Shift Ended for Device: ${
                      parsedDevice.name
                    } Driver: ${parsedDriver.name}`
                  : `[${dayjs().format()}] End Command Failed: ${
                      parsedDevice.name
                    }`
              );
            } else if ([2, 3, 6, 7].includes(ignitionValue) && isConnected) {
              console.log(
                `[${dayjs().format()}] Ignition ON, Rescheduling End for Device: ${
                  parsedDevice.name
                }`
              );

              scheduleResend({
                shiftId: id,
                deviceId: parsedDevice.flespiId,
                deviceName: parsedDevice.name,
                commandOff,
                resendTime: parsedResendTime,
                date,
              });
            } else if (!isConnected) {
              console.log(
                `[${dayjs().format()}] Device Not Connected, Rescheduling End for Device: ${
                  parsedDevice.name
                }`
              );

              scheduleResend({
                shiftId: id,
                deviceId: parsedDevice.flespiId,
                deviceName: parsedDevice.name,
                commandOff,
                resendTime: parsedResendTime,
                date,
              });
            } else {
              console.log(
                `[${dayjs().format()}] Unexpected Error Occured. Skipping command.`
              );
            }
          } catch (error) {
            console.error("End Job Error:", error.message);
          } finally {
            endJob.stop();
            scheduledJobs.delete(endKey);
            console.log(
              `[${dayjs().format()}] End Job Stopped for Device: ${
                parsedDevice.name
              }`
            );
          }
        });

        endJob.start();
        scheduledJobs.set(endKey, endJob);
      }
    }
  }
};

const refreshShiftJobs = async () => {
  const currentDateTime = dayjs().tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
  console.log(`${currentDateTime}: Refreshing shift jobs...`);
  await scheduleShiftJobs();
};

const initializeCronJobs = async () => {
  setTimeout(async () => {
    await scheduleShiftJobs();
  }, 3000);
};

initializeCronJobs();

export { scheduleShiftJobs, refreshShiftJobs, initializeCronJobs };
