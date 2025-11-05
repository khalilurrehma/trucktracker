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
