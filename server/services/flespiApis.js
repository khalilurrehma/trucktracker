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
