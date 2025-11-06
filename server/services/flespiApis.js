import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const FlespiToken = process.env.FlespiToken;
const flespiUrl = "https://flespi.io/gw";
const flespiRealmUrl = "https://flespi.io/platform";

export const getFlespiDevices = async () => {
  try {
    const { data } = await axios.get(`${flespiUrl}/devices/all`, {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
      },
    });
    return data;
  } catch (error) {
    throw error;
  }
};

export const getAllProtocols = async () => {
  try {
    const { data } = await axios.get(`${flespiUrl}/channel-protocols/all`, {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
      },
    });
    return data;
  } catch (error) {
    throw error;
  }
};

export const getFlespiDeviceTypes = async () => {
  const apiUrl = `https://flespi.io/gw/channel-protocols/all/device-types/all?fields=id%2Cprotocol_id%2Cprotocol_name%2Cname%2Ctitle`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };
  try {
    const response = await axios.get(apiUrl, { headers });

    return response.data.result;
  } catch (error) {
    throw error;
  }
};

export const devicesByTypeId = async (id) => {
  const apiUrl = `https://flespi.io/gw/devices/device_type_id=${id}`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };
  try {
    const response = await axios.get(apiUrl, { headers });

    return response.data.result;
  } catch (error) {
    throw error;
  }
};

export const getDeviceOdometer = async (device_id) => {
  const apiUrl = `https://flespi.io/gw/devices/${device_id}/telemetry/vehicle.mileage`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };
  try {
    const response = await axios.get(apiUrl, { headers });

    return response.data.result;
  } catch (error) {
    throw error;
  }
};

export const sendCommandToFlespiDevice = async (deviceId, body) => {
  const flespiStatusUrl = `https://flespi.io/gw/devices/${deviceId}/commands-queue`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(flespiStatusUrl, body, { headers });

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getFlespiDeviceLocation = async (deviceId) => {
  const apiUrl = `https://flespi.io/gw/devices/${deviceId}/telemetry/position`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };
  try {
    const response = await axios.get(apiUrl, { headers });

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const executionStatus = async (deviceId, commandId) => {
  const apiUrl = `${flespiUrl}/devices/${deviceId}/commands-result/${commandId}`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };
  try {
    const response = await axios.get(apiUrl, { headers });

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const instantExecutionCommand = async (deviceId, body) => {
  const flespiStatusUrl = `https://flespi.io/gw/devices/${deviceId}/commands`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
    "Content-Type": "application/json",
  };
  try {
    const response = await axios.post(flespiStatusUrl, body, { headers });
    return response.data;
  } catch (error) {
    console.error("Error sending instant command:", error.message);
    throw error;
  }
};

export const telemetryDoutStatus = async (deviceIds) => {
  const deviceIdParam = Array.isArray(deviceIds)
    ? deviceIds.join(",")
    : deviceIds;

  const apiUrl = `${flespiUrl}/devices/${deviceIdParam}/telemetry/dout`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };

  try {
    const response = await axios.get(apiUrl, { headers });
    return response.data.result;
  } catch (error) {
    throw error;
  }
};

export const flespiDevicesConnectionStatus = async (deviceId) => {
  const apiUrl = `${flespiUrl}/devices/${deviceId}?fields=connected`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };

  try {
    const response = await axios.get(apiUrl, { headers });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const flespiDevicesEngineIgnitionStatus = async (deviceId) => {
  const apiUrl = `${flespiUrl}/devices/${deviceId}/telemetry/engine.ignition.status`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };

  try {
    const response = await axios.get(apiUrl, { headers });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const flespiDevicesIgnitionStatus = async (deviceId) => {
  const apiUrl = `${flespiUrl}/devices/${deviceId}/telemetry/din`;
  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };

  try {
    const response = await axios.get(apiUrl, { headers });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const flespiDeviceLiveLocation = async (deviceId) => {
  const apiUrl = `${flespiUrl}/devices/${deviceId}/telemetry/position`;

  const headers = {
    Authorization: `FlespiToken ${FlespiToken}`,
  };
  try {
    const data = await axios.get(apiUrl, { headers });

    return data.data.result;
  } catch (error) {
    throw error;
  }
};

export const getDeviceTypeInfo = async (deviceTypeId) => {
  try {
    const response = await axios.get(
      `${flespiUrl}/channel-protocols/all/device-types/all`,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
        params: {
          fields: "id,name,title,protocol_id,protocol_name",
        },
      }
    );
    return response.data.result.find((dt) => dt.id === deviceTypeId);
  } catch (error) {
    throw new Error(error.response?.data || error.message);
  }
};

// Function to get devices by type
export const getDevicesByType = async (deviceTypeId) => {
  try {
    const response = await axios.get(`${flespiUrl}/devices`, {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
      },
      params: {
        fields: "id,name,configuration.ident,connected",
        device_type_id: deviceTypeId,
      },
    });
    return response.data.result;
  } catch (error) {
    throw new Error(error.response?.data || error.message);
  }
};

export const createRealm = async (cid, body) => {
  try {
    const headers = {
      Authorization: `FlespiToken ${FlespiToken}`,
    };

    if (cid) {
      headers["x-flespi-cid"] = cid;
    }

    const { data } = await axios.post(`${flespiRealmUrl}/realms`, [body], {
      headers,
    });

    return data;
  } catch (error) {
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    };
    throw errorDetails;
  }
};

export const fetchRealms = async (type) => {
  try {
    const { data } = await axios.get(`${flespiRealmUrl}/realms/${type}`, {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
      },
    });
    return data.result;
  } catch (error) {
    throw error;
  }
};

export const addRealmUser = async (body, realmId, cid) => {
  try {
    const headers = {
      Authorization: `FlespiToken ${FlespiToken}`,
    };

    if (cid) {
      headers["x-flespi-cid"] = cid;
    }
    const { data } = await axios.post(
      `${flespiRealmUrl}/realms/${realmId}/users`,
      [body],
      {
        headers,
      }
    );

    return data;
  } catch (error) {
    throw error;
  }
};

export const flespiRealmUserById = async (realmId, userId) => {
  try {
    const { data } = await axios.get(
      `${flespiRealmUrl}/realms/${realmId}/users/${userId}`,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );
    return data.result[0];
  } catch (error) {
    if (error.response) {
      const errorMessage =
        error.response.data.errors?.[0]?.reason ||
        "Failed to get user configuration";
      throw new Error(errorMessage);
    }
    throw new Error(`Failed to get user configuration: ${error.message}`);
  }
};

export const updateRealmUser = async (body, realmId, id) => {
  try {
    const { data } = await axios.put(
      `${flespiRealmUrl}/realms/${realmId}/users/${id}`,
      body,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );
    return data;
  } catch (error) {
    throw error;
  }
};

export const loginRealmUser = async (realmId, userId) => {
  try {
    const { data } = await axios.post(
      `${flespiRealmUrl}/realms/${realmId}/users/${userId}/login`,
      null,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );

    return data.result;
  } catch (error) {
    throw error;
  }
};

export const removeUserFromRealm = async (realmId, flespiId) => {
  try {
    const { data } = await axios.delete(
      `${flespiRealmUrl}/realms/${realmId}/users/${flespiId}`,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );

    return data;
  } catch (error) {
    throw error;
  }
};

export const subaccountCountersById = async (subaccountId) => {
  try {
    const { data } = await axios.get(
      `${flespiRealmUrl}/subaccounts/${subaccountId}?fields=counters`,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );
    return data.result;
  } catch (error) {
    throw error;
  }
};

// --------------------------------------------------------------------- CALCULATOR APIS

export const allSuperAdminCalculators = async () => {
  try {
    const { data } = await axios.get(
      `https://flespi.io/gw/calcs/all?fields=id%2Cname`,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );

    return data.result;
  } catch (error) {
    throw error;
  }
};

export const allSubaccountCalc = async (flespId) => {
  try {
    const { data } = await axios.get(`https://flespi.io/gw/calcs/all`, {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
      },
    });

    const subaccountCalcs = data?.result.filter((calc) => calc.cid === flespId);

    return subaccountCalcs;
  } catch (error) {
    throw error;
  }
};

export const createFlespiGeofence = async (geofences) => {
  try {
    const { data } = await axios.post(
      `${flespiUrl}/geofences?fields=id,name,geometry,metadata`,
      geofences,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return data.result;
  } catch (error) {
    console.error("❌ Create geofence error:", error.response?.data || error.message);
    throw error;
  }
};

export const getFlespiGeofence = async (
  selector = "all",
  fields = "id,name,priority,geometry,metadata"
) => {
  try {
    const encodedSelector = encodeURIComponent(selector);
    const { data } = await axios.get(
      `${flespiUrl}/geofences/${encodedSelector}?fields=${fields}`,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );
    return data.result;
  } catch (error) {
    console.error("❌ Get geofence error:", error.response?.data || error.message);
    throw error;
  }
};

export const updateFlespiGeofence = async (selector, updates) => {
  try {
    const encodedSelector = encodeURIComponent(selector);
    const { data } = await axios.put(
      `${flespiUrl}/geofences/${encodedSelector}?fields=id,name,geometry,metadata`,
      updates,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return data.result;
  } catch (error) {
    console.error("❌ Update geofence error:", error.response?.data || error.message);
    throw error;
  }
};

export const deleteFlespiGeofence = async (selector) => {
  try {
    const encodedSelector = encodeURIComponent(selector);
    const { data } = await axios.delete(
      `${flespiUrl}/geofences/${encodedSelector}`,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );
    return data.result;
  } catch (error) {
    console.error("❌ Delete geofence error:", error.response?.data || error.message);
    throw error;
  }
};
// Assign single geofence to a device
// services/flespiApis.js
export const assignGeofenceToDevice = async (deviceId, geofenceId) => {
  try {
    const url = `${flespiUrl}/devices/${deviceId}/geofences/${geofenceId}`;
    console.log(`🌍 Assigning Flespi Geofence ${geofenceId} → Device ${deviceId}`);

    const { data } = await axios.post(
      url,
      null, // ⬅️ no body at all (important)
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );

    console.log(`✅ Assigned geofence ${geofenceId} → device ${deviceId}`);
    return data;
  } catch (err) {
    console.error(
      `❌ Assign geofence error (${geofenceId} → ${deviceId}):`,
      err.response?.data || err.message
    );
    throw err;
  }
};



// Unassign geofence from device
export const unassignGeofenceFromDevice = async (deviceId, geofenceId) => {
  try {
    const url = `${flespiUrl}/devices/${encodeURIComponent(deviceId)}/geofences/${encodeURIComponent(geofenceId)}`;
    const { data } = await axios.delete(url, {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
      },
    });
    console.log(`🗑 Unassigned geofence ${geofenceId} from device ${deviceId}`);
    return data.result || data;
  } catch (error) {
    console.error(
      `❌ Unassign geofence error (${geofenceId} ← ${deviceId}):`,
      error.response?.data || error.message
    );
    throw error;
  }
};


export const createFlespiCalculator = async (calculatorConfig) => {
  try {
    const url = `${flespiUrl}/calcs`;
    const { data } = await axios.post(url, [calculatorConfig], {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
        "Content-Type": "application/json",
      },
    });

    const created = data.result?.[0] || data[0];
    if (!created?.id) throw new Error("Flespi did not return calculator ID");

    console.log(`🧮 Created calculator "${created.name}" (ID ${created.id})`);
    return created;
  } catch (error) {
    console.error(
      "❌ Error creating Flespi calculator:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Assign calculator (geofence) to device
export const assignCalculatorToDevice = async (deviceId, calculatorId) => {
  try {
    const url = `${flespiUrl}/devices/${encodeURIComponent(deviceId)}/calcs/${encodeURIComponent(calculatorId)}`;

    const { data } = await axios.put(
      url,
      {},
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
        },
      }
    );

    console.log(`🔗 Assigned calculator ${calculatorId} → device ${deviceId}`);
    return data.result || data;
  } catch (error) {
    console.error(
      `❌ Error assigning calculator (${calculatorId} → ${deviceId}):`,
      error.response?.data || error.message
    );
    throw error;
  }
};
export const assignCalculatorToGeofence = async (calcId, geofenceId) => {
  try {
    const url = `${flespiUrl}/calcs/${encodeURIComponent(calcId)}/geofences/${encodeURIComponent(geofenceId)}`;

    const { data } = await axios.post(url, null, {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
      },
    });

    console.log(`🔗 Assigned calculator ${calcId} → geofence ${geofenceId}`);
    return data.result || data;
  } catch (error) {
    console.error(
      `❌ Error assigning calculator (${calcId} → geofence ${geofenceId}):`,
      error.response?.data || error.message
    );
    throw error;
  }
};

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function secondsToMin(sec) {
  if (!isNum(sec)) return 0;
  return +(sec / 60).toFixed(2);
}

function formatDuration(sec) {
  if (!isNum(sec) || sec <= 0) return "0s";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function toISO(ts) {
  if (isNum(ts)) return new Date(ts * 1000).toISOString();
  return new Date().toISOString();
}

// --- main function ---
export const fetchCalcData = async (calcId, deviceId) => {
  try {
    const url = `${flespiUrl}/calcs/${encodeURIComponent(calcId)}/devices/${encodeURIComponent(
      deviceId
    )}/intervals/last?data={"reverse":true,"count":1}`;

    const { data } = await axios.get(url, {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const interval = data?.result?.[0];
    if (!interval) {
      console.warn(`⚠️ No interval data for calc ${calcId} / device ${deviceId}`);
      return null;
    }

    // --- Extract KPIs safely ---
    const durationSec = isNum(interval.duration) ? interval.duration : 0;
    const queueTimeSec = isNum(interval.op_avg_queue_time) ? interval.op_avg_queue_time : 0;
    const efficiency = isNum(interval.op_avg_cycle_efficiency)
      ? interval.op_avg_cycle_efficiency
      : 0;
    const trips = isNum(interval.op_total_l2d_trips) ? interval.op_total_l2d_trips : 0;
    const avgCycleDuration = isNum(interval.op_avg_cycle_duration)
      ? interval.op_avg_cycle_duration
      : 0;
    const avgVolumeM3 = isNum(interval.op_avg_cycle_volume_m3)
      ? interval.op_avg_cycle_volume_m3
      : 0;
    const fuelPerM3 = isNum(interval.avg_energy_efficiency_lm3)
      ? interval.avg_energy_efficiency_lm3
      : 0;
    const vehicleCount = isNum(interval.op_vehicle_count) ? interval.op_vehicle_count : 0;
    const loaderCount = isNum(interval.op_loaders_count) ? interval.op_loaders_count : 0;

    // --- Format final stats for UI ---
    const opStats = {
      flespiDeviceId: deviceId,
      efficiency,
      trips,
      avgCycleDuration,
      avgVolumeM3,
      fuelPerM3,
      vehicleCount,
      loaderCount,
      durationSec,
      durationFormatted: formatDuration(durationSec),
      queueTimeAvgMin: secondsToMin(queueTimeSec),
      queueTimeFormatted: formatDuration(queueTimeSec),
      timestamp: toISO(interval.timestamp),
    };

    return opStats;
  } catch (error) {
    console.error(
      `❌ Error fetching calculator (${calcId} / ${deviceId}):`,
      error.response?.data || error.message
    );
    throw error;
  }
};
export const fetchGeofenceDevices = async (geofenceId) => {
  try {
    if (!geofenceId) throw new Error("Geofence ID is required.");

    const fields = "device_id,geofence_id,name,auto_created";
    const url = `${flespiUrl}/devices/all/geofences/${geofenceId}?fields=${encodeURIComponent(fields)}`;

    const { data } = await axios.get(url, {
      headers: {
        Authorization: `FlespiToken ${FlespiToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // ✅ Return cleaned result array
    const result = (data.result || []).map((item) => ({
      device_id: item.device_id,
      geofence_id: item.geofence_id,
      name: item.name,
      auto_created: item.auto_created,
    }));

    return result;
  } catch (error) {
    console.error(
      "❌ Error fetching geofence devices:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const fetchDevicePositions = async (deviceIds = []) => {
  try {
    if (!deviceIds.length) throw new Error("Device IDs array is empty.");

    const ids = deviceIds.join(",");
    const fields = "position.latitude,position.longitude";
    const url = `${flespiUrl}/devices/${encodeURIComponent(ids)}/telemetry/${fields}`;

    const { data } = await axios.get(url, {
      headers: { Authorization: `FlespiToken ${FlespiToken}` },
    });

    const positions = (data.result || []).map((item) => {
      const latObj = item.telemetry?.["position.latitude"];
      const lonObj = item.telemetry?.["position.longitude"];

      // ✅ Extract .value safely
      const latitude = typeof latObj === "object" ? latObj.value : latObj;
      const longitude = typeof lonObj === "object" ? lonObj.value : lonObj;

      return {
        flespiDeviceId: item.id,
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        timestamp:
          item.telemetry?.timestamp
            ? new Date(item.telemetry.timestamp * 1000).toISOString()
            : null,
      };
    });

    return positions;
  } catch (error) {
    console.error(
      "❌ Error fetching device positions:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export async function getKPIsDashboard(deviceId) {
  try {
    if (!deviceId) throw new Error("Device ID is required.");

    const url = `https://flespi.io/gw/calcs/2194163/devices/${deviceId}/intervals/last?data={"reverse":true,"count":1}`;

    const { data } = await axios.get(url, {
      headers: { Authorization: `FlespiToken ${FlespiToken}` },
    });


    const result = data.result?.[0] || {};

    return {
      flespiDeviceId: deviceId,
      efficiency: result.operation_efficiency_pct ?? null,
      totalMaterial: result.operation_total_m3 ?? null,
      totalMoved: result.total_material_moved_m3 ?? null,
      materialToday: result.material_moved_today ?? null,
      remaining: result.remaining_material_m3 ?? null,
      ETA: result.ETA_completion_h ?? null,
      vehicles: result.Active_vehicles ?? 0,
      loaders: result.active_loaders ?? 0,
      avgCycle: result.avg_cycle_time_min ?? 0,
      queueTime: result.avg_queue_time_min ?? 0,
      dayProductivity: result.Day_productivity ?? 0,
      totalTrips: result.total_trips_today ?? 0,
      tripProductivity: result.trip_productivity ?? 0,
      dayGoal: result.day_goal_achievement ?? 0,
      energyEfficiency: result.energy_efficiency_lm3 ?? 0,
      haulDistance: result.Total_haul_distance ?? 0,
      loadCycle: result.load_cycle ?? 0,
      haulCycle: result.haul_cycle ?? 0,
      dumpCycle: result.dump_cycle ?? 0,
      queueCycle: result.queue_cycle ?? 0,
      returnCycle: result.return_cycle ?? 0,
      last10Efficiency: result.last_10_op_efficiency ?? [],
    };
  } catch (error) {
    console.error("❌ Error fetching KPIs Dashboard:", error.response?.data || error.message);
    throw error;
  }
}





export const fetchOperationStatsForDevices = async (deviceIds = [], calcId) => {
  try {
    if (!deviceIds.length) throw new Error("Device IDs array is empty.");
    const idsParam = deviceIds.join(",");
    const url = `https://flespi.io/gw/calcs/${calcId}/devices/${idsParam}/intervals/last??data={"fields":"operation_efficiency_pct,operation_total_m3,total_material_moved_m3,material_moved_today,remaining_material_m3,ETA_completion_h,Active_vehicles,active_loaders,avg_cycle_time_min,avg_queue_time_min,Day_productivity,total_trips_today,trip_productivity,day_goal_achievement,energy_efficiency_lm3,Total_haul_distance,load_cycle,haul_cycle,dump_cycle,queue_cycle,return_cycle,last_10_op_efficiency"}`;

    const headers = {
      Authorization: `FlespiToken ${FlespiToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const { data } = await axios.get(url, { headers });

    // 🧩 Normalize the response
    console.log("telemetry:", data.result);

    const results = (data.result || []).map((item, index) => {
      const flespiDeviceId = deviceIds[index]; // Preserve order
      const telemetry = item.telemetry || {};

      const extract = (key) => {
        const obj = telemetry[key];
        if (obj && typeof obj === "object") return obj.value;
        return obj ?? 0;
      };

      // 🧩 Add flespiDeviceId into the item itself
      const itemWithDevice = { ...item, flespiDeviceId };

      return {
        flespiDeviceId,
        ...itemWithDevice,
      };
    });



    return results;
  } catch (error) {
    console.error("❌ Error fetching operation stats:", error.response?.data || error.message);
    throw error;
  }
};