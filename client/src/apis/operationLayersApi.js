import axios from "axios";
import { getAuthToken } from "../common/util/authToken";

let apiUrl = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_BACKEND_URL
  : import.meta.env.VITE_PROD_BACKEND_URL;

const withAuth = async () => {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getOperationLayers = async (operationId) => {
  const headers = await withAuth();
  const { data } = await axios.get(`${apiUrl}/operations/${operationId}/layers`, {
    headers,
  });
  return data;
};

export const createOperationLayer = async (operationId, payload) => {
  const headers = await withAuth();
  const { data } = await axios.post(
    `${apiUrl}/operations/${operationId}/layers`,
    payload,
    { headers }
  );
  return data;
};

export const updateOperationLayer = async (operationId, layerId, payload) => {
  const headers = await withAuth();
  const { data } = await axios.put(
    `${apiUrl}/operations/${operationId}/layers/${layerId}`,
    payload,
    { headers }
  );
  return data;
};

export const deleteOperationLayer = async (operationId, layerId) => {
  const headers = await withAuth();
  const { data } = await axios.delete(
    `${apiUrl}/operations/${operationId}/layers/${layerId}`,
    { headers }
  );
  return data;
};
