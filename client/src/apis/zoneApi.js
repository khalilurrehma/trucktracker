import axios from 'axios';

let apiUrl = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_BACKEND_URL
  : import.meta.env.VITE_PROD_BACKEND_URL;

// Create a new zone
export const createZone = async (zoneData) => {
  try {
    const response = await axios.post(`${apiUrl}/zones`, zoneData);
    return response.data;  // Return the created zone
  } catch (error) {
    console.error("Error creating zone:", error);
    throw error;
  }
};

// Update an existing zone
export const updateZone = async (id, zoneData) => {
  try {
    const response = await axios.put(`${apiUrl}/zones/${id}`, zoneData);
    return response.data;  // Return the updated zone
  } catch (error) {
    console.error("Error updating zone:", error);
    throw error;
  }
};

// Get all zones
export const getAllZones = async () => {
  try {
    const response = await axios.get(`${apiUrl}/zones`);
    return response.data;  // Return the list of all zones
  } catch (error) {
    console.error("Error fetching zones:", error);
    throw error;
  }
};

// Get a single zone by ID
export const getZoneById = async (id) => {
  try {
    const response = await axios.get(`${apiUrl}/zones/${id}`);
    return response.data;  // Return the zone with the given ID
  } catch (error) {
    console.error("Error fetching zone:", error);
    throw error;
  }
};
export const getZonesByOperationId = async (operationId) => {
  try {
    const response = await axios.get(`${apiUrl}/zones/operation/${operationId}`);
    return response.data;  // Return the zone with the given ID
  } catch (error) {
    console.error("Error fetching zone:", error);
    throw error;
  }
};

// Delete a zone
export const deleteZone = async (id) => {
  try {
    const response = await axios.delete(`${apiUrl}/zones/${id}`);
    return response.data;  // Return success message
  } catch (error) {
    console.error("Error deleting zone:", error);
    throw error;
  }
};
