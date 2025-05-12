import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import axios from "axios";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const convertISODate = (isoDate) => {
  if (!isoDate) return "Invalid Date";

  return new Date(isoDate).toLocaleString("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export const formatTime = (date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

export const StartEndFormatTime = (date, isGraceTme = false) => {
  if (!date) return null;

  if (isGraceTme) {
    return date.toTimeString().split(" ")[0];
  }
  const options = { year: "numeric", month: "short", day: "numeric" };
  const formattedDate = date.toLocaleDateString("en-US", options);

  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };

  const formattedTime = date.toLocaleTimeString("en-US", timeOptions);

  return { formattedDate, formattedTime };
};

export const getResendTimeData = (date) => {
  if (!(date instanceof Date)) return null;

  date.setSeconds(0);
  date.setMilliseconds(0);

  const unixTime = Math.floor(date.getTime() / 1000);

  const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: false }; // 24-hour format
  const formattedTime = date.toLocaleTimeString("en-US", timeOptions);

  return { unixTime, formattedTime };
};

export const convertToTime = (timeString) => {
  const [time, modifier] = timeString.split(" ");
  let [hours, minutes, seconds] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  const date = new Date();
  date.setHours(hours, minutes, seconds || 0);
  return date;
};
export const graceTimeConverter = (graceTime) => {
  if (!graceTime) return "N/A";

  const totalMinutes = graceTime;

  if (totalMinutes < 60) {
    return `${totalMinutes} mins`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
      return `${hours} hr${hours > 1 ? "s" : ""}`;
    } else {
      return `${hours}.${(minutes / 60).toFixed(2).slice(2, 4)} hr`;
    }
  }
};

export const queueTimeConvertor = (queueTime) => {
  if (!queueTime || queueTime <= 0) {
    return "N/A"; // Return 'N/A' for invalid or zero values
  }

  const timeInMinutes = queueTime / 60; // Convert seconds to minutes (float value)

  // Validation for exceeding an hour
  if (timeInMinutes >= 60) {
    return `${(timeInMinutes / 60).toFixed(2)} hr`; // Return as hours if >= 60 minutes
  }

  return `${timeInMinutes.toFixed(2)} min`; // Return float value in minutes
};

export function timeToMilliseconds(timeString) {
  const [time, modifier] = timeString.split(" ");
  let [hours, minutes, seconds] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 * 60 * 1000 + minutes * 60 * 1000 + (seconds || 0) * 1000;
}

export function millisecondsToTime(ms) {
  const date = new Date(ms);
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };
  return date.toLocaleTimeString("en-US", options);
}

export function calculateIntervalTime(startTime, currentTime) {
  function timeToMilliseconds(timeString) {
    const [time, modifier] = timeString.split(" ");
    let [hours, minutes, seconds] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) {
      hours += 12;
    }
    if (modifier === "AM" && hours === 12) {
      hours = 0;
    }

    return hours * 60 * 60 * 1000 + minutes * 60 * 1000 + (seconds || 0) * 1000;
  }

  const startMilliseconds = timeToMilliseconds(startTime);
  const currentMilliseconds = timeToMilliseconds(currentTime);

  let intervalMilliseconds;
  if (startMilliseconds >= currentMilliseconds) {
    intervalMilliseconds = startMilliseconds - currentMilliseconds;
  } else {
    const oneDayMilliseconds = 24 * 60 * 60 * 1000;
    intervalMilliseconds =
      startMilliseconds + (oneDayMilliseconds - currentMilliseconds);
  }

  const intervalInSeconds = Math.floor(intervalMilliseconds / 1000);

  function formatInterval(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours} hrs ${minutes} min ${seconds} sec`;
  }

  // Return both formats
  return {
    inSeconds: intervalInSeconds,
    hrsFormat: formatInterval(intervalMilliseconds),
  };
}

const dateToTimeString = (date) =>
  date.toLocaleTimeString("en-US", { hour12: true });

const timeStringToMilliseconds = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    console.error("Invalid grace time string:", timeStr);
    return 0;
  }
  return (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
};

export const adjustTimes = (startTimeStr, endTimeStr, graceTimeStr) => {
  const timeStringToDate = (timeStr) => {
    if (!timeStr) return null;
    const [time, meridian] = timeStr?.split(" ");
    let [hours, minutes, seconds] = time.split(":").map(Number);
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return new Date(1970, 0, 1, hours, minutes, seconds);
  };

  if (graceTimeStr?.includes("AM") || graceTimeStr?.includes("PM")) {
    graceTimeStr = graceTimeStr?.split(" ")[0];
  }

  const graceMs = timeStringToMilliseconds(graceTimeStr || "00:00:00");
  const startTime = timeStringToDate(startTimeStr);
  const endTime = timeStringToDate(endTimeStr);

  if (!startTime || !endTime) {
    console.error("Invalid start or end time provided");
    return { newStartTime: "Invalid Date", newEndTime: "Invalid Date" };
  }

  const newStartTime = new Date(startTime.getTime() - graceMs);
  const newEndTime = new Date(endTime.getTime() + graceMs);

  return {
    newStartTime: dateToTimeString(newStartTime),
    newEndTime: dateToTimeString(newEndTime),
  };
};

export const getDayRangeString = (startDay, endDay) => {
  const startIdx = daysOfWeek.indexOf(startDay.name);
  const endIdx = daysOfWeek.indexOf(endDay.name);

  let daysRange = [];
  if (startIdx <= endIdx) {
    daysRange = daysOfWeek.slice(startIdx, endIdx + 1);
  } else {
    daysRange = [
      ...daysOfWeek.slice(startIdx),
      ...daysOfWeek.slice(0, endIdx + 1),
    ];
  }

  return daysRange.map((day) => day.substring(0, 3)).join(", ");
};

export const calculateTimeLeft = (startTime, timeZone) => {
  const systemTime = dayjs().tz(timeZone); // Current time in user's time zone

  // Get today's date in YYYY-MM-DD format
  let shiftDate = systemTime.format("YYYY-MM-DD");

  // Combine today's date with shift start time
  let shiftTime = dayjs.tz(
    `${shiftDate} ${startTime}`,
    "YYYY-MM-DD hh:mm:ss A",
    timeZone
  );

  // If the shift time is already in the past today, set it for tomorrow
  if (shiftTime.isBefore(systemTime)) {
    shiftDate = systemTime.add(1, "day").format("YYYY-MM-DD");
    shiftTime = dayjs.tz(
      `${shiftDate} ${startTime}`,
      "YYYY-MM-DD hh:mm:ss A",
      timeZone
    );
  }

  const diff = shiftTime.diff(systemTime, "seconds");

  if (diff <= 0) {
    return "Shift Started";
  }

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
};

export const formatColumnName = (colName) => {
  return colName
    .split(".")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const formatUnixTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";

  const parsedTimestamp = Number(timestamp);

  const date = new Date(
    parsedTimestamp * (parsedTimestamp > 9999999999 ? 1 : 1000)
  );

  return date.toLocaleString("en-US", { timeZone: "America/New_York" });
};

export const convertToDayjsTime = (timeStr) => {
  const [time, modifier] = timeStr.split(" ");
  const [hours, minutes, seconds] = time.split(":");

  let hour = parseInt(hours);
  if (modifier === "PM" && hour !== 12) hour += 12;
  if (modifier === "AM" && hour === 12) hour = 0;

  return new Date(1970, 0, 1, hour, minutes, seconds || 0);
};

export const convertMinutesToDayjs = (minutes) => {
  const date = new Date(1970, 0, 1);
  date.setMinutes(minutes);
  return date;
};

export const formatDateTime = (date, time) => {
  if (!date || !time) return null;
  return `${dayjs(date).format("YYYY-MM-DD")} ${time}`;
};

export function getAuthenticatedAudioUrl(originalUrl) {
  const authKey = import.meta.env.authKey;

  if (!originalUrl) return null;

  return originalUrl.replace("/notificationsaudio", `/${authKey}`);
}

export function generateCaseNumber() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const getDistrictFromCoordinates = async (lat, lng) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API;

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=administrative_area_level_2&key=${apiKey}`
    );

    if (response.data.status === "OK" && response.data.results.length > 0) {
      const components = response.data.results[0].address_components;
      const district = components.find((comp) =>
        comp.types.includes("administrative_area_level_2")
      );
      return district ? district.long_name : "Unknown";
    } else {
      return "Unknown";
    }
  } catch (error) {
    console.error("Error fetching district:", error.message);
    return "Unknown";
  }
};
