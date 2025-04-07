import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const FlespiToken = process.env.FlespiToken;
const flespiUrl = "https://flespi.io/gw";
const flespiRealmUrl = "https://flespi.io/platform";
const prodFlespiToken =
  "DO3Z45affw3w5gOo04nP66scC73W5yIwbzl3tl7wGYQB4uOSn1xjVNllJc8EzE1A";

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
