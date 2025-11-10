// controllers/dashboardController.js
import { getKPIsDashboard, fetchOperationStatsForDevices } from "../../services/flespiApis.js";

export const getKPIDashboardData = async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: "Device ID is required." });
    }

    console.log(`✅ KPI Dashboard Data for Device ID ${deviceId}:`, data);
    const data = await getKPIsDashboard(deviceId);

    // ✅ Return single device KPI result
    res.json({
      device: data,
    });
  } catch (err) {
    console.error("❌ Error in getKPIDashboardData:", err.message);
    res.status(500).json({ error: err.message });
  }
};
export const getOperationStatsController = async (req, res) => {
  try {
    const { deviceIds } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid deviceIds array in request body.",
      });
    }

    // 🧮 Run Flespi calculators
    const result = await fetchOperationStatsForDevices(deviceIds, 2214462, []);

    if (!Array.isArray(result)) {
      return res.status(500).json({
        success: false,
        message: "Invalid data format from fetchOperationStatsForDevices",
      });
    }
    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in getOperationStatsController:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch operation stats.",
      error: error.message,
    });
  }
};