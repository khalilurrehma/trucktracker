import {
  addNewRealm,
  addNewRealmUser,
  allRealms,
  allRealmsByUserId,
  putRealmUser,
  realmAllUser,
  realmById,
  realmByTraccarId,
  realmUserById,
  realmUserByUserId,
  removeRealmUser,
} from "../model/realm.js";
import {
  addRealmUser,
  createRealm,
  fetchRealms,
  loginRealmUser,
  removeUserFromRealm,
  updateRealmUser,
} from "../services/flespiApis.js";
import { addTraccarUser, getTraccarUsers } from "../services/traccarApi.js";

export const postRealm = async (req, res) => {
  const body = req.body;
  const subaccount_cid = body.cid;

  const data = {
    home: {
      type: body.home_type,
    },
    name: body.name,
    token_params: {
      access: {
        type: body.token_params_access_type,
      },
      ttl: body.token_params_ttl,
    },
    public_info: {},
  };

  if (body.home_subaccount_id) {
    data.home.subaccount_id = body.home_subaccount_id;
  }
  if (body.home_limit_id) {
    data.home.limit_id = body.home_limit_id;
  }
  if (body.public_name) {
    data.public_info.name = body.public_name;
  }
  if (body.public_description) {
    data.public_info.description = body.public_description;
  }
  if (body.logo_url) {
    data.public_info.logo_url = body.logo_url;
  }

  try {
    const newRealm = await createRealm(subaccount_cid, data);

    const realmResult = newRealm.result[0];

    const { id, name, cid, public_id } = realmResult;

    const dbBody = {
      flespi_realm_id: id,
      flespi_realm_name: name,
      flespi_realm_cid: cid,
      flespi_realm_public_id: public_id,
      flespi_realm_config: JSON.stringify(realmResult),
      flespi_subaccount_id: data.home.subaccount_id
        ? data.home.subaccount_id
        : null,
      userId: body.userId,
    };

    await addNewRealm(dbBody);

    res
      .status(201)
      .json({ status: true, message: `Realm Added Successfully!` });
  } catch (error) {
    res.status(error.status || 500).json({
      status: false,
      error: {
        message: error.message,
        details: error.data,
        statusCode: error.status,
        statusText: error.statusText,
      },
    });
  }
};

export const getRealms = async (req, res) => {
  try {
    const dbResponse = await allRealms();
    if (!dbResponse) {
      res.status(404).json({ status: false, message: "Realms not found" });
      return;
    }

    res.status(200).json({ status: true, message: dbResponse });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getRealmById = async (req, res) => {
  const { id } = req.params;
  try {
    const realm = await realmById(id);
    if (!realm) {
      res.status(404).json({ status: false, message: "Realms not found" });
      return;
    }

    res.status(200).json({ status: true, message: realm });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getRealmsByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await allRealmsByUserId(userId);
    if (!user) {
      res.status(404).json({ status: false, message: "Realms not found" });
      return;
    }

    res.status(200).json({ status: true, message: user });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getRealmByTraccarId = async (req, res) => {
  const { traccarId } = req.params;
  try {
    const realm = await realmByTraccarId(traccarId);
    if (!realm) {
      res.status(404).json({ status: false, message: "Realm not found" });
      return;
    }

    res.status(200).json({ status: true, message: realm });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const newRealmUser = async (req, res) => {
  const { realmId } = req.params;
  const body = req.body;
  const subaccount_cid = req.body.cid;

  const flespiBody = {
    name: body.name,
    password: body.password,
    registration: "immediate",
    home: {
      type: 0,
    },
  };
  if (body.token_params === null) {
  } else if (body.token_params === 0) {
    flespiBody.token_params = null;
    flespiBody.token_params = {
      access: {
        type: body.token_params_access_type,
      },
      ttl: body.token_params_ttl,
    };
  }

  if (body.token_params_access_type === 2) {
    flespiBody.token_params = flespiBody.token_params || {};
    flespiBody.token_params.access = {
      acl: [],
      type: body.token_params_access_type,
    };
  }

  const traccarBody = {
    name: body.name,
    email: body.email,
    administrator: body.token_params_access_type === 0 ? false : true,
    password: body.password,
    deviceLimit: parseInt(body.deviceLimit),
    userLimit: parseInt(body.userLimit),
    readonly: body.readOnly,
    deviceReadonly: body.deviceReadOnly,
    fixedEmail: body.changeEmail,
    attributes: body.attributes,
  };

  const traccarUsers = await getTraccarUsers();

  const traccarUserName = traccarUsers.find((user) => user.name === body.name);
  const traccarUserEmail = traccarUsers.find(
    (user) => user.email === body.email
  );

  if (traccarUserName) {
    res.status(400).json({
      status: false,
      message: "User with this Name already exists in Traccar",
    });
    return;
  }

  if (traccarUserEmail) {
    res.status(400).json({
      status: false,
      message: "User with this Email already exists in Traccar",
    });
    return;
  }

  const flespiRealmUsers = await realmAllUser(realmId);

  const flespiRealmUser = flespiRealmUsers.find((user) => {
    const Userbody = JSON.parse(user.realm_user_body);

    return Userbody.name === body.name;
  });

  if (flespiRealmUser) {
    res
      .status(400)
      .json({ status: false, message: "Realm User in Flespi already exists" });
    return;
  }

  try {
    const [traccarResponse, realmResponse] = await Promise.all([
      addTraccarUser(traccarBody),
      addRealmUser(flespiBody, realmId, subaccount_cid),
    ]);

    if (!traccarResponse) {
      res
        .status(500)
        .json({ status: false, message: "Failed to add new user" });
      return;
    }

    const newUserId = realmResponse.result[0].id;

    if (!newUserId) {
      res
        .status(500)
        .json({ status: false, message: "Failed to add new user" });
      return;
    }

    const loginUser = await loginRealmUser(realmId, newUserId);
    const authToken = loginUser[0]?.token;

    if (!loginUser) {
      res.status(500).json({ status: false, message: "Failed to login user" });
      return;
    }

    const traccarDbBody = {
      userId: body.userId,
      traccarId: traccarResponse.id,
      flespiId: newUserId,
      name: traccarResponse.name,
      email: traccarResponse.email,
      administrator: traccarResponse.administrator,
      password: traccarResponse.password,
      deviceLimit: traccarResponse?.deviceLimit,
      userLimit: traccarResponse?.userLimit,
      readonly: traccarResponse?.readonly,
      deviceReadonly: traccarResponse?.deviceReadonly,
      fixedEmail: traccarResponse?.fixedEmail,
      flespi_metadata: realmResponse.result[0],
    };

    const dbBody = {
      flespi_user_id: newUserId,
      realm_id: realmId,
      userId: body.userId,
      realm_user_body: flespiBody,
      traccar_user_body: traccarResponse,
      token: authToken,
    };

    const dbResponse = await addNewRealmUser(dbBody);
    if (!dbResponse) {
      res
        .status(500)
        .json({ status: false, message: "Failed to add realm user" });
      return;
    }

    res
      .status(201)
      .json({ status: true, message: "User Created", data: dbBody });
  } catch (error) {
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    };
    res.status(500).json({ status: false, message: errorDetails });
  }
};

export const getRealmUsers = async (req, res) => {
  const { realmId } = req.params;

  try {
    const users = await realmAllUser(realmId);
    if (!users) {
      res.status(404).json({ status: false, message: "Users not found" });
      return;
    }
    res.status(200).json({ status: true, message: users });
  } catch (error) {
    res.status(500).json({ status: false, error: error });
  }
};

export const getRealmUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await realmUserById(id);
    if (!user) {
      res.status(404).json({ status: false, message: "User not found" });
      return;
    }
    res.status(200).json({ status: true, message: user });
  } catch (error) {
    res.status(500).json({ status: false, error: error });
  }
};

export const getRealmUserByUserId = async (req, res) => {
  const { realmId, userId } = req.params;

  try {
    const user = await realmUserByUserId(realmId, userId);
    if (!user) {
      res.status(404).json({ status: false, message: "User not found" });
      return;
    }
    res.status(200).json({ status: true, message: user });
  } catch (error) {
    res.status(500).json({ status: false, error: error });
  }
};

export const modifyRealmUser = async (req, res) => {
  const { realmId, id } = req.params;
  const body = req.body;

  const flespiBody = {
    name: body.name,
  };

  try {
    const flespiuser = await realmUserById(id);
    const user = flespiuser[0];

    if (!flespiuser) {
      return res
        .status(404)
        .json({ status: false, message: "User not found in DB" });
    }

    const flespiResponse = await updateRealmUser(
      flespiBody,
      realmId,
      user.flespi_user_id
    );

    if (!flespiResponse.result) {
      return res
        .status(500)
        .json({ status: false, message: "Failed to update user in Flespi" });
    }

    const dbBody = {
      flespi_user_id: user.flespi_user_id,
      realm_id: realmId,
      realm_user_body: flespiResponse.result[0].name,
    };
    const dbResponse = await putRealmUser(dbBody);
    if (!dbResponse) {
      return res
        .status(500)
        .json({ status: false, message: "Failed to update user in DB" });
    }

    return res.status(200).json({ status: true, message: "User Updated!" });
  } catch (error) {
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    };
    return res.status(500).json({ status: false, error: errorDetails });
  }
};

export const deleteRealmUser = async (req, res) => {
  const { realmId, id, flespiId } = req.params;

  try {
    // Execute both deletion operations concurrently
    const [flespiResponse, dbResponse] = await Promise.all([
      removeUserFromRealm(realmId, flespiId),
      removeRealmUser(realmId, id),
    ]);
    if (!flespiResponse || !dbResponse) {
      return res
        .status(500)
        .json({ status: false, message: "Failed to delete user" });
    }

    return res
      .status(200)
      .json({ status: true, message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: {
        message: error.message,
        details: error.data,
        statusCode: error.status,
        statusText: error.statusText,
      },
    });
  }
};
