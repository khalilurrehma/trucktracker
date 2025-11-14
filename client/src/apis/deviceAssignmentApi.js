import axios from "axios";

// Base URL from environment variables
let apiUrl = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_BACKEND_URL
  : import.meta.env.VITE_PROD_BACKEND_URL;

// ✅ Fetch all device assignments
export const getAllDeviceAssignments = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/device-assignments`);
    return data;
  } catch (error) {
    console.error("Error fetching device assignments:", error);
    throw error;
  }
};

// ✅ Fetch a single device assignment by ID
export const getDeviceAssignmentById = async (id) => {
  try {
    const { data } = await axios.get(`${apiUrl}/device-assignments/${id}`);
    return data;
  } catch (error) {
    console.error(`Error fetching device assignment with ID ${id}:`, error);
    throw error;
  }
};

// ✅ Create a new device assignment
export const createDeviceAssignment = async (assignmentData) => {
  try {
    const { data } = await axios.post(`${apiUrl}/device-assignments`, assignmentData);
    return data;
  } catch (error) {
    console.error("Error creating device assignment:", error);
    throw error;
  }
};

// ✅ Mark a device assignment as completed
export const markDeviceAssignmentComplete = async (id) => {
  try {
    const { data } = await axios.put(`${apiUrl}/device-assignments/${id}/complete`);
    return data;
  } catch (error) {
    console.error(`Error marking device assignment ${id} as completed:`, error);
    throw error;
  }
};

// ✅ Delete a device assignment
export const deleteDeviceAssignment = async (payload) => {
  try {
    const { data } = await axios.delete(`${apiUrl}/device-assignments`, { data: payload });
    return data;
  } catch (error) {
    console.error(`Error deleting device assignment:`, error);
    throw error;
  }
};

export const fetchOperationKPI = async (deviceId, calcId = 2214462) => {
  try {
    const response = await axios.get(`${apiUrl}/operation-calculator/${deviceId}`, {
      params: { calcId },
    });
    return response.data.data;
  } catch (error) {
    console.error("❌ Error fetching operation KPI:", error.message);
    throw error;
  }
};

export const getDevicesByPositionOperation = async (operationId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/operation-devices/position/${operationId}`);
    // Filter devices assigned to the selected operation
    const assigned = data;
    return assigned;
  } catch (error) {
    console.error(`Error fetching devices for operation ${operationId}:`, error);
    throw error;
  }
};
export const getDevicesByOperation = async (operationId) => {
  try {
    const { data } = await axios.get(`${apiUrl}/device-assignments`);
    // Filter devices assigned to the selected operation
    const assigned = data.filter((a) => a.operation_id === operationId);
    return assigned.map((a) => ({
      id: a.device_id,
      zoneId: a.zone_id,
      operationId: a.operation_id,
      flespiId: a.flespi_device_id,
      name: a.device_name,
    }));
  } catch (error) {
    console.error(`Error fetching devices for operation ${operationId}:`, error);
    throw error;
  }
};
export const getDevicesByGeofence = async (geofenceId) => {
  try {
    if (!geofenceId) throw new Error("Missing geofenceId");

    const url = `${apiUrl}/operation-devices/${geofenceId}`;
    const { data } = await axios.get(url);

    if (!data.success) throw new Error("Flespi API returned error");

    return data.devices || [];
  } catch (error) {
    console.error(
      "❌ Error fetching devices by geofence:",
      error.response?.data || error.message
    );
    throw error;
  }
};
export const getDevicePositions = async (deviceIds = []) => {
  try {
    if (!deviceIds.length) throw new Error("Device IDs array is empty.");

    const idsParam = deviceIds.join(",");
    const { data } = await axios.get(`${apiUrl}/device-positions?ids=${idsParam}`);

    return data.positions || [];
  } catch (error) {
    console.error("❌ Error fetching device positions:", error.response?.data || error.message);
    throw error;
  }
};