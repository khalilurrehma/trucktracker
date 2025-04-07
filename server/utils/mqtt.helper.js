import axios from "axios";
import {
  realmIdByTraccarId,
  realmUserTraccarIdByflespiId,
} from "../model/realm.js";
const flespiToken = process.env.FlespiToken;

export async function getRealmUsersWithDeviceIds(subaccountId) {
  try {
    const realmsResponse = await realmIdByTraccarId(subaccountId);

    const firstRealmId = realmsResponse;

    const usersResponse = await axios.get(
      `https://flespi.io/platform/realms/${firstRealmId}/users/all?fields=id,name,token_params`,
      {
        headers: {
          Authorization: `FlespiToken ${flespiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const usersWithDeviceIds = await Promise.all(
      usersResponse.data?.result?.map(async (user) => {
        const deviceIds = extractDeviceIdsFromAcl(user.token_params);

        const traccarId = await realmUserTraccarIdByflespiId(user.id);

        return {
          id: user.id, // flespiId
          name: user.name,
          deviceIds: deviceIds,
          traccarId: traccarId,
        };
      }) || []
    );

    return usersWithDeviceIds;
  } catch (error) {
    console.error("Error fetching realm users:", error);
    return { error: error.message };
  }
}

function extractDeviceIdsFromAcl(tokenParams) {
  if (!tokenParams || !tokenParams.access || tokenParams.access.type !== 2) {
    return null;
  }

  const deviceAcls = tokenParams.access.acl.filter(
    (entry) => entry.uri === "gw/devices"
  );

  if (deviceAcls.length === 0) {
    return null;
  }

  const deviceIds = [];

  deviceAcls.forEach((acl) => {
    if (acl.ids === "all" || acl.ids === "in-groups") {
      deviceIds.push("all");
    } else if (Array.isArray(acl.ids)) {
      deviceIds.push(...acl.ids);
    }
  });

  return [...new Set(deviceIds)];
}
