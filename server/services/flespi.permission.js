import axios from "axios";

const FlespiToken = process.env.FlespiToken;
const flespiUrl = "https://flespi.io/gw";
const flespiRealmUrl = "https://flespi.io/platform";

export const updateUserFlespiPermission = async (
  realmId,
  userId,
  permission
) => {
  try {
    const response = await axios.put(
      `${flespiRealmUrl}/realms/${realmId}/users/${userId}`,
      permission,
      {
        headers: {
          Authorization: `FlespiToken ${FlespiToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 400) {
        throw new Error(
          "Invalid ACL configuration: " +
            (error.response.data.errors?.[0]?.reason || "Validation failed")
        );
      }
      if (error.response.status === 401) {
        throw new Error("Authentication failed: Invalid or expired token");
      }
      if (error.response.status === 403) {
        throw new Error("Authorization failed: Insufficient permissions");
      }
      if (error.response.status === 429) {
        throw new Error("Too many requests: API rate limit exceeded");
      }
      throw new Error(
        error.response.data.errors?.[0]?.reason ||
          "Failed to update device permissions"
      );
    }
    throw new Error(`Failed to update device permissions: ${error.message}`);
  }
};
