import axios from "axios";
import {
  createGroup,
  getAllGroups,
  getGroupById,
  getGroupsByUserId,
  softDeleteGroupById,
  updateGroupById,
} from "../model/groups.js";

const traccarBearerToken = process.env.TraccarToken;
const traccarApiUrl = `http://${process.env.TraccarPort}/api`;
const flespiToken = process.env.FlespiToken;
const flespiApiUrl = `https://flespi.io/gw`;

export const addNewGroup = async (req, res) => {
  const { subaccount_cid } = req.body;

  const traccarRequestData = {
    name: req.body.name,
  };

  if (req.body.attributes) {
    traccarRequestData.attributes = req.body.attributes;
  }

  if (req.body.groupId) {
    traccarRequestData.groupId = req.body.groupId;
  }

  const flespiRequestData = {
    name: req.body.name,
    metadata: {},
  };

  if (req.body.groupId) {
    flespiRequestData.metadata.groupId = req.body.groupId;
  }

  if (req.body.attributes) {
    flespiRequestData.metadata = {
      ...flespiRequestData.metadata,
      ...req.body.attributes,
    };
  }

  try {
    const [traccarResponse, flespiResponse] = await Promise.all([
      axios.post(`${traccarApiUrl}/groups`, traccarRequestData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${traccarBearerToken}`,
        },
      }),
      axios.post(
        `${flespiApiUrl}/groups?fields=id%2Cname%2Cmetadata`,
        [flespiRequestData],
        {
          headers: {
            "x-flespi-cid": subaccount_cid,
            Authorization: flespiToken,
          },
        }
      ),
    ]);

    const traccarResponsePermissions = await axios.post(
      `${traccarApiUrl}/permissions`,
      { userId: req.body.userId, groupId: traccarResponse.data.id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${traccarBearerToken}`,
        },
      }
    );

    let responses = {
      userId: req.body.userId,
      traccar: traccarResponse.data,
      flespi: flespiResponse.data.result[0],
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

    const insertID = await createGroup(responses);

    responses.id = insertID;

    res.status(200).json({
      status: true,
      message: "Group created successfully",
      data: responses,
    });
  } catch (error) {
    console.error(
      "Error in creating group:",
      error.response ? error.response.data : error.message
    );

    let errorMessage = "Internal Server Error";
    if (error.response && error.response.status === 400) {
      errorMessage = "Bad Request: Invalid data provided";
    } else if (error.response && error.response.status === 401) {
      errorMessage = "Unauthorized";
    }

    res.status(error.response ? error.response.status : 500).json({
      status: false,
      error: errorMessage,
    });
  }
};

export const newGroupByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const groups = await getGroupsByUserId(userId);

    res.status(200).json({
      status: true,
      data: groups,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const allNewGroups = async (req, res) => {
  try {
    const group = await getAllGroups();

    if (!group) {
      res.status(404).json({
        status: false,
        error: "Group not found",
      });
      return;
    }

    res.status(200).json({
      status: true,
      data: group,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const newGroupById = async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await getGroupById(groupId);

    if (!group) {
      res.status(404).json({
        status: false,
        error: "Group not found",
      });
      return;
    }

    res.status(200).json({
      status: true,
      data: group,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const updateNewGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await getGroupById(groupId);

    if (!group) {
      return res.status(404).json({
        status: false,
        error: "Group not found",
      });
    }

    const traccarRequestData = {
      name: req.body.name,
      id: group.traccarId,
    };

    if (req.body.attributes) {
      traccarRequestData.attributes = req.body.attributes;
    }

    if (req.body.groupId) {
      traccarRequestData.groupId = req.body.groupId;
    }

    const flespiRequestData = {
      name: req.body.name,
      metadata: {},
    };

    if (req.body.groupId) {
      flespiRequestData.metadata.groupId = req.body.groupId;
    }

    if (req.body.attributes) {
      flespiRequestData.metadata = {
        ...flespiRequestData.metadata,
        ...req.body.attributes,
      };
    }

    const [traccarResponse, flespiResponse] = await Promise.all([
      axios.put(
        `${traccarApiUrl}/groups/${group.traccarId}`,
        traccarRequestData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${traccarBearerToken}`,
          },
        }
      ),
      axios.put(
        `${flespiApiUrl}/groups/${group.flespiId}?fields=id%2Cname%2Cmetadata`,
        flespiRequestData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: flespiToken,
          },
        }
      ),
    ]);

    const responses = {
      traccar: traccarResponse.data,
      flespi: flespiResponse.data.result[0],
    };

    const update = await updateGroupById(groupId, responses);

    update.attributes = JSON.parse(update.attributes);

    res.status(200).json({
      status: true,
      data: update,
      message: "Group Updated successfully.",
    });
  } catch (error) {
    console.error(error);
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

export const deleteNewGroup = async (req, res) => {
  try {
    const groupId = req.params.id;

    const group = await getGroupById(groupId);

    if (!group) {
      return res.status(404).json({
        status: false,
        error: "Group not found",
      });
    }

    const [traccarResponse, flespiResponse] = await Promise.allSettled([
      axios.delete(`${traccarApiUrl}/groups/${group.traccarId}`, {
        headers: {
          Authorization: `Bearer ${traccarBearerToken}`,
        },
      }),
      axios.delete(`${flespiApiUrl}/groups/${group.flespiId}`, {
        headers: {
          Authorization: flespiToken,
        },
      }),
    ]);

    const failedRequests = [traccarResponse, flespiResponse].filter(
      (result) => result.status === "rejected"
    );

    if (failedRequests.length > 0) {
      const errorDetails = failedRequests.map(
        (result) => result.reason.message
      );
      console.error("Failed Requests:", errorDetails);

      return res.status(500).json({
        status: false,
        error: "Failed to delete from external services",
        details: errorDetails,
      });
    }

    const update = await softDeleteGroupById(groupId);

    res.status(200).json({
      status: true,
      message: "Group Deleted successfully.",
    });
  } catch (error) {
    console.error(error);

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
