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

const applyGraceTime = (timeString, graceString, operation) => {
  try {
    if (!timeString || !graceString) throw new Error("Invalid input");

    const originalTime = dayjs(timeString, "hh:mm:ss A");

    const [graceHour, graceMinute, graceSecond] = graceString
      .split(":")
      .map(Number);
    const graceTotalSeconds = graceHour * 3600 + graceMinute * 60 + graceSecond;

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

  const [hours, minutes, seconds] = timeString.split(":").map(Number);

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

const currentDateTime = dayjs().tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss");

const scheduleShiftJobs = async () => {
  const shift = await getDeviceShift();

  shift.forEach(({ device, shift, resend_time, commandOn, commandOff }) => {
    const parsedShift = JSON.parse(shift);
    const parsedDevice = JSON.parse(device);
    const parsedResendTime = JSON.parse(resend_time);
    const formattedGraceTime = graceTimeFormat(parsedShift?.grace_time);

    const shiftStart = applyGraceTime(
      parsedShift?.start_time,
      formattedGraceTime,
      "subtract"
    );
    const shiftEnd = applyGraceTime(
      parsedShift?.end_time,
      formattedGraceTime,
      "add"
    );

    const cronStart = cronFormat(shiftStart);
    const cronEnd = cronFormat(shiftEnd);
    const resendTimeCron = resendTimeCronFormat(parsedResendTime.formattedTime);

    const startJob = new CronJob(cronStart, async () => {
      try {
        const body = [
          { name: "custom", properties: { text: commandOn }, ttl: 84600 },
        ];
        const response = await sendCommandToFlespiDevice(
          // parsedDevice.flespiId,
          parsedDevice.flespiId,
          body
        );

        if (response?.result?.[0]) {
          console.log(
            `${currentDateTime}: Shift Started for Device: ${parsedDevice.flespiId}`
          );
        } else {
          console.error(
            `Command failed for Device: ${parsedDevice.flespiId}, Reason: ${
              response?.errors?.[0]?.reason || "Unknown error"
            }`
          );
        }
      } catch (error) {
        console.error("Start Job Error:", error.message);
        if (error.response) {
          console.error("API Error:", error.response.data);
        }
      }
    });

    const endJob = new CronJob(cronEnd, async () => {
      let body;
      try {
        const ignitionStatus = await flespiDevicesIgnitionStatus(
          parsedDevice.flespiId
        );

        let ignitionValue = ignitionStatus.result[0]?.telemetry?.din?.value;
        // if ignition value is 0,1,4,5 then ignition is off, we will simply send command.
        // if ignition is ON then we will send command after resend time ends
        if ([0, 1, 4, 5].includes(ignitionValue)) {
          console.log(
            `${currentDateTime}: Ignition status is OFF for Device: ${parsedDevice.flespiId}, Ignition value: ${ignitionValue}`
          );
          try {
            body = [{ name: "custom", properties: { text: commandOff } }];
            const response = await instantExecutionCommand(
              parsedDevice.flespiId,
              body
            );

            if (response?.result?.[0]?.executed === true) {
              console.log(
                `${currentDateTime}: Shift Ended for Device: ${parsedDevice.flespiId}: Command response: ${response.result[0].response}`
              );
            } else {
              console.error(
                `Command failed for Device: ${parsedDevice.flespiId}, Reason: ${
                  response?.result?.[0]?.response || "Unknown error"
                }`
              );
            }
          } catch (error) {
            if (error.response) {
              console.error("API Error:", error.response.data);
            }
          }
        } else if ([2, 3, 6, 7].includes(ignitionValue)) {
          console.log(
            `${currentDateTime}: Ignition status is ON for Device: ${parsedDevice.flespiId}, Ignition value: ${ignitionValue}`
          );
          console.log(
            `${currentDateTime}: Setting up resend time for Device: ${parsedDevice.flespiId}`
          );

          const resendJob = new CronJob(resendTimeCron, async () => {
            console.log(
              `${currentDateTime}: Resend time reached for Device: ${parsedDevice.flespiId}`
            );

            const latestIgnitionStatus = await flespiDevicesIgnitionStatus(
              parsedDevice.flespiId
            );
            const latestIgnitionValue =
              latestIgnitionStatus.result[0]?.telemetry?.din?.value;

            console.log(
              `${currentDateTime}: Shutting down device with ID: ${parsedDevice.flespiId}, Ignition value: ${latestIgnitionValue}`
            );
            try {
              body = [{ name: "custom", properties: { text: commandOff } }];
              const response = await instantExecutionCommand(
                parsedDevice.flespiId,
                body
              );
              if (response?.result?.[0]?.executed === true) {
                console.log(
                  `${currentDateTime}: Shift Ended for Device: ${parsedDevice.flespiId}: Command response: ${response.result[0].response}`
                );
              } else {
                console.error(
                  `Command failed for Device: ${
                    parsedDevice.flespiId
                  }, Reason: ${
                    response?.result?.[0]?.response || "Unknown error"
                  }`
                );
              }
            } catch (error) {
              if (error.response) {
                console.error("API Error:", error.response.data);
              }
            }
            resendJob.stop();
          });

          resendJob.start();
        }
      } catch (error) {
        console.error("Start Job Error:", error.message);
        if (error.response) {
          console.error("API Error:", error.response.data);
        }
      }
    });

    startJob.start();
    endJob.start();
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

const refreshShiftJobs = new CronJob("0 * * * *", async () => {
  console.log(`${currentDateTime}: Refreshing shift jobs...`);
  await scheduleShiftJobs();
});

// refreshShiftJobs.start();

const initializeCronJobs = async () => {
  setTimeout(async () => {
    await scheduleShiftJobs();
    await verifyDevicesStatus();
  }, 3000);
};

initializeCronJobs();
