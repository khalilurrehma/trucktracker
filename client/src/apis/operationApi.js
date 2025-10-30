import axios from "axios";

// Base URL for the API, dynamically loaded from environment variables
let apiUrl = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_BACKEND_URL
  : import.meta.env.VITE_PROD_BACKEND_URL;

// Fetch all operations
export const getAllOperations = async () => {
  try {
    const { data } = await axios.get(`${apiUrl}/operations`);
    return data;
  } catch (error) {
    console.error("Error fetching operations:", error);
    throw error;
  }
};

// Fetch a single operation by ID
export const getOperationById = async (id) => {
  try {
    const { data } = await axios.get(`${apiUrl}/operations/${id}`);
    return data;
  } catch (error) {
    console.error(`Error fetching operation with ID ${id}:`, error);
    throw error;
  }
};

// Create a new operation
export const createOperation = async (operationData) => {
  try {
    const { data } = await axios.post(`${apiUrl}/operations`, operationData);
    return data;
  } catch (error) {
    console.error("Error creating operation:", error);
    throw error;
  }
};

// Update an existing operation
export const updateOperation = async (id, operationData) => {
  try {
    const { data } = await axios.put(`${apiUrl}/operations/${id}`, operationData);
    return data;
  } catch (error) {
    console.error(`Error updating operation with ID ${id}:`, error);
    throw error;
  }
};

// Delete an operation
export const deleteOperation = async (id) => {
  try {
    const { data } = await axios.delete(`${apiUrl}/operations/${id}`);
    return data;
  } catch (error) {
    console.error(`Error deleting operation with ID ${id}:`, error);
    throw error;
  }
};
