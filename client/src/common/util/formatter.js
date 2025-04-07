import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

import {
  altitudeFromMeters,
  altitudeUnitString,
  distanceFromMeters,
  distanceUnitString,
  speedFromKnots,
  speedUnitString,
  volumeFromLiters,
  volumeUnitString,
} from "./converter";
import { prefixString } from "./stringUtils";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const formatBoolean = (value, t) =>
  value ? t("sharedYes") : t("sharedNo");

export const formatNumber = (value, precision = 1) =>
  Number(value.toFixed(precision));

export const formatPercentage = (value) => `${value}%`;

export const formatTemperature = (value) => `${value}°C`;

export const formatVoltage = (value, t) =>
  `${value} ${t("sharedVoltAbbreviation")}`;

export const formatConsumption = (value, t) =>
  `${value} ${t("sharedLiterPerHourAbbreviation")}`;

export const formatTime = (value, format, hours12) => {
  if (value) {
    const d = dayjs(value);
    switch (format) {
      case "date":
        return d.format("YYYY-MM-DD");
      case "time":
        return d.format(hours12 ? "hh:mm:ss A" : "HH:mm:ss");
      case "minutes":
        return d.format(hours12 ? "YYYY-MM-DD hh:mm A" : "YYYY-MM-DD HH:mm");
      default:
        return d.format(
          hours12 ? "YYYY-MM-DD hh:mm:ss A" : "YYYY-MM-DD HH:mm:ss"
        );
    }
  }
  return "";
};

export const formatStatus = (value, t) =>
  t(prefixString("deviceStatus", value));
export const formatAlarm = (value, t) =>
  value ? t(prefixString("alarm", value)) : "";

export const formatCourse = (value) => {
  const courseValues = [
    "\u2191",
    "\u2197",
    "\u2192",
    "\u2198",
    "\u2193",
    "\u2199",
    "\u2190",
    "\u2196",
  ];
  let normalizedValue = (value + 45 / 2) % 360;
  if (normalizedValue < 0) {
    normalizedValue += 360;
  }
  return courseValues[Math.floor(normalizedValue / 45)];
};

export const formatDistance = (value, unit, t) =>
  `${distanceFromMeters(value, unit).toFixed(2)} ${distanceUnitString(
    unit,
    t
  )}`;

export const formatAltitude = (value, unit, t) =>
  `${altitudeFromMeters(value, unit).toFixed(2)} ${altitudeUnitString(
    unit,
    t
  )}`;

export const formatSpeed = (value, unit, t) =>
  `${speedFromKnots(value, unit).toFixed(2)} ${speedUnitString(unit, t)}`;

export const formatVolume = (value, unit, t) =>
  `${volumeFromLiters(value, unit).toFixed(2)} ${volumeUnitString(unit, t)}`;

export const formatHours = (value) => dayjs.duration(value).humanize();

export const formatNumericHours = (value, t) => {
  const hours = Math.floor(value / 3600000);
  const minutes = Math.floor((value % 3600000) / 60000);
  return `${hours} ${t("sharedHourAbbreviation")} ${minutes} ${t(
    "sharedMinuteAbbreviation"
  )}`;
};

export const formatCoordinate = (key, value, unit) => {
  let hemisphere;
  let degrees;
  let minutes;
  let seconds;

  if (key === "latitude") {
    hemisphere = value >= 0 ? "N" : "S";
  } else {
    hemisphere = value >= 0 ? "E" : "W";
  }

  switch (unit) {
    case "ddm":
      value = Math.abs(value);
      degrees = Math.floor(value);
      minutes = (value - degrees) * 60;
      return `${degrees}° ${minutes.toFixed(6)}' ${hemisphere}`;
    case "dms":
      value = Math.abs(value);
      degrees = Math.floor(value);
      minutes = Math.floor((value - degrees) * 60);
      seconds = Math.round((value - degrees - minutes / 60) * 3600);
      return `${degrees}° ${minutes}' ${seconds}" ${hemisphere}`;
    default:
      return `${value.toFixed(6)}°`;
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case "online":
      return "success";
    case "offline":
      return "error";
    case "unknown":
    default:
      return "neutral";
  }
};

export const getBatteryStatus = (batteryLevel) => {
  if (batteryLevel >= 70) {
    return "success";
  }
  if (batteryLevel > 30) {
    return "warning";
  }
  return "error";
};

export const formatNotificationTitle = (t, notification, includeId) => {
  let title = t(prefixString("event", notification.type));
  if (notification.type === "alarm") {
    const alarmString = notification.attributes.alarms;
    if (alarmString) {
      const alarms = alarmString.split(",");
      if (alarms.length > 1) {
        title += ` (${alarms.length})`;
      } else {
        title += ` ${formatAlarm(alarms[0], t)}`;
      }
    }
  }
  if (includeId) {
    title += ` [${notification.id}]`;
  }
  return title;
};

export function formatTimestamp(timestamp) {
  const timestampMilliseconds = timestamp * 1000; // Convert to milliseconds
  const date = new Date(timestampMilliseconds); // Create a Date object

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const day = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  const formattedDate = `${day} ${month} ${date.getUTCDate()} ${year} ${hours}:${minutes}`;
  return formattedDate;
}
export function formatDate(inputDate) {
  const date = new Date(inputDate);

  // Format as dd-mm-yyyy
  const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${date.getFullYear()}`;

  // Format as dd-mm-yyyy hh:mm
  const formattedDateTime = `${formattedDate} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  return { formattedDate, formattedDateTime };
}

export function formatDDMY(timestamp) {
  const timestampMilliseconds = timestamp * 1000;

  const date = new Date(timestampMilliseconds);

  date.setUTCHours(date.getUTCHours() - 5);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const day = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  const formattedDate = `${day} ${month} ${date.getUTCDate()} ${year}`;

  return formattedDate;
}

export function formatDMY(timestamp) {
  const timestampMilliseconds = timestamp * 1000;

  const date = new Date(timestampMilliseconds);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  const formattedDMY = `${day}-${month}-${year}`;

  return formattedDMY;
}

export function formatHoursToTime(decimalHours) {
  const hours = Math.floor(decimalHours);
  const minutesDecimal = (decimalHours - hours) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.floor((minutesDecimal - minutes) * 60);

  const formattedTime = `${hours} hr ${minutes} min ${seconds} sec`;
  return formattedTime;
}

export function getRegionFullName(regionCode) {
  const uppercasedRegionCode = regionCode.toUpperCase();
  if (regionMapping.hasOwnProperty(uppercasedRegionCode)) {
    return regionMapping[uppercasedRegionCode];
  } else {
    return regionCode;
  }
}

export function convertMinutesToSeconds(minutes) {
  return Math.round(minutes * 60);
}

export function addUnits(column, item) {
  const value = item[column];
  if (value === null || value === undefined || value === "") {
    return "null";
  }

  switch (column) {
    case "radius":
      if (value < 1000) {
        return `${value} m`;
      } else {
        return `${(value / 1000).toFixed(2)} km`;
      }
    case "phone":
      if (value.length === 11) {
        const areaCode = value.slice(0, 2);
        const firstPart = value.slice(2, 5);
        const secondPart = value.slice(5, 8);
        const fourtPart = value.slice(8, 11);
        return `(${areaCode}) ${firstPart}-${secondPart}-${fourtPart}`;
      }
      return value;
    case "total_mileage":
    case "odometer_start":
    case "odometer_end":
    case "odometer_total":
    case "total.mileage":
    case "odometer.start":
    case "odometer.end":
    case "odometer.total":
    case "odometer":
    case "distance.can":
    case "distance_can":
      return `${item[column]} km`;
    case "avg_speed":
    case "max_speed":
    case "avg.speed":
    case "max.speed":
      return `${item[column]} km/h`;
    case "flespi_region":
    case "flespi.region":
      return getRegionFullName(value);
    case "work_hours":
    case "stop_hours":
    case "motion_hours":
    case "idle_hours":
    case "work.hours":
    case "stop.hours":
    case "motion.hours":
    case "idle.hours":
      return formatHoursToTime(item[column]);
    // return `${item[column]} minutes`;
    case "duration":
    case "duration_minutes":
    case "duration.minutes":
      const minutes = item[column];
      const seconds = convertMinutesToSeconds(minutes);
      return `${seconds} seconds`;
    case "fuel_after":
    case "fuel_before":
    case "fuel_delta":
    case "fuel_start":
    case "fuel_end":
    case "fuel_total_day":
    case "trip_fuel_consumed":
    case "fuel.after":
    case "fuel.before":
    case "fuel.delta":
    case "fuel.start":
    case "fuel.end":
    case "fuel.total.day":
    case "trip.fuel.consumed":
      return `${item[column]} gl`;
    case "can_trip_max_rpm":
    case "can.trip.max.rpm":
      return `${item[column]} rpm`;
    case "end":
    case "begin":
      return formatDDMY(item[column]);
    case "created":
    case "flespi_created":
    case "flespi.created":
    case "timestamp":
      return formatTimestamp(item[column]);
    case "ssl_value":
    case "ssl.value":
    case "operator":
    case "traccar_disabled":
    case "traccar.disabled":
    case "disabled":
      return item[column] === 1 ? "True" : "False";
    case "device_name":
    case "device.name":
      return item.device_name && item.device_name.trim() !== ""
        ? item.device_name.slice(0, 16)
        : "unknown";
    case "server_key":
    case "server.key":
      return item[column] ? item[column].slice(0, 12) : "";
    default:
      return item[column];
  }
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 300;
export const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 100 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const regionMapping = {
  US: "United States",
  CA: "Canada",
  UK: "United Kingdom",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  JP: "Japan",
  CN: "China",
  IN: "India",
  AU: "Australia",
  BR: "Brazil",
  MX: "Mexico",
  RU: "Russia",
  ZA: "South Africa",
  EU: "Europ",
};
