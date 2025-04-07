import {
  getAllNewUsers,
  modifyNewUser,
  newUserById,
  newUserByUserId,
  removeNewUser,
} from "../model/user.js";
import axios from "axios";
import { fetchRealms } from "../services/flespiApis.js";

const TraccarPort = "194.163.182.24:8082";
const traccarBearerToken =
  "RzBFAiAomaVq6GfPtrxQZTspr_pa7aaaUU_1IAdpjRJwLCkFJgIhAIrM2wkDw2kydXLUek-1uQqDshAD11qjzU9e3eZr7sQgeyJ1IjoxLCJlIjoiMjEyMy0xMS0xMVQwNTowMDowMC4wMDArMDA6MDAifQ";

const flespiToken =
  "DO3Z45affw3w5gOo04nP66scC73W5yIwbzl3tl7wGYQB4uOSn1xjVNllJc8EzE1A";
function formatTimeISO(dateString) {
  const date = new Date(dateString);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const dateStr = `${day} ${month} ${date.getUTCDate()} ${year}`;
  const timeStr = date.toLocaleTimeString("en-US", { hour12: false });
  return `${dateStr} ${timeStr}`;
}

export const getNewUser = async (req, res) => {
  try {
    const newUsers = await getAllNewUsers();

    const transformedUser = newUsers.map((user) => {
      return {
        ...user,
        time: formatTimeISO(user.created_at),
        administrator: user.administrator === 1,
      };
    });

    res.status(200).json({ status: true, data: transformedUser });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getNewUserById = async (req, res) => {
  const id = req.params.id;
  try {
    const newUser = await newUserById(id);

    if (!newUser) {
      return res.status(404).json({ status: false, error: "User not found" });
    }

    res.status(200).json({ status: true, data: newUser });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getNewUserByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const newUsers = await newUserByUserId(userId);

    const transformedUser = {
      ...newUsers,
      time: formatTimeISO(newUsers.created_at),
      administrator: newUsers.administrator === 1,
    };

    res.status(200).json({ status: true, data: transformedUser });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const editNewUserById = async (req, res) => {
  const id = req.params.id;
  const { traccarId, flespiId, userId, name, created_at, ...restFields } =
    req.body;

  try {
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
      axios.put(`http://${TraccarPort}/api/users/${userId}`, requestData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${traccarBearerToken}`,
        },
      }),
      axios.put(
        `https://flespi.io/platform/subaccounts/${flespiId}?fields=id%2Cname%2Cemail%2Cmetadata`,
        flespiRequest,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: flespiToken,
          },
        }
      ),
    ]);

    const responses = {
      id,
      traccar: traccarResponse.data,
      flespi: flespiResponse.data.result[0],
    };

    const update = await modifyNewUser(responses.id, responses);

    res.status(200).json({
      status: true,
      message: "User updated successfully",
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

export const deleteNewUser = async (req, res) => {
  const id = req.params.id;
  try {
    const removedUser = await removeNewUser(id);

    if (removedUser.affectedRows === 1) {
      res
        .status(200)
        .json({ status: true, message: "User deleted successfully" });
    } else {
      res.status(404).json({ status: false, error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, error: error.message });
  }
};
