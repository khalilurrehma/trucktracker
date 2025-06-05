import axios from "axios";
import dayjs from "dayjs";
const traccarBearerToken = process.env.TraccarToken;
const traccarApiUrl = `http://${process.env.TraccarPort}/api`;
const flespiToken = process.env.FlespiToken;
const flespiApiUrl = `https://flespi.io/gw`;

export const dayHelper = dayjs();

export function formatTimeISO(dateString) {
  const date = new Date(dateString);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  const day = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const dateStr = `${day} ${month} ${date.getUTCDate()} ${year}`;
  const timeStr = date.toLocaleTimeString("en-US", { hour12: false });
  return `${dateStr} ${timeStr}`;
}

export function getAllUniqueIds(data) {
  const uniqueIdsArray = Object.values(data).map((item) => item.uniqueId);
  return uniqueIdsArray;
}

export const parseGeofence = (areaString) => {
  let cleanedString, type;
  try {
    if (areaString?.startsWith("POLYGON")) {
      cleanedString = areaString.replace("POLYGON ((", "").replace("))", "");
      type = "polygon";
    } else if (areaString?.startsWith("LINESTRING")) {
      cleanedString = areaString.replace("LINESTRING (", "").replace(")", "");
      type = "corridor";
    } else {
      throw new Error("Invalid WKT format");
    }

    const coordinates = cleanedString.split(", ").map((pair) => {
      const [lat, lon] = pair.split(" ").map(Number);
      return { lat, lon };
    });

    return { type, coordinates };
  } catch (error) {
    console.error("Error parsing geofence:", error.message);
    return [];
  }
};

export const deleteGroupFromTraccar = async (groupId) => {
  try {
    await axios.delete(`${traccarApiUrl}/groups/${groupId}`, {
      headers: {
        Authorization: `Bearer ${traccarBearerToken}`,
      },
    });
  } catch (error) {
    console.error(`Traccar delete error for group ${groupId}:`, error.message);
    throw error;
  }
};

export const deleteGroupFromFlespi = async (groupId) => {
  try {
    await axios.delete(`${flespiApiUrl}/groups/${groupId}`, {
      headers: {
        Authorization: flespiToken,
      },
    });
  } catch (error) {
    console.error(`Flespi delete error for group ${groupId}:`, error.message);
    throw error;
  }
};
export const deleteGeofencesFromTraccar = async (geofenceId) => {
  try {
    await axios.delete(`${traccarApiUrl}/geofences/${geofenceId}`, {
      headers: {
        Authorization: `Bearer ${traccarBearerToken}`,
      },
    });
  } catch (error) {
    console.error(
      `Traccar delete error for group ${geofenceId}:`,
      error.message
    );
    throw error;
  }
};

export const deleteGeofencesFromFlespi = async (geofenceId) => {
  try {
    await axios.delete(`${flespiApiUrl}/geofences/${geofenceId}`, {
      headers: {
        Authorization: flespiToken,
      },
    });
  } catch (error) {
    console.error(
      `Flespi delete error for group ${geofenceId}:`,
      error.message
    );
    throw error;
  }
};
export const getAverageServiceTime = (secondsArray) => {
  if (!Array.isArray(secondsArray) || secondsArray.length === 0) return null;

  const total = secondsArray.reduce((sum, sec) => sum + sec, 0);
  const averageSeconds = total / secondsArray.length;

  const minutes = Math.floor(averageSeconds / 60);
  const hours = Math.floor(averageSeconds / 3600);

  if (hours >= 1) {
    const remainingMinutes = Math.round((averageSeconds % 3600) / 60);
    return `${hours}h ${remainingMinutes}m`;
  } else {
    return `${minutes}m`;
  }
};
