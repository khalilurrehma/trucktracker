import axios from "axios";
import { getAllDrivers } from "../model/drivers.js";
import { getAllDevices, getAllGroup } from "../model/devices.js";

const apiUrl = `https://flespi.io/gw/devices/all/messages?data=%7B%22reverse%22%3Atrue%2C%22count%22%3A1%2C%22fields%22%3A%22timestamp%2Cdevice.id%2Cdevice.name%2Cident%2Cposition.latitude%2Cposition.longitude%2Crfid.code%2Cmovement.status%22%7D`;
const flespiToken = process.env.FlespiToken;

export const getDispatchData = async (req, res) => {
  console.log(flespiToken);

  const headers = {
    Authorization: `FlespiToken ${flespiToken}`,
  };
  try {
    const response = await axios.get(apiUrl, { headers });

    res.status(200).json({
      status: true,
      data: response.data.result,
    });
  } catch (error) {
    if (
      error.response?.data?.errors &&
      Array.isArray(error.response?.data?.errors)
    ) {
      res.status(error.response.status).json({
        status: false,
        errors: error.response?.data?.errors,
      });
    } else {
      res.status(500).json({
        status: false,
        message: `Error: ${error.message}`,
      });
    }
  }
};

export const getNewDrivers = async (req, res) => {
  try {
    const drivers = await getAllDrivers();

    if (!drivers) {
      return res.status(404).json({
        status: false,
        message: "No drivers found",
      });
    }

    const flattenedDrivers = drivers.map((driver) => {
      if (driver.attributes) {
        return { ...driver, ...driver.attributes };
      }
      return driver;
    });

    res.status(200).json({
      status: true,
      data: flattenedDrivers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const getNewDevices = async (req, res) => {
  try {
    const devices = await getAllDevices();
    const groups = await getAllGroup();

    if (!devices || !groups) {
      return res.status(404).json({
        status: false,
        message: "No devices or groups found",
      });
    }

    const enrichedDevices = devices.map((device) => {
      const group = groups.find((group) => group.traccarId === device.groupId);
      return {
        ...device,
        groupName: group ? group.name : `Unknown (${device.groupId})`,
      };
    });

    res.status(200).json({
      status: true,
      data: enrichedDevices,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const getNewGroups = async (req, res) => {
  try {
    const group = await getAllGroup();

    if (!group) {
      return res.status(404).json({
        status: false,
        message: "No groups found",
      });
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

export const dispatchTask = async (req, res) => {
  const body = req.body;
};
