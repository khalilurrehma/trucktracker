import axios from "axios";

let apiUrl = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_BACKEND_URL
  : import.meta.env.VITE_PROD_BACKEND_URL;

export const getAllDispatchServices = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/dispatch/services`);
    return data;
  } catch (error) {
    console.error("Error fetching dispatch services:", error);
    throw error;
  }
};

export const addNewCase = async (newCaseData) => {
  try {
    const { data } = await axios.post(
      `${apiUrl}/dispatch/new-case`,
      newCaseData
    );
    console.log(data);

    return data;
  } catch (error) {
    console.error("Error adding new case:", error);
    throw error;
  }
};

export const getAllNewCases = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/dispatch/new-cases`);

    return data;
  } catch (error) {
    console.error("Error fetching new cases:", error);
    throw error;
  }
};

export const dropDownAllInfo = async (apiEndpoint) => {
  try {
    const { data } = await axios.get(`${apiUrl}/dropdown/${apiEndpoint}`);

    return data.message;
  } catch (error) {
    console.error("Error fetching Flespi devices:", error);
    throw error;
  }
};

export const fetchFlespiDeviceTypes = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/devices/flespi-device-type`);

    return data.message;
  } catch (error) {
    console.error("Error fetching Flespi devices:", error);
    throw error;
  }
};

export const fetchDevicesByDeviceType = async (deviceTypeId) => {
  console.log(deviceTypeId);

  try {
    const { data } = await axios.get(
      `${apiUrl}/devices/device-type/${deviceTypeId}`
    );
    return data.message;
  } catch (error) {
    console.error("Error fetching Flespi devices:", error);
    throw error;
  }
};

export const getDeviceShiftByDeviceId = async (deviceId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/shift/by/device/${deviceId}`);
    return data;
  } catch (error) {
    console.error("Error fetching Device Shift:", error);
    throw error;
  }
};

export const sendFlespiDeviceCommands = async (deviceId, status, queuettl) => {
  try {
    const { data } = await axios.post(
      `${apiUrl}/devices/status/command-queue/device/${deviceId}`,
      { status, queuettl }
    );

    return data;
  } catch (error) {
    console.error("Error fetching Flespi devices:", error);
    throw error;
  }
};

export const sendFlespiDeviceInstantCommands = async (deviceId, status) => {
  try {
    const { data } = await axios.post(
      `${apiUrl}/devices/status/command/device/${deviceId}`,
      { status }
    );

    return data;
  } catch (error) {
    console.error("Error fetching Flespi devices:", error);
    throw error;
  }
};

export const fetchDeviceTelemetryDout = async (deviceId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/devices/telemetry/dout/${deviceId}`
    );

    return data.message;
  } catch (error) {
    throw error;
  }
};

export const getFlespiDevicesByUserId = async (userId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/new-devices/user/${userId}`);

    return data;
  } catch (error) {
    throw error;
  }
};
export const getFlespiDevices = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/new-devices`);

    return data;
  } catch (error) {
    throw error;
  }
};

export const saveUsageActions = async (body) => {
  try {
    const { data } = await axios.post(`${apiUrl}/usage/action`, body);

    return data.message;
  } catch (error) {
    console.error("Error saving usage actions:", error);
    throw error;
  }
};

export const fetchUserUsageActions = async (userId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/usage/actions/${userId}`);

    return data.message;
  } catch (error) {
    console.error("Error saving usage actions:", error);
    throw error;
  }
};

export const saveUsageReport = async (body) => {
  try {
    const { data } = await axios.post(`${apiUrl}/usage/report`, body);

    return data;
  } catch (error) {
    console.error("Error saving usage report:", error);
    throw error;
  }
};

export const removeUsageReportById = async (id) => {
  try {
    const { data } = await axios.delete(`${apiUrl}/usage/action/${id}`);
    return data;
  } catch (error) {
    console.error("Error deleting usage report:", error);
    throw error;
  }
};

export const fetchCommandExecution = async (deviceId, commandId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/devices/${deviceId}/command/${commandId}/confirm/execution`
    );
    return data;
  } catch (error) {
    console.error("Error executing command:", error);
    throw error;
  }
};

export const modifyCommandResponse = async (deviceId, commandId, response) => {
  try {
    const { data } = await axios.put(
      `${apiUrl}/usage/modify/command/response/${deviceId}/${commandId}`,
      { response }
    );
    return data;
  } catch (error) {
    console.error("Error modifying command response:", error);
    throw error;
  }
};

export const fetchUsersUsageReport = async (userId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/usage/reports/${userId}`);
    return data.message;
  } catch (error) {
    console.error("Error fetching users usage report:", error);
    throw error;
  }
};

export const saveCustomShift = async (body) => {
  try {
    const { data } = await axios.post(`${apiUrl}/new/shift`, body);
    return data;
  } catch (error) {
    console.error("Error saving custom shift:", error);
    throw error;
  }
};

export const saveDeviceShift = async (body) => {
  try {
    const { data } = await axios.post(`${apiUrl}/device/shift`, body);
    return data;
  } catch (error) {
    console.error("Error saving device shift:", error);
    throw error;
  }
};

export const updateDeviceShift = async (id, driverId, body) => {
  try {
    const { data } = await axios.put(
      `${apiUrl}/put/device/shift/${id}/driver/${driverId}`,
      body
    );
    return data;
  } catch (error) {
    console.error("Error updating device shift:", error);
    throw error;
  }
};

export const fetchShiftsById = async (id) => {
  try {
    const { data } = await axios.get(`${apiUrl}/device/shift/${id}`);
    return data.message;
  } catch (error) {
    console.error("Error fetching device shifts:", error);
    throw error;
  }
};

export const shiftById = async (id) => {
  try {
    const { data } = await axios.get(`${apiUrl}/shift/${id}`);
    return data.message;
  } catch (error) {
    console.error("Error fetching shift by id:", error);
    throw error;
  }
};

export const updateShift = async (id, body) => {
  try {
    const { data } = await axios.put(`${apiUrl}/shift/${id}`, body);
    return data;
  } catch (error) {
    console.error("Error fetching shift by id:", error);
    throw error;
  }
};

export const deleteShift = async (id) => {
  try {
    const { data } = await axios.delete(`${apiUrl}/shift/${id}`);
    return data;
  } catch (error) {
    console.error("Error deleting shift:", error);
    throw error;
  }
};

export const fetchDeviceShifts = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/device/shifts`);
    return data.message;
  } catch (error) {
    console.error("Error fetching device shifts:", error);
    throw error;
  }
};

export const fetchDeviceShiftsOfUser = async (userId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/device/shift/user/${userId}`);
    return data.message;
  } catch (error) {
    console.error("Error fetching device shifts:", error);
    throw error;
  }
};

export const fetchDeviceConnection = async (deviceId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/devices/connection/status/${deviceId}`
    );
    return data.message;
  } catch (error) {
    throw error;
  }
};

export const fetchDeviceEngineStatus = async (deviceId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/devices/engine/ignition/status/${deviceId}`
    );
    return data.message;
  } catch (error) {
    throw error;
  }
};

export const fetchDeviceDin = async (deviceId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/v2/devices/din/status/${deviceId}`
    );
    return data.message;
  } catch (error) {
    throw error;
  }
};

export const fetchDeviceLiveLocation = async (deviceId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/devices/flespi/realtime/location/${deviceId}`
    );
    return data.message;
  } catch (error) {
    console.error("Error fetching device live location:", error);
    throw error;
  }
};

export const checkDeviceRadius = async (body) => {
  try {
    const { data } = await axios.post(
      `${apiUrl}/devices/distance/radius/geofence-check`,
      body
    );
    return data;
  } catch (error) {
    console.error("Error checking device radius:", error);
    throw error;
  }
};

export const saveDriver = async (body) => {
  try {
    const { data } = await axios.post(`${apiUrl}/driver`, body);
    return data;
  } catch (error) {
    console.error("Error saving driver:", error);
    throw error;
  }
};

export const getDrivers = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/drivers`);
    return data.message;
  } catch (error) {
    console.error("Error fetching drivers:", error);
    throw error;
  }
};

export const getDriversByUserId = async (userId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/drivers/user/${userId}`);
    return data.message;
  } catch (error) {
    console.error("Error fetching drivers:", error);
    throw error;
  }
};

export const getShifts = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/shifts`);
    return data.message;
  } catch (error) {
    console.error("Error fetching shifts:", error);
    throw error;
  }
};

export const fetchDriverById = async (id) => {
  try {
    const { data } = await axios.get(`${apiUrl}/driver/${id}`);
    return data.message;
  } catch (error) {
    console.error("Error fetching driver:", error);
    throw error;
  }
};

export const updateDriverById = async (id, body) => {
  try {
    const { data } = await axios.put(`${apiUrl}/driver/${id}`, body);
    return data;
  } catch (error) {
    console.error("Error updating driver:", error);
    throw error;
  }
};

export const deleteDriverById = async (id) => {
  try {
    const { data } = await axios.delete(`${apiUrl}/driver/${id}`);
    return data;
  } catch (error) {
    console.error("Error deleting driver:", error);
    throw error;
  }
};

export const removeDeviceShiftById = async (
  id,
  driverId,
  shiftId,
  deviceId
) => {
  try {
    const { data } = await axios.delete(
      `${apiUrl}/device/shift/${id}?deviceId=${deviceId}&shiftId=${shiftId}&driverId=${driverId}`
    );
    return data;
  } catch (error) {
    console.error("Error deleting device shift:", error);
    throw error;
  }
};

export const allDeviceUsageControl = async (
  page = 1,
  searchTerm = "",
  limit = 10
) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/control/devices?page=${page}&limit=${limit}&searchTerm=${searchTerm}`
    );
    return data.message;
  } catch (error) {
    console.error("Error fetching device control:", error);
    throw error;
  }
};

export const allDeviceUsageControlByUserId = async (
  userId,
  page = 1,
  searchTerm = "",
  limit = 20,
) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/control/devices/user/${userId}?page=${page}&limit=${limit}&searchTerm=${searchTerm}`
    );
    return data.message;
  } catch (error) {
    console.error("Error fetching device control:", error);
    throw error;
  }
};

export const modifyDeviceShift = async (id, shiftId) => {
  try {
    const { data } = await axios.put(`${apiUrl}/device/${id}/shift`, {
      shiftId,
    });
    return data;
  } catch (error) {
    console.error("Error modifying device shift:", error);
    throw error;
  }
};

export const modifyUsageControlShift = async (
  deviceId,
  shiftId,
  driverId,
  device
) => {
  try {
    const { data } = await axios.put(
      `${apiUrl}/control/update/shift/${shiftId}/deviceId/${deviceId}/driverId/${driverId}`,
      { device, deviceId, shiftId, driverId }
    );
    return data;
  } catch (error) {
    console.error("Error modifying device shift:", error);
    throw error;
  }
};

export const updateUsageControlDeviceConfig = async (deviceId, body) => {
  try {
    const { data } = await axios.put(
      `${apiUrl}/control/update/device/config/${deviceId}`,
      body
    );
    return data;
  } catch (error) {
    console.error("Error updating device configuration:", error);
    throw error;
  }
};

export const setReason = async (body) => {
  try {
    const { data } = await axios.put(`${apiUrl}/control/update/reason`, body);
    return data;
  } catch (error) {
    console.error("Error setting reason:", error);
    throw error;
  }
};

export const postUsageControlLogAndReport = async (body) => {
  try {
    const { data } = await axios.post(
      `${apiUrl}/control/device/log/report`,
      body
    );
    return data;
  } catch (error) {
    console.error("Error posting usage control log:", error);
    throw error;
  }
};

export const fetchControlUsageLogs = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/control/usage/devices/logs`);
    return data.message;
  } catch (error) {
    console.error("Error fetching usage control logs:", error);
    throw error;
  }
};

export const fetchControlUsageLogsByUserId = async (userId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/control/usage/devices/logs/user/${userId}`
    );
    return data.message;
  } catch (error) {
    console.error("Error fetching usage control logs:", error);
    throw error;
  }
};

export const fetchControlUsageReports = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/control/usage/devices/reports`);
    return data.message;
  } catch (error) {
    console.error("Error fetching usage control logs:", error);
    throw error;
  }
};

export const fetchControlUsageReportsByUserId = async (userId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/control/usage/devices/reports/user/${userId}`
    );
    return data.message;
  } catch (error) {
    console.error("Error fetching usage control logs:", error);
    throw error;
  }
};

export const fetchDeviceUCById = async (deviceId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/control/usage/get/device/${deviceId}`
    );
    return data.message;
  } catch (error) {
    console.error("Error fetching device usage control:", error);
    throw error;
  }
};

// ----------------------------------------------------------- SHIFT API CALLS

export const fetchShifts = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/shifts`);
    return data.message;
  } catch (error) {
    console.error("Error fetching shifts:", error);
    throw error;
  }
};

export const fetchShiftsByUserId = async (userId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/shifts/user/${userId}`);
    return data.message;
  } catch (error) {
    console.error("Error fetching shifts:", error);
    throw error;
  }
};

export const postShift = async (body) => {
  try {
    const { data } = await axios.post(`${apiUrl}/new/shift`, body);
    return data;
  } catch (error) {
    console.error("Error creating shift:", error);
    throw error;
  }
};

export const fetchShiftByid = async (id) => {
  try {
    const { data } = await axios.get(`${apiUrl}/shift/${id}`);
    return data.message;
  } catch (error) {
    console.error("Error fetching shift by ID:", error);
    throw error;
  }
};

// ----------------------------------------------------------- REALM API CALLS

export const newRealm = async (body) => {
  try {
    const { data } = await axios.post(`${apiUrl}/realm`, body);
    return data;
  } catch (error) {
    throw error;
  }
};

export const getRealms = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/realms`);
    return data.message;
  } catch (error) {
    throw error;
  }
};

export const getRealmById = async (realmId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/realm/${realmId}`);
    return data.message;
  } catch (error) {
    throw error;
  }
};

export const getRealmsByUserId = async (userId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/realms/user/${userId}`);
    return data.message;
  } catch (error) {
    throw error;
  }
};

export const allRealmUsers = async (realmId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/realm/${realmId}/users`);
    return data.message;
  } catch (error) {
    throw error;
  }
};

export const deleteRealmUser = async (realmId, userId, flespiId) => {
  try {
    const { data } = await axios.delete(
      `${apiUrl}/realm/${realmId}/user/${userId}/${flespiId}`
    );
    return data;
  } catch (error) {
    throw error;
  }
};

// ------------------------------------------------------------------------------- SUBACCOUNTS

export const allSubaccounts = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/subaccounts`);

    return data.message;
  } catch (error) {
    throw error;
  }
};

export const allSubaccountsOfUser = async (userId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/subaccount/user/${userId}`);
    return data.message;
  } catch (error) {
    throw error;
  }
};

export const subaccountCounter = async (subaccountId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/subaccount/counter/${subaccountId}`
    );
    return data.message;
  } catch (error) {
    throw error;
  }
};
// ------------------------------------------------------------------------------- REALM USERS
export const createRealmUser = async (subaccountId, realmId, body) => {
  try {
    const { data } = await axios.post(
      `${apiUrl}/subaccount/${subaccountId}/realm/${realmId}/user`,
      body
    );
    return data;
  } catch (error) {
    throw error.response?.data;
  }
};

export const RealmUserById = async (realmId, userId) => {
  try {
    const { data } = await axios.get(
      `${apiUrl}/realm/${realmId}/acc/user/${userId}`
    );
    return data.message;
  } catch (error) {
    throw error;
  }
};

export const modifyRealmUser = async (realmId, userId, body) => {
  try {
    const { data } = await axios.put(
      `${apiUrl}/realm/${realmId}/user/${userId}`,
      body
    );
    return data;
  } catch (error) {
    throw error;
  }
};

// ------------------------------------------------------------------------------- GEOFENCES

export const getAllGeofences = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/new-geofences`);
    return data;
  } catch (error) {
    throw error;
  }
};

export const getGeofencesByUserId = async (userId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/new-geofences/user/${userId}`);
    return data;
  } catch (error) {
    throw error;
  }
};
