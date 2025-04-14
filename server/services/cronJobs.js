import { CronJob } from "cron";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import LocalizedFormat from "dayjs/plugin/localizedFormat.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { getDeviceShift } from "../model/usageControl.js";
import {
  flespiDevicesIgnitionStatus,
  instantExecutionCommand,
  sendCommandToFlespiDevice,
  telemetryDoutStatus,
} from "./flespiApis.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(LocalizedFormat);

/**
 * Adjusts the given time by a grace period.
 * @param {string} timeString - Original time (e.g., "09:00:00 PM").
 * @param {string} graceString - Grace period (e.g., "01:00:00").
 * @param {string} operation - "add" or "subtract".
 * @returns {string} - Adjusted time in "HH:mm:ss" format.
 */

const TIMEZONE = "Asia/Karachi";

const activeJobs = new Map();

const applyGraceTime = (timeString, graceTimeInMinutes, operation) => {
  try {
    if (!timeString || graceTimeInMinutes === undefined)
      throw new Error("Invalid input");

    const originalTime = dayjs(timeString, "hh:mm:ss A");

    const graceTotalSeconds = graceTimeInMinutes * 60;

    const adjustedTime =
      operation === "subtract"
        ? originalTime.subtract(graceTotalSeconds, "seconds")
        : originalTime.add(graceTotalSeconds, "seconds");

    return adjustedTime.format("HH:mm:ss");
  } catch (error) {
    console.error("Error in applyGraceTime:", error.message);
    return "00:00:00";
  }
};

const cronFormat = (timeString) => {
  if (!timeString) return "* * * * *";

  const hasAmPm = /am|pm/i.test(timeString);
  let hour, minute, second;

  if (hasAmPm) {
    const [time, period] = timeString.split(" ");
    [hour, minute, second] = time.split(":").map(Number);
    let cronHour = hour % 12;
    if (period.toLowerCase() === "pm") cronHour += 12;
    if (period.toLowerCase() === "am" && hour === 12) cronHour = 0;
    return `${second} ${minute} ${cronHour} * * *`;
  } else {
    [hour, minute, second] = timeString.split(":").map(Number);
    return `${second} ${minute} ${hour} * * *`;
  }
};

const resendTimeCronFormat = (timeString) => {
  if (!timeString) return "* * * * *";

  const [hours, minutes] = timeString.split(":").map(Number);

  if (hours > 0) {
    return `0 0 ${hours} * * *`;
  }

  const currentDate = new Date();
  currentDate.setMinutes(currentDate.getMinutes() + minutes);
  const cronMinutes = currentDate.getMinutes();
  const cronHours = currentDate.getHours();

  return `0 ${cronMinutes} ${cronHours} * * *`;
};

const graceTimeFormat = (graceTimeString) => {
  if (!graceTimeString) return "* * * * *";

  const [time, period] = graceTimeString.split(" ");

  return time;
};

const resendTimers = new Map();

const scheduleShiftJobs = async () => {
  const shift = await getDeviceShift();

  shift.forEach(({ device, driver, resend_time, commandOn, commandOff }) => {
    const parsedDriver = JSON.parse(driver);
    const parsedDevice = JSON.parse(device);
    const parsedResendTime = JSON.parse(resend_time);

    const shiftDetails = parsedDriver.shift_details;

    shiftDetails.forEach((detail) => {
      const { shift, dates } = detail;
      const { start_time, end_time, grace_time } = shift;

      const shiftStart = applyGraceTime(start_time, grace_time, "subtract");
      const shiftEnd = applyGraceTime(end_time, grace_time, "add");

      dates.forEach(([startDate, endDate]) => {
        const start = dayjs(startDate);
        const end = dayjs(endDate);

        const daysBetween = end.diff(start, "day");

        console.log(daysBetween);

        for (let i = 0; i <= daysBetween; i++) {
          const currentDate = start.add(i, "day").format("YYYY-MM-DD");
          const startDateTime = `${currentDate} ${shiftStart}`;
          const endDateTime = `${currentDate} ${shiftEnd}`;

          console.log(startDateTime, endDateTime);
        }
      });
    });

    // const key = `${parsedDevice.flespiId}_${parsedShift.id}`;

    // if (activeJobs.has(key)) {
    //   const { startJob, endJob } = activeJobs.get(key);
    //   startJob?.stop();
    //   endJob?.stop();
    //   activeJobs.delete(key);
    // }

    // const startJob = new CronJob(cronStart, async () => {
    //   const currentDateTime = dayjs()
    //     .tz(TIMEZONE)
    //     .format("YYYY-MM-DD HH:mm:ss");
    //   try {
    //     const body = [
    //       { name: "custom", properties: { text: commandOn }, ttl: 84600 },
    //     ];
    //     const response = await sendCommandToFlespiDevice(
    //       parsedDevice.flespiId,
    //       body
    //     );

    //     if (response?.result?.[0]) {
    //       console.log(
    //         `${currentDateTime}: Shift Started for Device: ${parsedDevice.name}`
    //       );
    //     } else {
    //       console.error(
    //         `Command failed for Device: ${parsedDevice.name}, Reason: ${
    //           response?.errors?.[0]?.reason || "Unknown error"
    //         }`
    //       );
    //     }
    //   } catch (error) {
    //     console.error("Start Job Error:", error.message);
    //     if (error.response) console.error("API Error:", error.response.data);
    //   }
    //   startJob.stop();
    // });

    // const endJob = new CronJob(cronEnd, async () => {
    //   const currentDateTime = dayjs()
    //     .tz(TIMEZONE)
    //     .format("YYYY-MM-DD HH:mm:ss");

    //   try {
    //     const ignitionStatus = await flespiDevicesIgnitionStatus(
    //       parsedDevice.flespiId
    //     );
    //     const ignitionValue = ignitionStatus.result[0]?.telemetry?.din?.value;

    //     if ([0, 1, 4, 5].includes(ignitionValue)) {
    //       console.log(
    //         `${currentDateTime}: Ignition OFF for Device: ${parsedDevice.name}, value: ${ignitionValue}`
    //       );
    //       const body = [{ name: "custom", properties: { text: commandOff } }];
    //       const response = await instantExecutionCommand(
    //         parsedDevice.flespiId,
    //         body
    //       );
    //       if (response?.result?.[0]) {
    //         console.log(
    //           `${currentDateTime}: Shift Ended for Device: ${parsedDevice.name}: Response: ${response.result[0].response}`
    //         );
    //       }
    //     } else if ([2, 3, 6, 7].includes(ignitionValue)) {
    //       console.log(
    //         `${currentDateTime}: Ignition ON for ${parsedDevice.name}. Will retry at resend time...`
    //       );

    //       if (resendTimers.has(key)) {
    //         clearTimeout(resendTimers.get(key));
    //         console.log(
    //           `Cleared existing resend timer for ${parsedDevice.name}`
    //         );
    //       }

    //       const [hours, minutes] = parsedResendTime.formattedTime
    //         .split(":")
    //         .map(Number);
    //       const delayInMs = (hours * 60 + minutes) * 60 * 1000;

    //       const resendTimer = setTimeout(async () => {
    //         const resendTimeNow = dayjs()
    //           .tz(TIMEZONE)
    //           .format("YYYY-MM-DD HH:mm:ss");

    //         try {
    //           const latestStatus = await flespiDevicesIgnitionStatus(
    //             parsedDevice.flespiId
    //           );
    //           const latestValue = latestStatus.result[0]?.telemetry?.din?.value;

    //           console.log(
    //             `${resendTimeNow}: Retrying shutdown for ${parsedDevice.name}, value: ${latestValue}`
    //           );
    //           const body = [
    //             { name: "custom", properties: { text: commandOff } },
    //           ];
    //           const response = await instantExecutionCommand(
    //             parsedDevice.flespiId,
    //             body
    //           );
    //           if (response?.result?.[0]) {
    //             console.log(
    //               `${resendTimeNow}: Resend command sent to ${parsedDevice.name}`
    //             );
    //           }
    //         } catch (err) {
    //           console.error(
    //             `${resendTimeNow}: Resend failed for ${parsedDevice.name} -`,
    //             err.message
    //           );
    //         } finally {
    //           resendTimers.delete(key);
    //         }
    //       }, delayInMs);

    //       resendTimers.set(key, resendTimer);
    //       console.log(
    //         `Scheduled resend for ${parsedDevice.name} in ${parsedResendTime.minutes} minute(s).`
    //       );
    //     }
    //   } catch (error) {
    //     console.error("End Job Error:", error.message);
    //     if (error.response) console.error("API Error:", error.response.data);
    //   }
    // });

    // startJob.start();
    // endJob.start();

    // activeJobs.set(key, { startJob, endJob });
  });
};

const verifyDevicesStatus = async () => {
  const shift = await getDeviceShift();

  if (!shift || shift.length === 0) {
    console.log("No device shift found.");
    return;
  }

  const deviceIds = shift.map(({ device }) => JSON.parse(device).flespiId);

  if (deviceIds.length === 0) return;

  const checkStatus = new CronJob("* * * * *", async () => {
    const currentDateTime = dayjs().tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
    try {
      console.log(
        `${currentDateTime}: Running device status check deviceIds: ${deviceIds}`
      );
      const doutStatusResponses = await telemetryDoutStatus(deviceIds);

      doutStatusResponses.forEach(({ id, telemetry }) => {
        if (telemetry && telemetry.dout) {
          console.log(`📡 Device ${id} Status:`, telemetry.dout?.value);
        } else {
          console.warn(`⚠️ Device ${id} has no telemetry data.`);
        }
      });
    } catch (error) {
      console.error("❌ Check Status Error:", error);
    }
  });

  checkStatus.start();
};

const refreshShiftJobs = () => {
  const loadAgain = new CronJob("*/25 * * * *", async () => {
    const currentDateTime = dayjs().tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
    console.log(`${currentDateTime}: Refreshing shift jobs...`);
    await scheduleShiftJobs();
  });

  loadAgain.start();
};

const initializeCronJobs = async () => {
  setTimeout(async () => {
    await scheduleShiftJobs();
    await verifyDevicesStatus();
    await refreshShiftJobs();
  }, 3000);
};

initializeCronJobs();
