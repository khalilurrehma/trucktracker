import {
  allSubaccounts,
  deleteSubaccountById,
  newSubaccount,
  subaccountById,
  subaccountByTraccarId,
  subaccountByUserId,
  updateSubaccountById,
} from "../model/subaccounts.js";
import axios from "axios";
import dayjs from "dayjs";
import { createUFT2, createUTF, getUTFByUserId } from "../model/userToken.js";
import {
  deleteGeofencesFromFlespi,
  deleteGeofencesFromTraccar,
  deleteGroupFromFlespi,
  deleteGroupFromTraccar,
  formatTimeISO,
} from "../utils/common.js";
import {
  getTraccarToken,
  getTraccarTokenById,
  insertTraccarToken,
} from "../model/traccarToken.js";
import {
  addRealmUser,
  createRealm,
  loginRealmUser,
  subaccountCountersById,
} from "../services/flespiApis.js";
import {
  addNewRealm,
  addNewRealmUser,
  realmAllUser,
  realmByTraccarId,
} from "../model/realm.js";
import {
  deleteGroupByUserId,
  getGroupByTraccarId,
  getGroupsByUserId,
  softDeleteGroupById,
} from "../model/groups.js";
import {
  deleteGeofenceByUserId,
  getGeofencesByUserId,
  softDeleteGeofenceById,
} from "../model/geofences.js";
import { getDevicesByUserId, softDeleteDeviceById } from "../model/devices.js";
import { defaultCalcs } from "../utils/default.calc.js";
import {
  defaultCalcsBody,
  extractDefaultCalcsId,
} from "../model/calculator.js";

const traccarBearerToken = process.env.TraccarToken;
const traccarApiUrl = `http://${process.env.TraccarPort}/api`;
const flespiToken = process.env.FlespiToken;
const flespiApiUrl = `https://flespi.io/gw`;

export const postSubaccount = async (req, res) => {
  const {
    userId,
    expirationTime,
    isSuperAdmin,
    flespiUserToken,
    superVisor,
    ...restFields
  } = req.body;

  const defaultCalcId = await extractDefaultCalcsId();
  const defaultCalcBody = await defaultCalcsBody();

  const formattedCalcBody = Object.keys(defaultCalcBody).reduce((acc, key) => {
    acc[Number(key)] = defaultCalcBody[key];
    return acc;
  }, {});

  if (!defaultCalcId) {
    return res.status(500).json({
      status: false,
      error: "Failed to extract default calculator ID.",
    });
  }

  if (isSuperAdmin === undefined) {
    return res.status(400).json({
      status: false,
      error: "isSuperAdmin field is required and must be a boolean.",
    });
  }
  if (!isSuperAdmin && !flespiUserToken) {
    return res.status(400).json({
      status: false,
      error: "flespiUserToken is required for non-superAdmin users.",
    });
  }

  try {
    const flespiResponse = await axios.post(
      "https://flespi.io/platform/subaccounts?fields=id%2Cname%2Cemail%2Cmetadata",
      [{ name: req.body.name, metadata: restFields }],
      {
        headers: {
          Authorization: isSuperAdmin
            ? process.env.FlespiToken
            : flespiUserToken,
        },
        headers: {
          Authorization: process.env.FlespiToken,
        },
      }
    );

    const flespiData = flespiResponse.data.result[0];

    const flespiId = flespiData.id;

    const traccarResponse = await axios.post(
      `http://${process.env.TraccarPort}/api/users`,
      { ...restFields },
      {
        headers: { Authorization: `Bearer ${process.env.TraccarToken}` },
      }
    );

    const subaccount_cid = flespiId;

    // create calculators in subaccount

    const calcPromises = [];

    defaultCalcId?.forEach((id) => {
      if (formattedCalcBody[id]) {
        const calcData = {
          ...formattedCalcBody[id],
          name: `${formattedCalcBody[id]?.name} - ${req.body?.name}`,
          metadata: {
            ...formattedCalcBody[id]?.metadata,
            superAdminCalcId: id,
            calc_type_name: "default",
            calc_type: 0,
          },
        };

        calcPromises.push(
          axios.post("https://flespi.io/gw/calcs", [calcData], {
            headers: {
              Authorization: `FlespiToken ${process.env.FlespiToken}`,
              "x-flespi-cid": subaccount_cid,
            },
          })
        );
      }
    });

    const calcResults = await Promise.all(calcPromises);

    const calculatorIds = calcResults?.map((res) => res.data.result[0].id);

    // create Realm For created Subaccount
    const realmBody = {
      home: {
        type: 0,
      },
      name: req.body?.name,
      token_params: {
        access: {
          type: 0,
        },
      },
    };

    const flespiRealmResponse = await createRealm(subaccount_cid, realmBody);
    const flespiRealmData = flespiRealmResponse.result[0];

    const realmUserBody = {
      name: req.body.name + " - Default",
      password: req.body.password,
      registration: "immediate",
    };

    // Default Realm user:
    const realmUserResponse = await addRealmUser(
      realmUserBody,
      flespiRealmData.id,
      subaccount_cid
    );
    const realmUserData = realmUserResponse.result[0];

    // Create UTF for created Subaccount
    const loginUser = await loginRealmUser(
      realmUserData.realm_id,
      realmUserData.id
    );

    const authToken = loginUser[0].token;

    let responses = {
      userId: req.body.userId,
      traccar: traccarResponse.data,
      flespi: flespiResponse.data.result[0],
      default_realm: flespiRealmData,
      default_realm_user: realmUserData,
      user_role: superVisor,
      calcs_id: calculatorIds,
    };

    const insertID = await newSubaccount(responses);
    responses.id = insertID;

    let realmDbBody = {
      flespi_realm_id: flespiRealmData?.id,
      realm_owner_id: traccarResponse?.data.id,
      flespi_realm_name: flespiRealmData?.name,
      flespi_realm_cid: flespiRealmData?.cid,
      flespi_realm_public_id: flespiRealmData?.public_id,
      flespi_realm_config: JSON.stringify(flespiRealmData),
      flespi_subaccount_id: null,
      userId: req.body.userId,
    };

    let realmUserDbBody = {
      flespi_user_id: realmUserData.id,
      realm_id: realmUserData.realm_id,
      userId: req.body.userId,
      realm_user_body: realmUserBody,
      token: authToken,
    };

    await addNewRealm(realmDbBody);
    await addNewRealmUser(realmUserDbBody);

    const expire = dayjs().add(1, "year").endOf("day").unix();
    const tokenRequestBody = [
      {
        expire,
        access: {
          type: 1,
        },
      },
    ];

    const tokenResponse = await axios.post(
      "https://flespi.io/platform/tokens",
      tokenRequestBody,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
          "x-flespi-cid": flespiId,
        },
      }
    );
    const tokenData = tokenResponse.data.result[0];

    const token = await createUTF({
      ...tokenData,
      userId: traccarResponse.data.id,
      email: req.body.email,
    });

    res.status(200).json({
      status: true,
      message: "User created successfully",
      data: responses,
    });
  } catch (error) {
    let errorMessage = "Internal Server Error";
    if (error.response && error.response.status === 401) {
      errorMessage = "Unauthorized";
    }
    res.status(error.response ? error.response.status : 500).json({
      status: false,
      error: error.response ? error.response.data : error.message,
      message: errorMessage,
    });
  }
};

export const getSubaccounts = async (req, res) => {
  try {
    const users = await allSubaccounts();

    if (!users) {
      res.status(404).json({
        status: false,
        error: "Users not found",
      });
      return;
    }

    const transformedUsers = users.map((user) => {
      return {
        ...user,
        time: formatTimeISO(user.created_at),
        administrator: user.administrator === 1,
      };
    });

    res.status(200).json({
      status: true,
      message: transformedUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const getSubaccountById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await subaccountById(id);
    if (!user) {
      return res.status(404).json({
        status: false,
        error: "User not found",
      });
    }

    const transformedUser = {
      ...user,
      administrator: user.administrator === 1,
    };

    res.status(200).json({
      status: true,
      message: transformedUser,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const getSubaccountByTraccarId = async (req, res) => {
  const { traccarId } = req.params;
  try {
    const user = await subaccountByTraccarId(traccarId);
    if (!user) {
      return res.status(404).json({
        status: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      status: true,
      message: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const subaccountCounterByFlespiId = async (req, res) => {
  const { flespiId } = req.params;
  try {
    const countersRes = await subaccountCountersById(flespiId);
    if (!countersRes) {
      res.status(404).json({
        status: false,
        error: "Counters not found",
      });
      return;
    }

    res.status(200).json({
      status: true,
      message: countersRes[0].counters,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const subaccountCounterItems = async (req, res) => {
  const { flespiId, item } = req.params;

  try {
    const flespiResponse = await axios.get(
      `${flespiApiUrl}/${item}/cid=${flespiId}?fields=id,name`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (!flespiResponse.data.result.length) {
      return res.status(404).json({
        status: false,
        error: "Item not found",
      });
    }

    res.status(200).json({
      status: true,
      message: flespiResponse.data.result,
    });
  } catch (error) {
    console.error(error);
    res.status(error.response?.status || 500).json({
      status: false,
      message:
        error.response?.data?.errors?.[0]?.reason || "Internal Server Error",
    });
  }
};

export const subaccountRealmUsers = async (req, res) => {
  const { flespiId: subaccountId } = req.params;

  try {
    const SubsaccountRealmsResp = await axios.get(
      `https://flespi.io/platform/realms/cid=${subaccountId}?fields=id,name`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    let realmId = SubsaccountRealmsResp.data.result[0].id;

    const realmUsersResp = await axios.get(
      `https://flespi.io/platform/realms/${realmId}/users/all?fields=id,name,metadata`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    // filter out the 0th index user
    const filteredUsers = realmUsersResp.data.result.filter(
      (_, index) => index > 0
    );
    res.status(200).json({
      status: true,
      message: filteredUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(error.response?.status || 500).json({
      status: false,
      message:
        error.response?.data?.errors?.[0]?.reason || "Internal Server Error",
    });
  }
};

export const getSubaccountByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const users =
      userId && !isNaN(parseInt(userId))
        ? await subaccountByUserId(userId)
        : [];

    if (!users) {
      res.status(404).json({
        status: false,
        error: "Users not found",
      });
    }

    const transformedUsers = users?.map((user) => {
      return {
        ...user,
        time: formatTimeISO(user?.created_at),
        administrator: user?.administrator === 1,
      };
    });

    res.status(200).json({
      status: true,
      message: transformedUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const updateSubaccount = async (req, res) => {
  const id = req.params.id;
  const user = await subaccountById(id);
  if (!user) {
    return res.status(404).json({
      status: false,
      error: "User not found",
    });
  }
  const { twelveHourFormat, ...body } = req.body;

  try {
    const { id, traccarId, flespiId, userId, name, created_at, ...restFields } =
      body;

    const requestData = {
      id: traccarId,
      name,
      ...restFields,
    };

    const flespiRequest = {
      name,
      metadata: restFields,
    };

    const [traccarResponse, flespiResponse] = await Promise.all([
      axios.put(
        `http://${process.env.TraccarPort}/api/users/${userId}`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.TraccarToken}`,
          },
        }
      ),
      axios.put(
        `https://flespi.io/platform/subaccounts/${flespiId}?fields=id%2Cname%2Cemail%2Cmetadata`,
        flespiRequest,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        }
      ),
    ]);

    const responses = {
      id,
      traccar: traccarResponse.data,
      flespi: flespiResponse.data.result[0],
    };

    const update = await updateSubaccountById(responses.id, responses);

    res.status(200).json({
      status: true,
      message: "User created successfully",
      data: update,
    });
  } catch (error) {
    console.error(
      "Error in creating group:",
      error.response ? error.response.data : error.message
    );

    let errorMessage = "Internal Server Error";
    if (
      typeof error.response?.data === "string" &&
      error.response?.data.includes("Duplicate entry ")
    ) {
      errorMessage = `${req.body.email} already exists`;
    } else if (error.response && error.response.status === 401) {
      errorMessage = "Unauthorized";
    }

    res.status(error.response ? error.response.status : 500).json({
      status: false,
      error: errorMessage,
    });
  }
};

export const deleteSubaccount = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await subaccountById(userId);
    const userRealm = await realmByTraccarId(user?.traccarId);
    const realmUsers = await realmAllUser(userRealm[0]?.flespi_realm_id);

    if (!user) {
      return res.status(404).json({
        status: false,
        error: "User not found",
      });
    }
    if (!userRealm) {
      return res.status(404).json({
        status: false,
        error: "Realm not found",
      });
    }
    if (!realmUsers) {
      return res.status(404).json({
        status: false,
        error: "Users not found in realm",
      });
    }
    const deletableRealmUsers = await Promise.all(
      realmUsers?.map(async (user) => {
        const traccarBody = JSON.parse(user?.traccar_user_body);
        const groups = await getGroupsByUserId(traccarBody?.id);
        const geofences = await getGeofencesByUserId(traccarBody?.id);

        return {
          ...user,
          traccarId: traccarBody?.id,
          flespiId: user.flespi_user_id,
          groups: groups || [],
          geofences: geofences || [],
        };
      })
    );

    if (!deletableRealmUsers) {
      return res.status(404).json({
        status: false,
        error: "Users not found in realm",
      });
    }

    const deleteGroupsForRealmUsers = async (deletableRealmUsers) => {
      for (const user of deletableRealmUsers) {
        const { groups } = user;

        if (!groups.length) {
          console.log(`No groups to delete for user ${user.traccarId}`);
          continue;
        }

        try {
          await Promise.all(
            groups.map(async (group) => {
              await deleteGroupFromTraccar(group.traccarId);
              await deleteGroupFromFlespi(group.flespiId);
              await deleteGroupByUserId(group.userId);
            })
          );
          console.log(`All groups deleted for user ${user.traccarId}`);
        } catch (error) {
          console.error(
            `Error deleting groups for user ${user.traccarId}:`,
            error
          );
        }
      }

      return true;
    };
    const groupsBulkResponse = deleteGroupsForRealmUsers(deletableRealmUsers);

    const deleteGeofencesForRealmUsers = async (deletableRealmUsers) => {
      for (const user of deletableRealmUsers) {
        const { geofences } = user;

        if (!geofences.length) {
          console.log(`No geofences to delete for user ${user.traccarId}`);
          continue;
        }

        try {
          await Promise.all(
            geofences.map(async (geofence) => {
              await deleteGeofencesFromTraccar(geofence.traccarId);
              await deleteGeofencesFromFlespi(geofence.flespiId);
              await deleteGeofenceByUserId(geofence.userId);
            })
          );

          console.log(`All geofences deleted for user ${user.traccarId}`);
        } catch (error) {
          console.error(
            `Failed to delete geofences for user ${user.traccarId}:`,
            error.message
          );
        }
      }

      return true;
    };

    const geofencesBulkResponse =
      deleteGeofencesForRealmUsers(deletableRealmUsers);

    if (groupsBulkResponse && geofencesBulkResponse) {
      console.log(
        `All groups and geofences deleted for user ${user.traccarId}`
      );
    } else {
      res.status(500).json({
        status: false,
        error: "Failed to delete groups and geofences",
      });
    }

    const deleteRealmUsers = async (user) => {
      const flespiApiUrl = `https://flespi.io/platform/realms/${user.realm_id}/users/${user.flespi_user_id}`;
      const traccarUrl = `${traccarApiUrl}/users/${user.traccarId}`;

      try {
        await axios.delete(flespiApiUrl, {
          headers: {
            Authorization: `FlespiToken ${flespiToken}`,
          },
        });

        await axios.delete(traccarUrl, {
          headers: {
            Authorization: `Bearer ${traccarBearerToken}`,
          },
        });
      } catch (error) {}
    };

    await Promise.all(
      deletableRealmUsers.map(async (user) => {
        await deleteRealmUsers(user);
      })
    );

    const deleteRealm = async (realmId) => {
      const apiUrl = `https://flespi.io/platform/realms/${realmId}`;
      try {
        await axios.delete(apiUrl, {
          headers: {
            Authorization: `FlespiToken ${flespiToken}`,
          },
        });
        console.log(`Realm ${realmId} deleted successfully!`);
        return true;
        // return response.data;
        // console.log(response.data);
      } catch (error) {
        console.error(`Error deleting realm ${realmId}:`, error);
        return false;
      }
    };

    const realmResponse = await deleteRealm(userRealm[0].flespi_realm_id);

    const deleteSubaccountDevices = async (deviceId) => {
      try {
        await softDeleteDeviceById(deviceId);
      } catch (error) {}
    };

    const deleteSubaccountGroups = async (groupId) => {
      try {
        await softDeleteGroupById(groupId);
      } catch (error) {}
    };
    const deleteSubaccountGeofences = async (geofenceId) => {
      try {
        await softDeleteGeofenceById(geofenceId);
      } catch (error) {}
    };

    const subaccountDevices = await getDevicesByUserId(user?.traccarId);
    const subaccountGroups = await getGroupsByUserId(user?.traccarId);
    const subaccountGeofences = await getGeofencesByUserId(user?.traccarId);

    await Promise.all(
      subaccountDevices?.map(async (device) => {
        await deleteSubaccountDevices(device.id);
      })
    );
    await Promise.all(
      subaccountGroups?.map(async (group) => {
        await deleteSubaccountGroups(group.id);
      })
    );
    await Promise.all(
      subaccountGeofences?.map(async (geofence) => {
        await deleteSubaccountGeofences(geofence.id);
      })
    );

    const [traccarResponse, flespiResponse] = await Promise.allSettled([
      axios.delete(`${traccarApiUrl}/users/${user.traccarId}`, {
        headers: {
          Authorization: `Bearer ${traccarBearerToken}`,
        },
      }),
      axios.delete(`https://flespi.io/platform/subaccounts/${user.flespiId}`, {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }),
    ]);

    // Handle failed requests
    const failedRequests = [traccarResponse, flespiResponse].filter(
      (result) => result?.status === "rejected"
    );

    if (failedRequests.length > 0) {
      const errorDetails = failedRequests.map((result) => {
        return {
          message: result.reason.message,
          request: result.reason.config,
          response: result.reason.response?.data,
        };
      });
      console.error("Failed Requests Details:", errorDetails);
      return res.status(500).json({
        status: false,
        error: "Failed to delete from external services",
        details: errorDetails,
      });
    }

    // delete users specs from db
    const update = await deleteSubaccountById(userId);

    res.status(200).json({
      status: true,
      message: `User ${user.name} deleted successfully.`,
    });
  } catch (error) {
    console.error("Error:", error);

    if (error.response && error.response.data && error.response.data.errors) {
      const serverErrors = error.response.data.errors;
      console.error("Server Errors:", serverErrors);
      res.status(400).json({
        status: false,
        error: "Bad Request",
        details: serverErrors,
      });
    } else {
      res.status(500).json({
        status: false,
        error: "Internal Server Error",
      });
    }
  }
};

export const generateAndSaveUFT = async (req, res) => {
  const { cid, expire, access_type, userId, email } = req.body;
  const missingFields = ["cid", "expire", "userId", "email"].filter(
    (field) => !req.body[field]
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      error: `Required fields are missing: ${missingFields.join(", ")}`,
    });
  }

  try {
    const apiUrl = "https://flespi.io/platform/tokens";

    const headers = {
      Authorization: `FlespiToken ${process.env.FlespiToken}`,
      "x-flespi-cid": cid,
    };
    const requestBody = [
      {
        expire,
        access: {
          type: access_type || 0,
        },
      },
    ];

    const response = await axios.post(apiUrl, requestBody, { headers });

    if (response.data.result && response.data.result.length > 0) {
      const insertedData = response.data.result[0];

      const insertedId = await createUTF({
        ...insertedData,
        userId,
        email,
      });

      const responseData = { ...insertedData, userId, email, insertedId };

      res.status(response.status).json({ status: true, data: responseData });
    } else {
      res.status(500).json({
        status: false,
        error: "Failed to insert data into the database",
      });
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      const errorData = error.response.data.errors[0];
      res.status(403).json({ status: false, error: errorData });
    } else {
      res.status(500).json({
        status: false,
        error: error.response ? error.response.data : error.message,
      });
    }
  }
};

export const generateUFT = async (req, res) => {
  const { cid, access_type, userId, email, token } = req.body;
  const missingFields = ["cid", "userId", "email", "token"].filter(
    (field) => !req.body[field]
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      error: `Required fields are missing: ${missingFields.join(", ")}`,
    });
  }

  try {
    if (cid && userId && email && token) {
      const insertedId = await createUFT2({
        cid,
        access_type,
        userId,
        email,
        key: token,
      });

      const responseData = { insertedId };

      res.status(200).json({ status: true, data: responseData });
    } else {
      res.status(500).json({
        status: false,
        error: "Failed to insert data into the database",
      });
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      const errorData = error.response.data.errors[0];
      res.status(403).json({ status: false, error: errorData });
    } else {
      console.error(error);
      res.status(500).json({ status: false, error: "Internal server error" });
    }
  }
};

export const getUFTbyId = async (req, res) => {
  try {
    const userId = req.params.id;
    const token = await getUTFByUserId(userId);
    console.log(token);

    if (!token) {
      res.status(404).json({
        status: false,
        error: "token not found",
      });
      return;
    }

    res.status(200).json({
      status: true,
      data: token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const traccarToken = async (req, res) => {
  const { userId, traccar_token } = req.body;

  if (userId && traccar_token) {
    const data = {
      userId,
      traccar_token,
    };
    const result = await insertTraccarToken(data);
    if (result) {
      res.json({ status: true, userId, traccar_token });
    } else {
      res.json({
        status: false,
        error: "Error while inserting or updating data",
      });
    }
  } else {
    res.json({ status: false, error: "Missing or invalid data" });
  }
};

export const fetchTraccarToken = async (req, res) => {
  getTraccarToken((error, results) => {
    if (error) {
      res.status(500).json({
        status: false,
        error: "An error occurred while fetching data",
      });
    } else {
      res.status(200).json({
        status: true,
        data: results,
      });
    }
  });
};

export const getTraccarTokenByUserId = async (req, res) => {
  const UserId = req.params.UserId;
  getTraccarTokenById(UserId, (error, result) => {
    if (error) {
      res.status(500).json({
        status: false,
        error: "An error occurred while fetching data",
      });
    } else if (result) {
      res.status(200).json({
        status: true,
        data: result,
      });
    } else {
      res.status(404).json({
        status: false,
        error: "Subaccount not found",
      });
    }
  });
};
