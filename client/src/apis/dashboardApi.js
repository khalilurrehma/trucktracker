// frontend/src/services/dashboardApi.js
import axios from "axios";

const apiUrl = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_BACKEND_URL
  : import.meta.env.VITE_PROD_BACKEND_URL;

// ✅ Fetch dashboard KPIs for a single device
export const getDashboardKPI = async (deviceId) => {
  try {
    if (!deviceId) throw new Error("Device ID is required.");

    const { data } = await axios.post(`${apiUrl}/dashboard`, { deviceId });
    return data.device; // single device KPI object
  } catch (error) {
    console.error("❌ Error fetching KPI dashboard:", error);
    throw error;
  }
};


export const fetchMultipleOperationKPIs = async (deviceIds = []) => {
  try {
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      throw new Error("Device IDs array is empty.");
    }

    console.log(`📡 Fetching KPIs for devices: ${deviceIds.join(",")}`);

    // 🧠 Backend endpoint (e.g. /api/dashboard)
    const { data } = await axios.post(`${apiUrl}/dashboard`, { deviceIds });

    // ✅ Expect backend response like: { success: true, data: [ {...}, {...} ] }
    if (!data?.data || !Array.isArray(data.data)) {
      console.warn("⚠️ Unexpected response format:", data);
      return [];
    }

    // 🧩 Normalize output
    const formatted = data.data.map((r) => ({
      deviceId: r.flespiDeviceId || r.deviceId,
      status: "fulfilled",
      data: r,
    }));

    console.log(`✅ Retrieved KPIs for ${formatted.length} devices via backend`);
    return formatted;
  } catch (error) {
    console.error(
      "❌ Error in multi-device KPI fetch:",
      error.response?.data || error.message
    );
    return [];
  }
};
