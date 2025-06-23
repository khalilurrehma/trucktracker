import {
  devicesByTypeId,
  executionStatus,
  flespiDeviceLiveLocation,
  flespiDevicesConnectionStatus,
  flespiDevicesEngineIgnitionStatus,
  flespiDevicesIgnitionStatus,
  getFlespiDevices,
  getFlespiDeviceTypes,
  instantExecutionCommand,
  sendCommandToFlespiDevice,
  telemetryDoutStatus,
} from "../services/flespiApis.js";
import axios from "axios";
import { getDeviceRadiusReport } from "../utils/device.radius.js";
import {
  fetchAllDevices,
  getDeviceById,
  putDeviceShift,
} from "../model/devices.js";
import {
  getLatestDeviceEvents,
  getLatestDeviceEventsByUserId,
  getLatestOperationAlarms,
  getLatestOperationAlarmsByUserId,
} from "../model/notifications.js";
import { realmUserById, realmUserByTraccarId } from "../model/realm.js";

export const getAllDevices = async (req, res) => {
  try {
    // const data = await getFlespiDevices();
    const data = await fetchAllDevices();

    res.status(200).send({ success: true, message: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: "Server error" });
  }
};

export const getAllDevicesDropDown = async (req, res) => {
  try {
    const data = await getFlespiDevices();

    const devices = data.result.map((device) => ({
      id: device.id,
      name: device.name,
      protocol_id: device.protocol_id,
    }));

    res.status(200).send({ success: true, message: devices });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: "Server error" });
  }
};

export const getDevicesTypes = async (req, res) => {
  try {
    const data = await getFlespiDeviceTypes();

    res.status(200).send({ success: true, message: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: "Server error" });
  }
};

export const getDevices_DevicesTypes = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await devicesByTypeId(id);

    res.status(200).send({ success: true, message: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: "Server error" });
  }
};

export const getDeviceDoutState = async (req, res) => {
  const { deviceId } = req.params;

  try {
    const response = await telemetryDoutStatus(parseInt(deviceId));

    res.status(200).send({ success: true, message: response });
  } catch (error) {
    // console.log(error.message);
    return res.status(500).json({ status: false, error: "Server error" });
  }
};

export const devicesConnectionStatus = async (req, res) => {
  const { deviceId } = req.params;

  try {
    const response = await flespiDevicesConnectionStatus(deviceId);

    res.status(200).send({ success: true, message: response.result });
  } catch (error) {
    // console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const devicesEngineStatus = async (req, res) => {
  const { deviceId } = req.params;

  try {
    const response = await flespiDevicesEngineIgnitionStatus(deviceId);

    res.status(200).send({ success: true, message: response.result });
  } catch (error) {
    // console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const devicesIgnitionStatus = async (req, res) => {
  const { deviceId } = req.params;

  try {
    const response = await flespiDevicesIgnitionStatus(deviceId);

    res.status(200).send({ success: true, message: response.result });
  } catch (error) {
    // console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const getDevice = async () => {};

export const createDevice = async () => {
  const {
    name,
    uniqueId,
    phone,
    model,
    contact,
    category,
    disabled,
    created_by,
  } = req.body;

  if (!name || !uniqueId) {
    return res
      .status(400)
      .json({ status: false, error: "Name and uniqueId are required fields" });
  }

  try {
    const traccarData = {
      name,
      uniqueId,
      ...(phone && { phone }),
      ...(model && { model }),
      ...(contact && { contact }),
      ...(category && { category }),
      disabled,
    };

    const traccarResponse = await axios.post(
      `http://${process.env.TraccarPort}/api/devices`,
      traccarData,
      {
        headers: {
          Authorization: `Bearer ${process.env.TraccarToken}`,
        },
      }
    );

    if (traccarResponse.status === 200) {
      const flespiResponse = await axios.post(
        "https://flespi.io/gw/devices",
        [{ configuration: {}, device_type_id: 0 }],
        {
          headers: {
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        }
      );

      const responseData = {
        status: true,
        created_by,
        traccarData: traccarResponse.data,
        flespiData: flespiResponse.data.result[0],
      };

      await insertOrUpdateDeviceData([responseData]);
      res.json(responseData);
    } else {
      res.json({ status: true, traccarData: traccarResponse.data });
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      res.status(400).json({ status: false, error: error.response.data });
    } else {
      console.error("Error in /create-device:", error);
      res.status(500).json({ status: false, error: "Internal Server Error" });
    }
  }
};

export const handleDeviceStatus = async (req, res) => {
  const { deviceId } = req.params;
  const { status, queuettl } = req.body;

  const body = [
    {
      name: "custom",
      properties: {
        text: status,
      },
      ttl: queuettl,
    },
  ];

  try {
    const data = await sendCommandToFlespiDevice(deviceId, body);
    res.status(200).json({ status: true, message: data.result[0] });
  } catch (error) {
    console.error("Error in /handle-device-status:", error);
    res.status(500).json({ status: false, error: error });
  }
};

export const deviceInstantCommand = async (req, res) => {
  const { deviceId } = req.params;
  const { status } = req.body;

  const body = [
    {
      name: "custom",
      properties: {
        text: status,
      },
    },
  ];
  try {
    const data = await instantExecutionCommand(deviceId, body);

    res.status(200).json({ status: true, message: data.result[0] });
  } catch (error) {
    console.error("Error in /device-instant-command:", error);
    res.status(500).json({ status: false, error: error });
  }
};

export const commandExecution = async (req, res) => {
  const { deviceId, commandId } = req.params;

  try {
    const response = await executionStatus(deviceId, commandId);
    res.status(200).json({ status: true, message: response?.result[0] });
  } catch (error) {
    console.error("Error in /command-execution-status:", error);
    res.status(500).json({ status: false, error: error });
  }
};

export const deviceLiveLocation = async (req, res) => {
  const { deviceId } = req.params;

  try {
    let dev = await getDeviceById(deviceId);

    const response = await flespiDeviceLiveLocation(dev.flespiId);
    const formattedResponse = response?.map((value) => {
      const { position } = value?.telemetry;
      return {
        latitude: position.value.latitude,
        longitude: position.value.longitude,
      };
    });

    res.status(200).json({ success: true, message: formattedResponse[0] });
  } catch (error) {
    console.error("Error in /device-live-location:", error);
    res.status(500).json({ status: false, error: error });
  }
};

export const deviceWithInRadius = async (req, res) => {
  const { deviceLocation, authLocation } = req.body;

  try {
    const radius = getDeviceRadiusReport(deviceLocation, authLocation);

    if (radius === null) {
      return res
        .status(400)
        .json({ status: false, error: "Invalid device location" });
    }

    if (radius) {
      res.status(200).json({ success: true, message: "Device with in radius" });
    } else if (!radius) {
      res
        .status(200)
        .json({ success: false, message: "Device outside radius" });
    }
  } catch (error) {
    console.error("Error in /device-within-radius:", error);
    res.status(500).json({ status: false, error: error });
  }
};

export const updateDeviceShift = async (req, res) => {
  const { deviceId } = req.params;
  const { shiftId } = req.body;

  try {
    const response = await putDeviceShift(deviceId, shiftId);

    res
      .status(200)
      .json({ status: true, message: `Device shift updated to ${deviceId}` });
  } catch (error) {
    console.error("Error in /update-device-shift:", error);
    res.status(500).json({ status: false, error: error });
  }
};

export const devicesAlarmLogs = async (req, res) => {
  const userId = Number(req.params.userId);
  const nonAdmin = req.query.non_admin === "true";

  try {
    if (nonAdmin) {
      const nonAdminCompanyId = await realmUserByTraccarId(userId);

      let companyId = nonAdminCompanyId[0].userId;

      if (!companyId) {
        return res.status(400).json({
          status: false,
          error: "You are not authorized to access this resource",
        });
      }

      const resp = await getLatestOperationAlarmsByUserId(companyId);

      res.status(200).json({ status: true, message: resp });
    } else {
      let resp;
      if (userId === 1) {
        resp = await getLatestOperationAlarms();
      } else {
        resp = await getLatestOperationAlarmsByUserId(userId);
      }

      res.status(200).json({ status: true, message: resp });
    }
  } catch (error) {
    res.status(500).json({ status: false, error: error });
  }
};

export const devicesEvents = async (req, res) => {
  const userId = Number(req.params.userId);
  const { non_admin, page = 1, limit = 15, search, date } = req.query;
  const isNonAdmin = non_admin === "true";
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let events;
    let total;

    if (isNonAdmin) {
      const nonAdminCompanyId = await realmUserByTraccarId(userId);
      let companyId = nonAdminCompanyId[0]?.userId;
      if (!companyId) {
        return res.status(400).json({
          status: false,
          error: "You are not authorized to access this resource",
        });
      }
      ({ events, total } = await getLatestDeviceEventsByUserId(companyId, {
        limit: Number(limit),
        offset,
        search,
        date,
      }));
    } else {
      if (userId === 1) {
        ({ events, total } = await getLatestDeviceEvents({
          limit: Number(limit),
          offset,
          search,
          date,
        }));
      } else {
        ({ events, total } = await getLatestDeviceEventsByUserId(userId, {
          limit: Number(limit),
          offset,
          search,
          date,
        }));
      }
    }

    res.status(200).json({ status: true, message: { data: events, total } });
  } catch (error) {
    console.error("Error fetching device events:", error);
    res.status(500).json({ status: false, error: error.message });
  }
};

export const traccarListOfDevices = async (req, res) => {};
