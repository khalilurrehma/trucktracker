import axios from "axios";
import { getDeviceByFlespiId, getDeviceByTraccarId } from "../model/devices.js";
import { getGeofencesByTraccarId } from "../model/geofences.js";
import { getGroupByTraccarId } from "../model/groups.js";
import {
  subaccountByTraccarId,
  userAssignedCustomCalcs,
} from "../model/subaccounts.js";
import { updateUserFlespiPermission } from "../services/flespi.permission.js";
import { flespiRealmUserById } from "../services/flespiApis.js";
import { updateCustomCalcInSubaccount } from "../model/calculator.js";

export const superAdminUpdatePermission = async (req, res) => {
  const { addedItems: calcId, deviceId } = req.body.data;

  try {
    const FlespiResponse = await axios.post(
      `https://flespi.io/gw/calcs/${calcId}/devices/${deviceId}`,
      null,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (FlespiResponse.status !== 200) {
      return res.status(FlespiResponse.status).json({
        status: false,
        message: "Failed to assign calculator",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Device Permissions Updated",
    });
  } catch (error) {
    console.error(
      "Catch Block Error:",
      error?.response?.data || error.message || error
    );
    return res.status(500).json({
      status: false,
      message: "An internal error occurred",
      error: error?.response?.data || error.message || "Unknown error",
    });
  }
};
// export const superAdminUpdatePermission = async (req, res) => {
//   const { addedItems: deviceIds, calcId } = req.body.data;

//   try {
//     const flespiDevices = await Promise.all(
//       deviceIds.map(async (deviceId) => {
//         try {
//           const device = await getDeviceByTraccarId(deviceId);
//           return device ? device.flespiId : null;
//         } catch (error) {
//           return null;
//         }
//       })
//     );

//     const validFlespiIds = flespiDevices?.filter((id) => id !== null);

//     if (validFlespiIds.length === 0) {
//       return res
//         .status(400)
//         .json({ status: false, message: "No valid devices found" });
//     }

//     const deviceIdsString = validFlespiIds.join(",");

//     const FlespiResponse = await axios.post(
//       `https://flespi.io/gw/calcs/${calcId}/devices/${deviceIdsString}`,
//       null,
//       {
//         headers: {
//           Authorization: `FlespiToken ${process.env.FlespiToken}`,
//         },
//       }
//     );

//     if (FlespiResponse.status !== 200) {
//       return res.status(FlespiResponse.status).json({
//         status: false,
//         message: "Failed to assign calculator",
//       });
//     }

//     return res.status(200).json({
//       status: true,
//       message: "Device Permissions Updated",
//     });
//   } catch (error) {
//     console.error(
//       "Catch Block Error:",
//       error?.response?.data || error.message || error
//     );
//     return res.status(500).json({
//       status: false,
//       message: "An internal error occurred",
//       error: error?.response?.data || error.message || "Unknown error",
//     });
//   }
// };

export const superAdminRemovePermission = async (req, res) => {
  const { removedItems: calcId, deviceId } = req.body.data;

  try {
    const FlespiResponse = await axios.delete(
      `https://flespi.io/gw/calcs/${calcId}/devices/${deviceId}`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (FlespiResponse.status !== 200) {
      return res.status(FlespiResponse.status).json({
        status: false,
        message: "Failed to assign calculator",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Device Permissions Updated",
    });
  } catch (error) {
    console.error(
      "Catch Block Error:",
      error?.response?.data || error.message || error
    );
    return res.status(500).json({
      status: false,
      message: "An internal error occurred",
      error: error?.response?.data || error.message || "Unknown error",
    });
  }
};
// export const superAdminRemovePermission = async (req, res) => {
//   const { removedItems: deviceIds, calcId } = req.body.data;

//   try {
//     const flespiDevices = await Promise.all(
//       deviceIds.map(async (deviceId) => {
//         try {
//           const device = await getDeviceByTraccarId(deviceId);
//           return device ? device.flespiId : null;
//         } catch (error) {
//           return null;
//         }
//       })
//     );

//     const validFlespiIds = flespiDevices?.filter((id) => id !== null);

//     if (validFlespiIds.length === 0) {
//       return res
//         .status(400)
//         .json({ status: false, message: "No valid devices found" });
//     }

//     const deviceIdsString = validFlespiIds.join(",");

//     const FlespiResponse = await axios.delete(
//       `https://flespi.io/gw/calcs/${calcId}/devices/${deviceIdsString}`,
//       {
//         headers: {
//           Authorization: `FlespiToken ${process.env.FlespiToken}`,
//         },
//       }
//     );

//     if (FlespiResponse.status !== 200) {
//       return res.status(FlespiResponse.status).json({
//         status: false,
//         message: "Failed to assign calculator",
//       });
//     }

//     return res.status(200).json({
//       status: true,
//       message: "Device Permissions Updated",
//     });
//   } catch (error) {
//     console.error(
//       "Catch Block Error:",
//       error?.response?.data || error.message || error
//     );
//     return res.status(500).json({
//       status: false,
//       message: "An internal error occurred",
//       error: error?.response?.data || error.message || "Unknown error",
//     });
//   }
// };

export const updateDeviceCustomCalc = async (req, res) => {
  const { traccarId } = req.params;
  const { addedItems: calcId, deviceId } = req.body.data;

  try {
    const subaccount = await subaccountByTraccarId(traccarId);
    if (!subaccount) {
      return res.status(400).json({
        status: false,
        message: "Subaccount not found",
      });
    }
    let subaccount_cid = subaccount.flespiId;

    const SubaccountResponse = await axios.post(
      `https://flespi.io/gw/calcs/${calcId}/devices/${deviceId}`,
      {},
      {
        headers: {
          "x-flespi-cid": parseInt(subaccount_cid),
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (SubaccountResponse.status !== 200) {
      return res.status(SubaccountResponse.status).json({
        status: false,
        message: "Failed to assign calculator in subaccount",
      });
    }

    const subaccountCalc = await axios.get(
      `https://flespi.io/gw/calcs/${calcId}?fields=metadata`,
      {
        headers: {
          "x-flespi-cid": parseInt(subaccount_cid),
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    const masterCalcId =
      subaccountCalc.data.result[0].metadata.superAdminCalcId;

    const MasterResponse = await axios.post(
      `https://flespi.io/gw/calcs/${masterCalcId}/devices/${deviceId}`,
      {},
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (MasterResponse.status !== 200) {
      return res.status(MasterResponse.status).json({
        status: false,
        message: "Failed to assign calculator in master account",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Device Permissions Updated",
    });
  } catch (error) {
    console.error(
      "Catch Block Error:",
      error?.response?.data || error.message || error
    );
    return res.status(500).json({
      status: false,
      message: "An internal error occurred",
      error: error?.response?.data || error.message || "Unknown error",
    });
  }
};

export const removeDeviceCustomCalc = async (req, res) => {
  const { traccarId } = req.params;
  const { removedItems: calcId, deviceId } = req.body.data;

  try {
    const subaccount = await subaccountByTraccarId(traccarId);
    if (!subaccount) {
      return res.status(400).json({
        status: false,
        message: "Subaccount not found",
      });
    }
    let subaccount_cid = subaccount.flespiId;

    const SubaccountResponse = await axios.delete(
      `https://flespi.io/gw/calcs/${calcId}/devices/${deviceId}`,
      {
        headers: {
          "x-flespi-cid": parseInt(subaccount_cid),
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (SubaccountResponse.status !== 200) {
      return res.status(SubaccountResponse.status).json({
        status: false,
        message: "Failed to remove device from calculator in subaccount",
      });
    }

    const subaccountCalc = await axios.get(
      `https://flespi.io/gw/calcs/${calcId}?fields=metadata`,
      {
        headers: {
          "x-flespi-cid": parseInt(subaccount_cid),
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    const masterCalcId =
      subaccountCalc.data.result[0].metadata.superAdminCalcId;

    await axios.delete(
      `https://flespi.io/gw/calcs/${masterCalcId}/devices/${deviceId}`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    return res.status(200).json({
      status: true,
      message: "Device Permissions Updated",
    });
  } catch (error) {
    console.error(
      "Catch Block Error:",
      error?.response?.data || error.message || error
    );
    return res.status(500).json({
      status: false,
      message: "An internal error occurred",
      error: error?.response?.data || error.message || "Unknown error",
    });
  }
};

export const assignCalculator = async (req, res) => {
  const { flespiId, traccarId } = req.params;
  const calcId = req.body;

  try {
    // first we fetch the incoming user from our db
    const subaccount = await subaccountByTraccarId(parseInt(traccarId));

    // for calc body fetched calc body directly from flespi to create same calc in subaccount on flespi by cid: flespiId
    const flespiResponse = await axios.get(
      `https://flespi.io/gw/calcs/${calcId}?fields=name%2Cupdate_delay%2Cmessages_source%2Cintervals_ttl%2Cintervals_rotate%2Cselectors%2Ccounters%2Cvalidate_interval%2Cvalidate_message%2Ctimezone%2Cupdate_period%2Cupdate_onchange`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (flespiResponse.data.errors && flespiResponse.data.errors.length > 0) {
      console.error("API Error:", flespiResponse.data.errors);
      return res.status(400).json({
        status: false,
        message: `Failed to update calculator: ${flespiResponse.data.errors[0].reason}`,
      });
    }
    let prevCalcName = flespiResponse.data.result[0].name;

    const newCalcBody = {
      ...flespiResponse.data.result[0],
      name: `${prevCalcName} - ${subaccount?.name}`,
      metadata: { superAdminCalcId: calcId[0], calc_type: "custom" },
    };

    const newCalcResponse = await axios.post(
      `https://flespi.io/gw/calcs`,
      [newCalcBody],
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
          "x-flespi-cid": flespiId,
        },
      }
    );

    if (newCalcResponse.data.errors && newCalcResponse.data.errors.length > 0) {
      console.error(
        "Flespi API Error on creating calc:",
        newCalcResponse.data.errors
      );
      return res.status(400).json({
        status: false,
        message: `Failed to create new calculator: ${newCalcResponse.data.errors[0].reason}`,
      });
    }

    let newCalcId = newCalcResponse.data?.result[0]?.id;

    await updateCustomCalcInSubaccount(calcId, traccarId, "assign");

    res.status(200).json({
      status: true,
      message: "Calculator assigned successfully",
    });
  } catch (error) {
    console.error(
      "Catch Block Error:",
      error?.response?.data || error.message || error
    );

    return res.status(500).json({
      status: false,
      message: "An internal error occurred",
      error: error?.response?.data || error.message || "Unknown error",
    });
  }
};

export const unassignCalculator = async (req, res) => {
  const { flespiId, traccarId } = req.params;
  const calcIds = req.body;

  try {
    if (!Array.isArray(calcIds) || calcIds.length === 0) {
      return res.status(400).json({
        status: false,
        message:
          "Invalid request: Provide an array of calculator IDs to remove",
      });
    }

    let subaccountCalcs = await userAssignedCustomCalcs(traccarId);
    subaccountCalcs = subaccountCalcs ? JSON.parse(subaccountCalcs) : [];

    const assignedCalcsSet = new Set(subaccountCalcs);
    const existingCalcs = calcIds.filter((id) => assignedCalcsSet.has(id));

    if (existingCalcs.length === 0) {
      return res.status(400).json({
        status: false,
        message: "None of the provided calculators are assigned to this user",
      });
    }

    const flespiResponse = await axios.get(
      `https://flespi.io/gw/calcs/all?fields=metadata%2Cid`,
      {
        headers: {
          "x-flespi-cid": flespiId,
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (
      !flespiResponse.data?.result ||
      flespiResponse.data.result.length === 0
    ) {
      return res.status(400).json({
        status: false,
        message: "No calculators found in Flespi",
      });
    }

    const calcsToDelete = flespiResponse.data.result
      .filter(
        (calc) =>
          calc.metadata?.superAdminCalcId &&
          calcIds.includes(calc.metadata.superAdminCalcId)
      )
      .map((calc) => calc.id);

    if (calcsToDelete.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No matching calculators found to delete",
      });
    }

    await Promise.all(
      calcsToDelete.map((calcId) =>
        axios.delete(`https://flespi.io/gw/calcs/${calcId}`, {
          headers: {
            "x-flespi-cid": flespiId,
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        })
      )
    );

    await updateCustomCalcInSubaccount(calcIds, traccarId, "unassign");

    res.status(200).json({
      status: true,
      message: "Calculators unassigned successfully",
    });
  } catch (error) {
    console.error(
      "Catch Block Error:",
      error?.response?.data || error.message || error
    );

    return res.status(500).json({
      status: false,
      message: "An internal error occurred",
      error: error?.response?.data || error.message || "Unknown error",
    });
  }
};

export const subaccountDevicePermissions = async (req, res) => {
  const { subaccountId, traccarId } = req.params;
  const { addedItems: deviceId } = req.body;

  try {
    const { device_groupId } = await subaccountByTraccarId(traccarId);
    let userGroupId = parseInt(device_groupId);

    if (!userGroupId) {
      return res.status(400).json({
        status: false,
        message: "User does not have a device group",
      });
    }

    const { flespiId } = await getDeviceByTraccarId(deviceId);

    if (!flespiId) {
      return res.status(400).json({
        status: false,
        message: "Device not found",
      });
    }

    // First, disable the device
    const disableResponse = await axios.put(
      `https://flespi.io/gw/devices/${flespiId}?fields=id,name,enabled`,
      { enabled: false },
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    // Verify device is disabled
    if (!disableResponse.data.result?.[0]) {
      throw new Error("Failed to disable device");
    }

    // Wait 2.5 seconds after disable
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Move device to subaccount
    const subaccountResponse = await axios.put(
      `https://flespi.io/gw/devices/${flespiId}/cid?fields=id,name,cid`,
      { cid: parseInt(subaccountId) },
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (!subaccountResponse.data.result?.[0]) {
      throw new Error("Failed to move device to subaccount");
    }

    // Wait 2.5 seconds after move
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Add device to user's group
    const userGroupResponse = await axios.post(
      `https://flespi.io/gw/groups/${userGroupId}/devices/${flespiId}?fields=device_id,group_id`,
      null,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
          "x-flespi-cid": parseInt(subaccountId),
        },
      }
    );

    if (!userGroupResponse.data.result?.[0]) {
      throw new Error("Failed to assign device to group");
    }

    // Wait 2.5 seconds before re-enabling
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Re-enable the device in subaccount
    const enableResponse = await axios.put(
      `https://flespi.io/gw/devices/${flespiId}?fields=id,name,enabled`,
      { enabled: true },
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
          "x-flespi-cid": parseInt(subaccountId),
        },
      }
    );

    if (!enableResponse.data.result?.[0]) {
      throw new Error("Failed to enable device");
    }

    res.status(200).json({
      status: true,
      message: "Device permissions updated successfully",
      data: {
        device: enableResponse.data.result[0],
        group: userGroupResponse.data.result[0],
      },
    });
  } catch (error) {
    if (error.response) {
      if (error.response.status === 400) {
        return res.status(400).json({
          status: false,
          error:
            "Invalid configuration: " +
            (error.response.data.errors?.[0]?.reason || "Validation failed"),
        });
      }
      if (error.response.status === 401) {
        return res.status(400).json({
          status: false,
          error: "Authentication failed: Invalid or expired token",
        });
      }
      if (error.response.status === 403) {
        return res.status(403).json({
          status: false,
          error: "Authorization failed: Insufficient permissions",
        });
      }
    }

    return res.status(500).json({
      status: false,
      error: "Failed to update device: " + error.message,
    });
  }
};

export const subaccountRemoveDevicePermissions = async (req, res) => {
  const { subaccountId, traccarId } = req.params;
  const { removedItems: deviceId } = req.body;
  const masterAccountId = 1992332;

  try {
    const { device_groupId } = await subaccountByTraccarId(traccarId);
    let userGroupId = parseInt(device_groupId);

    if (!userGroupId) {
      return res.status(400).json({
        status: false,
        message: "User does not have a device group",
      });
    }

    const { flespiId } = await getDeviceByTraccarId(deviceId);

    if (!flespiId) {
      return res.status(400).json({
        status: false,
        message: "Device not found",
      });
    }

    // First, disable the device
    const disableResponse = await axios.put(
      `https://flespi.io/gw/devices/${flespiId}?fields=id,name,enabled`,
      { enabled: false },
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
          "x-flespi-cid": parseInt(subaccountId),
        },
      }
    );

    if (!disableResponse.data.result?.[0]) {
      throw new Error("Failed to disable device");
    }

    // Wait 2.5 seconds after disable
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Remove from group
    const removeResponse = await axios.delete(
      `https://flespi.io/gw/groups/${userGroupId}/devices/${flespiId}?fields=device_id,group_id`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
          "x-flespi-cid": parseInt(subaccountId),
        },
      }
    );

    if (!removeResponse.data.result?.[0]) {
      throw new Error("Failed to remove device from group");
    }

    // Wait 2.5 seconds after group removal
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Move device back to master account
    const moveResponse = await axios.put(
      `https://flespi.io/gw/devices/${flespiId}/cid?fields=id,name,cid`,
      { cid: masterAccountId },
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (!moveResponse.data.result?.[0]) {
      throw new Error("Failed to move device to master account");
    }

    // Wait 2.5 seconds before re-enabling
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Re-enable the device in master account
    const enableResponse = await axios.put(
      `https://flespi.io/gw/devices/${flespiId}?fields=id,name,enabled`,
      { enabled: true },
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (!enableResponse.data.result?.[0]) {
      throw new Error("Failed to enable device");
    }

    res.status(200).json({
      status: true,
      message: "Device removed successfully",
      data: {
        device: enableResponse.data.result[0],
        group: removeResponse.data.result[0],
      },
    });
  } catch (error) {
    if (error.response) {
      if (error.response.status === 400) {
        return res.status(400).json({
          status: false,
          error:
            "Invalid configuration: " +
            (error.response.data.errors?.[0]?.reason || "Validation failed"),
        });
      }
      if (error.response.status === 401) {
        return res.status(400).json({
          status: false,
          error: "Authentication failed: Invalid or expired token",
        });
      }
      if (error.response.status === 403) {
        return res.status(403).json({
          status: false,
          error: "Authorization failed: Insufficient permissions",
        });
      }
    }

    return res.status(500).json({
      status: false,
      error: "Failed to remove device: " + error.message,
    });
  }
};

export const updateUserDevice = async (req, res) => {
  const { realmId, realmuserId } = req.params;
  const { addedItems: deviceIds } = req.body;

  try {
    const currentConfig = await flespiRealmUserById(realmId, realmuserId);

    if (!currentConfig) {
      return res
        .status(404)
        .json({ status: false, message: "Realm User not found" });
    }

    const flespiDevices = await Promise.all(
      deviceIds.map(async (deviceId) => {
        try {
          const device = await getDeviceByTraccarId(deviceId);
          return device ? device.flespiId : null;
        } catch (error) {
          return null;
        }
      })
    );

    const validFlespiIds = flespiDevices.filter((id) => id !== null);

    if (validFlespiIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No valid devices found" });
    }

    let acl = currentConfig?.token_params?.access?.acl || [];

    let deviceAcl = acl.find((entry) => entry.uri === "gw/devices");

    if (!deviceAcl) {
      deviceAcl = {
        uri: "gw/devices",
        methods: ["GET", "POST", "PUT", "DELETE"],
        ids: validFlespiIds,
        submodules: [
          { name: "logs", methods: ["GET"] },
          { name: "messages", methods: ["GET", "POST"] },
          { name: "settings", methods: ["GET", "PUT", "DELETE"] },
          { name: "telemetry", methods: ["GET", "DELETE"] },
          { name: "packets", methods: ["GET"] },
          { name: "commands", methods: ["POST"] },
          { name: "commands-queue", methods: ["GET", "POST", "DELETE"] },
          { name: "connections", methods: ["GET", "DELETE"] },
        ],
      };
      acl.push(deviceAcl);
    } else {
      deviceAcl.ids = Array.from(
        new Set([...deviceAcl.ids, ...validFlespiIds])
      );
    }

    const updateAclBody = {
      token_params: {
        access: {
          ...currentConfig.token_params.access,
          acl,
        },
        origins: "*",
        ttl: currentConfig.token_params.ttl,
      },
    };

    await updateUserFlespiPermission(realmId, realmuserId, updateAclBody);

    return res.status(200).json({
      status: true,
      message: "Device Permissions Updated",
    });
  } catch (error) {
    console.error("Error updating device permissions:", error);
    return res.status(500).json({ status: false, error: error.message });
  }
};

export const deleteUserDevice = async (req, res) => {
  const { realmId, realmuserId } = req.params;
  const { removedItems: deviceIds } = req.body;

  try {
    const currentConfig = await flespiRealmUserById(realmId, realmuserId);
    if (!currentConfig) {
      return res
        .status(404)
        .json({ status: false, message: "Realm User not found" });
    }

    const flespiDevices = await Promise.all(
      deviceIds?.map(async (deviceId) => {
        const device = await getDeviceByTraccarId(deviceId);
        return device ? device.flespiId : null;
      })
    );

    const validFlespiIds = flespiDevices?.filter((id) => id !== null);

    if (validFlespiIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No valid devices found" });
    }

    let existingDeviceIds =
      currentConfig?.token_params?.access?.acl?.find(
        (entry) => entry.uri === "gw/devices"
      )?.ids || [];

    const updatedDeviceIds = existingDeviceIds.filter(
      (id) => !validFlespiIds.includes(id)
    );

    const updateAclBody = {
      token_params: {
        access: {
          type: 2,
          acl:
            updatedDeviceIds.length > 0
              ? [
                  {
                    uri: "gw/devices",
                    methods: ["GET", "POST", "PUT", "DELETE"],
                    ids: updatedDeviceIds,
                    submodules: [
                      { name: "logs", methods: ["GET"] },
                      { name: "messages", methods: ["GET", "POST"] },
                      { name: "settings", methods: ["GET", "PUT", "DELETE"] },
                      { name: "telemetry", methods: ["GET", "DELETE"] },
                      { name: "packets", methods: ["GET"] },
                      { name: "commands", methods: ["POST"] },
                      {
                        name: "commands-queue",
                        methods: ["GET", "POST", "DELETE"],
                      },
                      { name: "connections", methods: ["GET", "DELETE"] },
                    ],
                  },
                ]
              : [],
        },
        origins: "*",
        ttl: 31536000,
      },
    };

    const flespiUpdateResponse = await updateUserFlespiPermission(
      realmId,
      realmuserId,
      updateAclBody
    );

    return res.status(200).json({
      status: true,
      message: "Device Permissions Updated",
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

export const updateUserGroups = async (req, res) => {
  const { realmId, realmuserId } = req.params;
  const { addedItems: groupIds } = req.body;

  try {
    const currentConfig = await flespiRealmUserById(realmId, realmuserId);
    if (!currentConfig) {
      return res
        .status(404)
        .json({ status: false, message: "Realm User not found" });
    }

    const flespiGroups = await Promise.all(
      groupIds?.map(async (groupId) => {
        const group = await getGroupByTraccarId(groupId);
        return group ? group.flespiId : null;
      })
    );

    const validFlespiIds = flespiGroups?.filter((id) => id !== null);
    if (validFlespiIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No valid groups found" });
    }

    let checkGroupObjectInAcl = currentConfig?.token_params?.access?.acl?.find(
      (entry) => entry.uri === "gw/groups"
    );

    if (!checkGroupObjectInAcl) {
      // If no group object exists, add it and pass the coming groupId
      checkGroupObjectInAcl = {
        uri: "gw/groups",
        methods: ["GET", "POST", "PUT", "DELETE"],
        ids: validFlespiIds,
      };

      currentConfig?.token_params?.access?.acl?.push(checkGroupObjectInAcl);

      const { token_params } = currentConfig;

      const formattedBody = { token_params };

      const flespiUpdateResponse = await updateUserFlespiPermission(
        realmId,
        realmuserId,
        formattedBody
      );

      return res.status(200).json({
        status: true,
        message: "Group Permissions Updated",
      });
    }

    // If group object exists, update the ids by modifying currentConfig acl

    checkGroupObjectInAcl?.ids?.push(validFlespiIds[0]);

    const { token_params } = currentConfig;

    const formattedBody = { token_params };

    const flespiUpdateResponse = await updateUserFlespiPermission(
      realmId,
      realmuserId,
      formattedBody
    );

    return res.status(200).json({
      status: true,
      message: "Group Permissions Updated",
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

export const deleteUserGroups = async (req, res) => {
  const { realmId, realmuserId } = req.params;
  const { removedItems: groupIds } = req.body;

  try {
    const currentConfig = await flespiRealmUserById(realmId, realmuserId);
    if (!currentConfig) {
      return res
        .status(404)
        .json({ status: false, message: "Realm User not found" });
    }

    const flespiGroups = await Promise.all(
      groupIds?.map(async (groupId) => {
        const group = await getGroupByTraccarId(groupId);
        return group ? group.flespiId : null;
      })
    );

    const validFlespiIds = flespiGroups?.filter((id) => id !== null);
    if (validFlespiIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No valid groups found" });
    }

    let acl = currentConfig?.token_params?.access?.acl || [];

    let groupAclIndex = acl.findIndex((entry) => entry.uri === "gw/groups");

    if (groupAclIndex === -1) {
      return res
        .status(400)
        .json({ status: false, message: "No group ACL found" });
    }

    let existingGroupIds = acl[groupAclIndex]?.ids || [];

    let updatedGroupIds = existingGroupIds.filter(
      (id) => !validFlespiIds.includes(id)
    );

    if (updatedGroupIds.length === 0) {
      acl.splice(groupAclIndex, 1);
    } else {
      acl[groupAclIndex].ids = updatedGroupIds;
    }

    const updateAclBody = {
      token_params: {
        access: {
          ...currentConfig.token_params.access,
          acl,
        },
        origins: "*",
        ttl: currentConfig.token_params.ttl,
      },
    };

    const flespiUpdateResponse = await updateUserFlespiPermission(
      realmId,
      realmuserId,
      updateAclBody
    );

    return res.status(200).json({
      status: true,
      message: "Group Permissions Updated",
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

export const updateUserGeofence = async (req, res) => {
  const { realmId, realmuserId } = req.params;
  const { addedItems: geofenceIds } = req.body;

  try {
    const currentConfig = await flespiRealmUserById(realmId, realmuserId);
    if (!currentConfig) {
      return res
        .status(404)
        .json({ status: false, message: "Realm User not found" });
    }

    const flespiGeofences = await Promise.all(
      geofenceIds?.map(async (geofenceId) => {
        const geofence = await getGeofencesByTraccarId(geofenceId);
        return geofence ? geofence.flespiId : null;
      })
    );

    const validFlespiIds = flespiGeofences?.filter((id) => id !== null);
    if (validFlespiIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No valid geofences found" });
    }

    let acl = currentConfig?.token_params?.access?.acl || [];

    let geofenceAcl = acl.find((entry) => entry.uri === "gw/geofences");

    if (!geofenceAcl) {
      geofenceAcl = {
        uri: "gw/geofences",
        methods: ["GET", "POST", "PUT", "DELETE"],
        ids: validFlespiIds,
      };

      acl.push(geofenceAcl);
    } else {
      geofenceAcl.ids = Array.from(
        new Set([...geofenceAcl.ids, ...validFlespiIds])
      );
    }

    const updateAclBody = {
      token_params: {
        access: {
          ...currentConfig.token_params.access,
          acl,
        },
        origins: "*",
        ttl: currentConfig.token_params.ttl,
      },
    };

    const flespiUpdateResponse = await updateUserFlespiPermission(
      realmId,
      realmuserId,
      updateAclBody
    );

    return res.status(200).json({
      status: true,
      message: "Geofence Permissions Updated",
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

export const deleteUserGeofence = async (req, res) => {
  const { realmId, realmuserId } = req.params;
  const { removedItems: geofenceIds } = req.body;

  try {
    const currentConfig = await flespiRealmUserById(realmId, realmuserId);
    if (!currentConfig) {
      return res
        .status(404)
        .json({ status: false, message: "Realm User not found" });
    }

    const flespiGeofences = await Promise.all(
      geofenceIds?.map(async (geofenceId) => {
        const geofence = await getGeofencesByTraccarId(geofenceId);
        return geofence?.flespiId ?? null;
      })
    );

    const validFlespiIds = flespiGeofences.filter((id) => Number.isInteger(id));

    if (validFlespiIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No valid geofences found" });
    }

    let acl = currentConfig?.token_params?.access?.acl || [];

    let geofenceAclIndex = acl.findIndex(
      (entry) => entry.uri === "gw/geofences"
    );

    if (geofenceAclIndex === -1) {
      return res
        .status(400)
        .json({ status: false, message: "No geofence permissions found" });
    }

    acl[geofenceAclIndex].ids = acl[geofenceAclIndex].ids.filter(
      (id) => !validFlespiIds.includes(id)
    );

    if (acl[geofenceAclIndex].ids.length === 0) {
      acl.splice(geofenceAclIndex, 1);
    }
    const updateAclBody = {
      token_params: {
        access: {
          ...currentConfig.token_params.access,
          acl,
        },
        origins: "*",
        ttl: currentConfig.token_params.ttl,
      },
    };
    const flespiUpdateResponse = await updateUserFlespiPermission(
      realmId,
      realmuserId,
      updateAclBody
    );

    return res.status(200).json({
      status: true,
      message: "Geofence Permissions Updated",
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

export const updateUserCalculator = async (req, res) => {
  const { realmId, realmuserId } = req.params;
  const { addedItems: calculatorIds } = req.body;

  try {
    const currentConfig = await flespiRealmUserById(realmId, realmuserId);
    if (!currentConfig) {
      return res
        .status(404)
        .json({ status: false, message: "Realm User not found" });
    }

    const validCalculatorIds = calculatorIds?.filter((id) => id !== null);

    if (validCalculatorIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No valid calculators found" });
    }

    let acl = currentConfig?.token_params?.access?.acl || [];

    let calculatorAcl = acl.find((entry) => entry.uri === "gw/calcs");

    if (!calculatorAcl) {
      calculatorAcl = {
        uri: "gw/calcs",
        methods: ["GET", "POST", "PUT", "DELETE"],
        ids: validCalculatorIds,
      };
      acl.push(calculatorAcl);
    } else {
      calculatorAcl.ids = Array.from(
        new Set([...calculatorAcl.ids, ...validCalculatorIds])
      );
    }

    const updateAclBody = {
      token_params: {
        access: {
          ...currentConfig.token_params.access,
          acl,
        },
        origins: "*",
        ttl: currentConfig.token_params.ttl,
      },
    };

    await updateUserFlespiPermission(realmId, realmuserId, updateAclBody);

    return res.status(200).json({
      status: true,
      message: "Calculator Permissions Updated",
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

export const deleteUserCalculator = async (req, res) => {
  const { realmId, realmuserId } = req.params;
  const { removedItems: calculatorIds } = req.body;

  try {
    const currentConfig = await flespiRealmUserById(realmId, realmuserId);
    if (!currentConfig) {
      return res
        .status(404)
        .json({ status: false, message: "Realm User not found" });
    }

    const validCalculatorIds = calculatorIds?.filter((id) =>
      Number.isInteger(id)
    );

    if (validCalculatorIds.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No valid calculators found" });
    }

    let acl = currentConfig?.token_params?.access?.acl || [];

    let calculatorAclIndex = acl.findIndex((entry) => entry.uri === "gw/calcs");

    if (calculatorAclIndex === -1) {
      return res
        .status(400)
        .json({ status: false, message: "No calculator permissions found" });
    }

    acl[calculatorAclIndex].ids = acl[calculatorAclIndex].ids.filter(
      (id) => !validCalculatorIds.includes(id)
    );

    if (acl[calculatorAclIndex].ids.length === 0) {
      acl.splice(calculatorAclIndex, 1);
    }

    const updateAclBody = {
      token_params: {
        access: {
          ...currentConfig.token_params.access,
          acl,
        },
        origins: "*",
        ttl: currentConfig.token_params.ttl,
      },
    };

    await updateUserFlespiPermission(realmId, realmuserId, updateAclBody);

    return res.status(200).json({
      status: true,
      message: "Calculator Permissions Updated",
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};
