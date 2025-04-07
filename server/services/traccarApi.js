import axios from "axios";

const traccarBearerToken = process.env.TraccarToken;
const traccarApiUrl = `http://${process.env.TraccarPort}/api`;

export const addTraccarUser = async (body) => {
  try {
    const { data } = await axios.post(`${traccarApiUrl}/users`, body, {
      headers: {
        Authorization: `Bearer ${traccarBearerToken}`,
      },
    });
    return data;
  } catch (error) {
    console.error("Error adding Traccar user:", error);
    throw error;
  }
};
export const getTraccarUsers = async () => {
  try {
    const { data } = await axios.get(`${traccarApiUrl}/users`, {
      headers: {
        Authorization: `Bearer ${traccarBearerToken}`,
      },
    });
    return data;
  } catch (error) {
    console.error("Error adding Traccar user:", error);
    throw error;
  }
};
