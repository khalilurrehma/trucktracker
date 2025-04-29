import axios from "axios";
import {
  createGeofence,
  fetchGeofencesTypes,
  fetchGeofencesTypesByUserId,
  fetchGeofenceTypeById,
  getAllGeofences,
  getGeofenceById,
  getGeofencesByUserId,
  modifyGeofenceTypeById,
  removeGeofenceTypeById,
  saveGeofenceType,
  softDeleteGeofenceById,
  updateGeofenceById,
} from "../model/geofences.js";
import { parseGeofence } from "../utils/common.js";

const traccarBearerToken = process.env.TraccarToken;
const traccarApiUrl = `http://${process.env.TraccarPort}/api`;
const flespiToken = process.env.FlespiToken;
const flespiApiUrl = `https://flespi.io/gw`;

export const addNewGeofence = async (req, res) => {
  const {
    userId,
    isSuperAdmin,
    subaccount_cid,
    traccarUserToken,
    administrator,
    superVisor,
    ...restFields
  } = req.body;

  try {
    if (
      userId === undefined ||
      userId === null ||
      isNaN(userId) ||
      typeof userId !== "number"
    ) {
      return res.status(400).json({
        status: false,
        error: "User ID is required.",
      });
    }

    if (isSuperAdmin === undefined) {
      return res.status(400).json({
        status: false,
        error: "isSuperAdmin field is required and must be a boolean.",
      });
    }

    if (!isSuperAdmin && !traccarUserToken) {
      return res.status(400).json({
        status: false,
        error: "Nextop Token is required.",
      });
    }

    const { attributes, calendarId, description, area, name } = restFields;

    const traccarResponse = await axios.post(
      `${traccarApiUrl}/geofences`,
      {
        attributes,
        calendarId,
        description,
        area,
        name,
      },
      {
        headers: {
          Authorization: isSuperAdmin
            ? `Bearer ${traccarBearerToken}`
            : `Bearer ${traccarUserToken}`,
        },
      }
    );

    const parsedGeometery = parseGeofence(area);

    const flespiGeoBody = {
      geometry: {
        path: parsedGeometery.coordinates,
        type: parsedGeometery.type,
      },
      name: "test",
    };

    if (parsedGeometery.type === "corridor") {
      flespiGeoBody.geometry.width = 0.001;
    }

    const FlespiResponse = await axios.post(
      `https://flespi.io/gw/geofences?fields=id%2Cname`,
      [flespiGeoBody],
      {
        headers: {
          "x-flespi-cid": subaccount_cid,
          Authorization: `FlespiToken ${flespiToken}`,
        },
      }
    );

    let responses = {
      userId: userId,
      traccar: traccarResponse.data,
      flespi: FlespiResponse.data.result[0],
      created_by: req.body.userName,
    };

    if (req.body.isSuperAdmin === true) {
      responses.created_role = "superAdmin";
    }
    if (req.body.administrator === true) {
      responses.created_role = "admin";
    }
    if (req.body.superVisor === true) {
      responses.created_role = "supervisor";
    }

    const insertID = await createGeofence(responses);

    responses.id = insertID;

    res.status(200).json({
      status: true,
      message: "Geofence Created successfully.",
      data: responses,
    });
  } catch (error) {
    console.error(
      "Error in creating Geofence:",
      error.response ? error.response.data : error.message
    );

    let errorMessage = "Internal Server Error";
    if (error.response?.data?.includes("Duplicate entry ")) {
      errorMessage = `${req.body.email} already exist`;
    } else if (error.response && error.response.status === 401) {
      errorMessage = "Unauthorized";
    }

    res.status(error.response ? error.response.status : 500).json({
      status: false,
      error: errorMessage,
    });
  }
};

export const allNewGeofences = async (req, res) => {
  try {
    const geofences = await getAllGeofences();

    if (!geofences) {
      res.status(404).json({
        status: false,
        error: "Geofences not found",
      });
      return;
    }
    const foramttedResponse = geofences.map((geofence) => {
      return {
        ...geofence,
        area: JSON.parse(geofence.area),
      };
    });

    res.status(200).json({
      status: true,
      data: foramttedResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const newGeofenceById = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await getGeofenceById(id);

    if (!result) {
      res.status(404).json({
        status: false,
        error: "Geofence not found",
      });
      return;
    }

    res.status(200).json({
      status: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const newGeofenceByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await getGeofencesByUserId(userId);

    if (!result) {
      res.status(404).json({
        status: false,
        error: "Geofences not found",
      });
      return;
    }

    res.status(200).json({
      status: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const updateNewGeofence = async (req, res) => {
  const { userId, isSuperAdmin, traccarUserToken, ...Fields } = req.body;
  const { geofenceType } = Fields;
  const id = req.params.id;
  const geofenceIsStation = geofenceType?.name?.toLowerCase() === "station";
  let newGeofence;
  let assigningResult;

  try {
    const result = await getGeofenceById(id);

    if (!result) {
      return res.status(404).json({
        status: false,
        error: "Geofence not found",
      });
    }

    const { attributes, calendarId, description, area, name } = Fields;
    const requestData = {
      id: result.traccarId,
      attributes: {
        geofenceStation: geofenceType.name,
      },
      calendarId,
      description,
      area: JSON.parse(area),
      name,
    };

    const response = await axios.put(
      `${traccarApiUrl}/geofences/${requestData.id}`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${traccarBearerToken}`,
        },
      }
    );

    const flespiResponse = await axios.put(
      `https://flespi.io/gw/geofences/${result?.flespiId}?fields=id%2Cname`,
      { name, metadata: { geofenceStation: geofenceType.name } },
      {
        headers: {
          Authorization: `FlespiToken ${flespiToken}`,
        },
      }
    );
    const flespiDb = flespiResponse.data.result[0];

    if (flespiDb && geofenceIsStation) {
      newGeofence = flespiResponse.data.result[0]?.id;
      assigningResult = await axios.post(
        `https://flespi.io/gw/calcs/1766118/geofences/${newGeofence}`,
        null,
        {
          headers: {
            Authorization: `FlespiToken ${flespiToken}`,
          },
        }
      );
    }

    const update = await updateGeofenceById(id, response.data, flespiDb);

    return res.status(200).json({
      status: true,
      message: "Geofence Update successfully.",
      data: update,
    });
  } catch (error) {
    console.error("Error in updating geofence:", error);

    let errorMessage = "Internal Server Error";
    let statusCode = 500;

    if (error.response) {
      if (
        error.response.data &&
        error.response.data.includes("Duplicate entry ")
      ) {
        errorMessage = `${req.body.email} already exists`;
        statusCode = error.response.status;
      } else if (error.response.status === 401) {
        errorMessage = "Unauthorized";
        statusCode = 401;
      }
    }

    return res.status(statusCode).json({
      status: false,
      error: errorMessage,
    });
  }
};

export const deleteNewGeofence = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await getGeofenceById(id);

    if (!result) {
      return res.status(404).json({
        status: false,
        error: "Geofence not found",
      });
    }

    const response = await axios.delete(
      `${traccarApiUrl}/geofences/${result.traccarId}`,
      {
        headers: {
          Authorization: `Bearer ${traccarBearerToken}`,
        },
      }
    );

    if (response.status === 204) {
      await softDeleteGeofenceById(id);
    }

    return res.status(200).json({
      status: true,
      message: "Geofence Deleted successfully.",
    });
  } catch (error) {
    console.error("Error in updating geofence:", error);

    let errorMessage = "Internal Server Error";
    let statusCode = 500;

    if (error.response) {
      if (
        error.response.data &&
        error.response.data.includes("Duplicate entry ")
      ) {
        errorMessage = `${req.body.email} already exists`;
        statusCode = error.response.status;
      } else if (error.response.status === 401) {
        errorMessage = "Unauthorized";
        statusCode = 401;
      }
    }

    return res.status(statusCode).json({
      status: false,
      error: errorMessage,
    });
  }
};

export const postGeofenceType = async (req, res) => {
  const body = req.body;

  try {
    if (!body || !body.name || !body.userId) {
      return res.status(400).json({
        status: false,
        error: "Bad Request: Missing required fields",
      });
    }

    const result = await saveGeofenceType(body);

    return res.status(200).json({
      status: true,
      message: `Geofence Type '${body.name}' created successfully, ID: ${result}`,
    });
  } catch (error) {
    let errorMessage = "Internal Server Error";
    let statusCode = 500;

    if (error.code === "ER_DUP_ENTRY") {
      errorMessage = `Geofence Type '${body.name}' already exists.`;
      statusCode = 409;
    } else if (error.code === "ER_BAD_NULL_ERROR") {
      errorMessage = "Required fields are missing.";
      statusCode = 400;
    } else if (error.name === "ValidationError") {
      errorMessage = error.message;
      statusCode = 400;
    }

    return res.status(statusCode).json({
      status: false,
      error: errorMessage,
    });
  }
};

export const getGeofencesTypes = async (req, res) => {
  try {
    const results = await fetchGeofencesTypes();

    if (!results) {
      return res.status(404).json({
        status: false,
        error: "Geofences Types not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: results,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};

export const getGeofencesTypesByUserId = async (req, res) => {
  const { id } = req.params;
  try {
    const results = await fetchGeofencesTypesByUserId(parseInt(id));

    if (!results) {
      return res.status(404).json({
        status: false,
        error: "Geofences Types not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: results,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};

export const getGeofenceTypeById = async (req, res) => {
  const { id } = req.params;
  try {
    const results = await fetchGeofenceTypeById(parseInt(id));

    if (!results) {
      return res.status(404).json({
        status: false,
        error: "Geofence Type not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: results,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};

export const updateGeofenceType = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    await modifyGeofenceTypeById(parseInt(id), body);

    return res.status(200).json({
      status: true,
      message: "Geofence Type updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};

export const deleteGeofenceType = async (req, res) => {
  const { id } = req.params;
  try {
    await removeGeofenceTypeById(parseInt(id));

    return res.status(200).json({
      status: true,
      message: "Geofence Type deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};
