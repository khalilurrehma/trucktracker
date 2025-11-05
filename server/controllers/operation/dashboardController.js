// controllers/dashboardController.js
import { getKPIsDashboard } from "../../services/flespiApis.js";

export const getKPIDashboardData = async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
        return res.status(400).json({ error: "Device ID is required." });
    }
    

    const data = await getKPIsDashboard(deviceId);
    // console.log(`✅ KPI Dashboard Data for Device ID ${deviceId}:`, data);

    // ✅ Return single device KPI result
    res.json({
      device: data,
    });
  } catch (err) {
    console.error("❌ Error in getKPIDashboardData:", err.message);
    res.status(500).json({ error: err.message });
  }
};
