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
    // 🧠 Accept device IDs from frontend
    const { deviceIds } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid deviceIds array in request body.",
      });
    }


    // 🧮 Run Flespi calculators in parallel
    const [daily, efficiency, last10] = await Promise.allSettled([
      fetchOperationStatsForDevices(deviceIds, 2194146, [
        "dump_cycle",
        "haul_cycle",
        "load_cycle",
        "return_cycle",
      ]),
      fetchOperationStatsForDevices(deviceIds, 2194137, [
        "energy_efficiency_lm3",
        "operation_efficiency_pct",
        "operation_total_m3",
        "total_material_moved_m3",
        "material_moved_today",
        "remaining_material_m3",
        "ETA_completion_h",
        "Active_vehicles",
        "active_loaders",
        "avg_cycle_time_min",
        "avg_queue_time_min",
        "Day_productivity",
        "total_trips_today",
        "trip_productivity",
        "day_goal_achievement",
        "Total_haul_distance",
      ]),
      fetchOperationStatsForDevices(deviceIds, 2194146, [
        "dump_cycle",
        "haul_cycle",
        "load_cycle",
        "return_cycle",
      ]),
    ]);
    console.log("📊 Fetched KPI sets:", daily, efficiency, last10);

    // Helper to get fulfilled results safely
    const safe = (p) => (p.status === "fulfilled" ? p.value : []);

    const dailyData = safe(daily);
    const effData = safe(efficiency);
    const last10Data = safe(last10);

    // 🧩 Merge all calculator results per device
    const merged = deviceIds.map((id) => {
      const d1 = dailyData.find((d) => Number(d.flespiDeviceId) === Number(id)) || {};
      const d2 = effData.find((d) => Number(d.flespiDeviceId) === Number(id)) || {};
      const d3 = last10Data.find((d) => Number(d.flespiDeviceId) === Number(id)) || {};

      return {
        flespiDeviceId: id,
        ...d1,
        ...d2,
        ...d3,
      };
    });

    console.log(`✅ Successfully merged KPI results for ${merged.length} devices.`);

    // ✅ Respond to frontend
    return res.status(200).json({
      success: true,
      count: merged.length,
      data: merged,
    });
  } catch (error) {
    console.error("❌ Error in getOperationStatsController:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch operation stats.",
      error: error.message,
    });
  }
};