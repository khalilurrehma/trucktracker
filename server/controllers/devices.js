import axios from "axios";
import {
  createDevice,
  fetchAllServiceTypes,
  fetchAllSubServices,
  getAllDevices,
  getDeviceById,
  getDevicesByIMEI,
  getDevicesByUserId,
  getSubServiceById,
  modifyServiceType,
  modifySubService,
  removeServiceType,
  removeSubService,
  saveNewServiceType,
  saveNewSubService,
  serviceById,
  softDeleteDeviceById,
  updateDeviceById,
} from "../model/devices.js";
import { getAllGroups } from "../model/groups.js";
import { getAllUniqueIds } from "../utils/common.js";
import { subaccountByTraccarId } from "../model/subaccounts.js";
import { extractDefaultCalcsId } from "../model/calculator.js";
import { fetchAllNotificationLogs } from "../model/notifications.js";
import { newDeviceInUsageControl } from "../model/usageControl.js";
import { s3 } from "../services/azure.s3.js";

const traccarBearerToken = process.env.TraccarToken;
const traccarApiUrl = `http://${process.env.TraccarPort}/api`;
const flespiToken = process.env.FlespiToken;
const flespiApiUrl = `https://flespi.io/gw`;

export const addNewDevice = async (req, res) => {
  let masterTokenCalcsId = [1742074, 1742075, 1742077];
  let defaultCalcId;
  let mergedCalculatorIds;

  const requestData = req.body;
  const isSuperAdmin =
    typeof requestData.isSuperAdmin === "boolean"
      ? requestData.isSuperAdmin
      : undefined;

  try {
    if (isSuperAdmin === undefined) {
      return res.status(400).json({
        status: false,
        error: "isSuperAdmin field is required and must be a boolean.",
      });
    }

    const missingTokens = [];

    if (!isSuperAdmin && !requestData.flespiUserToken) {
      missingTokens.push("Flespi");
    }

    if (!isSuperAdmin && !requestData.traccarUserToken) {
      missingTokens.push("Nextop");
    }

    if (missingTokens.length > 0) {
      let errorMessage = "Token(s) required for non-superAdmin users: ";
      errorMessage += missingTokens.join(", ");
      return res.status(400).json({
        status: false,
        error: errorMessage,
      });
    }

    if (
      !isSuperAdmin &&
      requestData.flespiUserToken &&
      requestData.traccarUserToken
    ) {
      const fetchUserCalcs = await subaccountByTraccarId(requestData.userId);
      if (!fetchUserCalcs) {
        return res.status(404).json({
          status: false,
          error: "Subaccount not found for the provided Traccar user ID.",
        });
      }

      defaultCalcId = JSON.parse(fetchUserCalcs?.calcs_id) || [];
    } else {
      defaultCalcId = await extractDefaultCalcsId();
    }

    mergedCalculatorIds = [...defaultCalcId, ...masterTokenCalcsId];

    if (!defaultCalcId || defaultCalcId.length < 0) {
      return res.status(500).json({
        status: false,
        error: "Failed to extract default calculator ID.",
      });
    }

    const [traccarAllDevices, flespiAllDevices] = await Promise.all([
      axios.get(`${traccarApiUrl}/devices`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${traccarBearerToken}`,
        },
      }),
      axios.get(
        `${flespiApiUrl}/devices/all?fields=id%2Cname%2Cdevice_type_id%2Cdevice_type_name%2Cconfiguration`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: flespiToken,
          },
        }
      ),
    ]);
    function getDeviceDetails(uniqueId, traccarDevices, flespiDevices) {
      const traccarDevice = traccarDevices.find(
        (device) => device.uniqueId === uniqueId
      );
      const flespiDevice = flespiDevices.find(
        (device) => device.configuration.ident === uniqueId
      );
      return { traccarDevice, flespiDevice };
    }
    const { traccarDevice, flespiDevice } = getDeviceDetails(
      requestData?.uniqueId,
      traccarAllDevices?.data,
      flespiAllDevices?.data?.result
    );
    const requiredFields = ["userId", "name", "uniqueId", "device_type_id"];
    const missingFields = requiredFields.filter((field) => !requestData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }
    const fieldsToIncludeTraccar = [
      "name",
      "uniqueId",
      "status",
      "disabled",
      "groupId",
      "phone",
      "model",
      "contact",
      "category",
      "attributes",
    ];
    const traccarRequestData = {};
    fieldsToIncludeTraccar.forEach((field) => {
      if (req.body[field] !== undefined) {
        traccarRequestData[field] = req.body[field];
      }
    });
    const fieldsToIncludeFlespi = [
      "name",
      "device_type_id",
      "configuration",
      "metadata",
      "media_ttl",
      "messages_ttl",
    ];
    const flespiRequestData = {};
    fieldsToIncludeFlespi.forEach((field) => {
      switch (field) {
        case "media_ttl":
          flespiRequestData[field] =
            req.body[field] !== undefined ? req.body[field] * 86400 : 259200;
          break;
        case "messages_ttl":
          flespiRequestData[field] =
            req.body[field] !== undefined ? req.body[field] * 86400 : 259200;
          break;
        case "configuration":
          flespiRequestData[field] = {
            ident: req.body.uniqueId || undefined,
          };
          break;
        case "metadata":
          const metadataFields = [
            "speedLimit",
            "fuelDropThreshold",
            "fuelIncreaseThreshold",
            "report.ignoreOdometer",
            "web.reportColor",
            "devicePassword",
            "deviceImage",
            "processing.copyAttributes",
            "decoder.timezone",
            "category",
            "groupId",
            "model",
            "contact",
            "phone",
            "expirationTime",
            "disabled",
            "attributes",
          ];
          flespiRequestData[field] = {};
          metadataFields.forEach((metadataField) => {
            if (req.body[metadataField] !== undefined) {
              flespiRequestData[field][metadataField] = req.body[metadataField];
            }
          });
          break;
        default:
          if (req.body[field] !== undefined) {
            flespiRequestData[field] = req.body[field];
          }
      }
    });
    if (traccarDevice && flespiDevice) {
      return res.status(400).json({
        status: false,
        error:
          "Device with this unique ID already exists in both Nextop and Flespi.",
        details: {
          traccarDevice,
          flespiDevice,
        },
        // data: responses,
      });
    } else if (traccarDevice) {
      return res.status(400).json({
        status: false,
        error: "Device with this unique ID already exists in Nextop.",
        details: {
          traccarDevice,
        },
        // data: responses,
      });
    } else if (flespiDevice) {
      const traccarResponse = await axios.post(
        `${traccarApiUrl}/devices`,
        traccarRequestData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: isSuperAdmin
              ? `Bearer ${traccarBearerToken}`
              : `Bearer ${requestData.traccarUserToken}`,
          },
        }
      );
      const traccarResponsePermissions = await axios.post(
        `${traccarApiUrl}/permissions`,
        { userId: req.body.userId, deviceId: traccarResponse.data.id },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${traccarBearerToken}`,
          },
        }
      );
      let responses = {
        userId: req.body.userId,
        password: req.body.password,
        traccar: traccarResponse.data,
        flespi: flespiDevice,
        created_role: isSuperAdmin === true ? "superAdmin" : "admin",
        created_by: req.body.userName,
      };
      const insertID = await createDevice(responses);
      responses.id = insertID;

      await newDeviceInUsageControl(insertID, req.body.userId);

      res.status(200).json({
        status: true,
        message:
          "device with this ident already exist in flespi, device request success in Nextop.",
        data: responses,
      });
    } else {
      const flespiResponse = await axios.post(
        `${flespiApiUrl}/devices?fields=id%2Cname%2Cconfiguration%2Cmetadata%2Cdevice_type_id%2Cdevice_type_name%2Cprotocol_id%2Cprotocol_name`,
        [flespiRequestData],
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: isSuperAdmin
              ? flespiToken
              : requestData.flespiUserToken,
          },
        }
      );

      let deviceId = flespiResponse.data.result[0].id;

      mergedCalculatorIds = [...masterTokenCalcsId, ...defaultCalcId];

      await axios.post(
        `https://flespi.io/gw/calcs/${mergedCalculatorIds}/devices/${deviceId}`,
        null,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: flespiToken,
          },
        }
      );

      const traccarResponse = await axios.post(
        `${traccarApiUrl}/devices`,
        traccarRequestData,
        {
          headers: {
            "Content-Type": "application/json",
            // Authorization: `Bearer ${traccarBearerToken}`,
            Authorization: isSuperAdmin
              ? `Bearer ${traccarBearerToken}`
              : `Bearer ${requestData.traccarUserToken}`,
          },
        }
      );
      const traccarResponsePermissions = await axios.post(
        `${traccarApiUrl}/permissions`,
        { userId: req.body.userId, deviceId: traccarResponse.data.id },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${traccarBearerToken}`,
          },
        }
      );

      let responses = {
        userId: req.body.userId,
        password: req.body.password,
        traccar: traccarResponse.data,
        flespi: {
          ...flespiResponse.data.result[0],
          media_ttl: req.body.media_ttl !== undefined ? req.body.media_ttl : 3,
          messages_ttl:
            req.body.messages_ttl !== undefined ? req.body.messages_ttl : 3,
        },
        created_role: isSuperAdmin === true ? "superAdmin" : "admin",
        created_by: req.body.userName,
      };

      const insertID = await createDevice(responses);
      responses.id = insertID;

      await newDeviceInUsageControl(insertID, req.body.userId);
      res.status(200).json({
        status: true,
        message: "device request success",
        data: responses,
      });
    }
  } catch (error) {
    if (error?.response?.data?.errors) {
      console.error(
        "Error in creating device response data errors:",
        error.response.data.errors
      );
    } else {
      console.error("Error in creating device:", error);
    }
    let errorMessage = "Internal Server Error";
    if (error.response) {
      const flespiErrors = error.response.data.errors;
      if (flespiErrors && flespiErrors.length > 0) {
        errorMessage = `Flespi Error: ${flespiErrors
          .map((err) => err.reason)
          .join(", ")}`;
      } else if (error.response.status === 400) {
        if (error.response.data.includes("Data truncation")) {
          errorMessage =
            "Nextop Error: Data truncation issue. Check date format and value.";
        } else if (error.response.data.includes("Duplicate entry")) {
          errorMessage =
            "Nextop Error: Duplicate entry issue. Choose a different unique identifier.";
        } else {
          errorMessage =
            "Nextop Error: Bad Request. Please check your request data.";
        }
      }
    } else {
      console.log("Unexpected error occurred. Please try again.");
    }
    res.status(error.response ? error.response.status : 500).json({
      status: false,
      errorMessage: errorMessage,
    });
  }
};

export const allNewDevices = async (req, res) => {
  try {
    const devices = await getAllDevices();
    const groups = await getAllGroups();

    if (!devices) {
      res.status(404).json({
        status: false,
        error: "Device not found",
      });
      return;
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

export const newDeviceById = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const device = await getDeviceById(deviceId);

    if (!device) {
      res.status(404).json({
        status: false,
        error: "Device not found",
      });
      return;
    }

    res.status(200).json({
      status: true,
      data: device,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const newDeviceByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const devices = await getDevicesByUserId(parseInt(userId));
    const groups = await getAllGroups();

    if (!devices) {
      res.status(404).json({
        status: false,
        error: "Device not found",
      });
      return;
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

export const extractDeviceIMEIS = async (req, res) => {
  try {
    const data = req.body;
    const uniqueIds = getAllUniqueIds(data);

    const devices = await getDevicesByIMEI(uniqueIds);
    res.json({ status: true, data: devices });
  } catch (error) {
    console.error("Error in /extract-imeis:", error);
    res.status(500).json({ status: false, error: "Internal Server Error" });
  }
};

export const updateNewDevice = async (req, res) => {
  const deviceId = req.params.id;
  const requestData = req.body;

  console.log(requestData);

  try {
    const device = await getDeviceById(deviceId);
    if (!device) {
      return res.status(404).json({
        status: false,
        error: "Device not found",
      });
    }

    const requiredFields = ["userId", "name", "uniqueId", "device_type_id"];
    const missingFields = requiredFields.filter((field) => !requestData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const fieldsToIncludeTraccar = [
      "id",
      "name",
      "uniqueId",
      "status",
      "disabled",
      "groupId",
      "phone",
      "model",
      "contact",
      "category",
      // "expirationTime",
      "attributes",
    ];

    const traccarRequestData = {};

    fieldsToIncludeTraccar.forEach((field) => {
      const requestField = field === "id" ? "traccarId" : field;
      if (req.body[requestField] !== undefined) {
        traccarRequestData[field] = req.body[requestField];
      }
    });

    const fieldsToIncludeFlespi = [
      "name",
      "device_type_id",
      "configuration",
      "metadata",
      "media_ttl",
      "messages_ttl",
    ];

    const flespiRequestData = {};

    fieldsToIncludeFlespi.forEach((field) => {
      switch (field) {
        case "media_ttl":
          flespiRequestData[field] =
            req.body[field] !== undefined ? req.body[field] * 86400 : 259200;
          break;
        case "messages_ttl":
          flespiRequestData[field] =
            req.body[field] !== undefined ? req.body[field] * 86400 : 259200;
          break;
        case "configuration":
          flespiRequestData[field] = {
            ident: req.body.uniqueId || undefined,
          };
          break;
        case "metadata":
          const metadataFields = [
            "speedLimit",
            "fuelDropThreshold",
            "fuelIncreaseThreshold",
            "report.ignoreOdometer",
            "web.reportColor",
            "devicePassword",
            "deviceImage",
            "processing.copyAttributes",
            "decoder.timezone",
            "category",
            "groupId",
            "model",
            "contact",
            "phone",
            "expirationTime",
            "disabled",
            "attributes",
          ];
          flespiRequestData[field] = {};

          metadataFields.forEach((metadataField) => {
            if (req.body[metadataField] !== undefined) {
              flespiRequestData[field][metadataField] = req.body[metadataField];
            }
          });
          break;
        default:
          if (req.body[field] !== undefined) {
            flespiRequestData[field] = req.body[field];
          }
      }
    });

    const serviceType = requestData.serviceType || {};
    if (serviceType?.name) {
      traccarRequestData.attributes = {
        ...(traccarRequestData.attributes || {}),
        serviceType: serviceType.name,
      };

      flespiRequestData.metadata = {
        ...(flespiRequestData.metadata || {}),
        serviceType: serviceType.name,
      };
    }

    const [flespiResponse, traccarResponse] = await Promise.all([
      axios.put(
        `${flespiApiUrl}/devices/${device.flespiId}?fields=id%2Cname%2Cconfiguration%2Cmetadata%2Cdevice_type_id%2Cdevice_type_name%2Cprotocol_id%2Cprotocol_name`,
        flespiRequestData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `FlespiToken ${flespiToken}`,
          },
        }
      ),
      axios.put(
        `${traccarApiUrl}/devices/${device.traccarId}`,
        traccarRequestData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${traccarBearerToken}`,
          },
        }
      ),
    ]);

    const responses = {
      traccar: traccarResponse.data,
      password: req.body.password,
      flespi: {
        ...flespiResponse.data.result[0],
        media_ttl: req.body.media_ttl !== undefined ? req.body.media_ttl : 3,
        messages_ttl:
          req.body.messages_ttl !== undefined ? req.body.messages_ttl : 3,
      },
      service_type: serviceType.id,
      costByKm: requestData.cost_by_km,
    };

    const update = await updateDeviceById(device.id, responses);

    update.attributes = JSON.parse(update.attributes);

    res.status(200).json({
      status: true,
      message: "device update successfully",
      data: update,
    });
  } catch (error) {
    try {
      if (error?.response?.data?.errors) {
        console.error(
          "Error in creating device response data errors:",
          error.response.data.errors
        );

        let errorMessage = "Flespi Error: ";

        const flespiErrors = error.response.data.errors;

        if (flespiErrors && flespiErrors.length > 0) {
          errorMessage += flespiErrors
            .map((err) => `${err.code}: ${err.reason}`)
            .join(", ");
          console.error(errorMessage);
        } else {
          console.error("Unexpected Flespi error format.");
        }

        res.status(error.response.status).json({
          status: false,
          errorMessage: errorMessage,
        });
      } else {
        console.error("Error in creating device:", error);

        let errorMessage = "Internal Server Error";

        if (error.response) {
          const traccarErrorString = error.response.data.toString();

          if (traccarErrorString.includes("Data truncation")) {
            errorMessage =
              "Traccar Error: Data truncation issue. Check date format and value.";
          } else if (traccarErrorString.includes("Duplicate entry")) {
            errorMessage =
              "Traccar Error: Duplicate entry issue. Choose a different unique identifier.";
          } else {
            errorMessage =
              "Traccar Error: Bad Request. Please check your request data.";
          }
        } else {
          console.log("Unexpected error occurred. Please try again.");
        }

        res.status(error.response ? error.response.status : 500).json({
          status: false,
          errorMessage: errorMessage,
        });
      }
    } catch (catchError) {
      console.error("Unexpected error during error handling:", catchError);
      res.status(500).json({
        status: false,
        errorMessage: "Unexpected error occurred.",
      });
    }
  }
};

export const deleteNewDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;

    const device = await getDeviceById(deviceId);
    if (!device) {
      return res.status(404).json({
        status: false,
        error: "Device not found",
      });
    }

    const [traccarResponse, flespiResponse] = await Promise.allSettled([
      axios.delete(`${traccarApiUrl}/devices/${device.traccarId}`, {
        headers: {
          Authorization: `Bearer ${traccarBearerToken}`,
        },
      }),
      axios.delete(`${flespiApiUrl}/devices/${device.flespiId}`, {
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

    const update = await softDeleteDeviceById(deviceId);

    res.status(200).json({
      status: true,
      message: "Device Deleted successfully.",
      // device
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

export const devicesNotifications = async (req, res) => {
  try {
    const notifications = await fetchAllNotificationLogs();

    if (!notifications) {
      return res.status(404).json({
        status: false,
        error: "No notifications found",
      });
    }

    res.status(200).json({
      status: true,
      message: notifications,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const addNewServiceType = async (req, res) => {
  const body = req.body;

  if (!body.name || !body.userId) {
    return res.status(400).json({ message: "Name and userId are required" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No image file provided" });
  }

  const imageFile = req.files[0];

  if (!["image/png", "image/jpeg"].includes(imageFile.mimetype)) {
    return res
      .status(400)
      .json({ message: "Only PNG or JPEG images are allowed" });
  }

  if (imageFile.size > 2 * 1024 * 1024) {
    return res
      .status(400)
      .json({ message: "Image size must be less than 2MB" });
  }

  try {
    const uploadedFile = await s3
      .upload({
        Bucket: process.env.CONTABO_BUCKET_NAME,
        Key: `icon/${Date.now()}-${imageFile.originalname}`,
        Body: imageFile.buffer,
        ContentType: imageFile.mimetype,
        ACL: "public-read",
      })
      .promise();

    body.icon_url = uploadedFile.Location;

    await saveNewServiceType(body);

    res.status(200).json({
      status: true,
      message: `Service Type ${body.name} added successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

export const allDeviceServiceTypes = async (req, res) => {
  try {
    const services = await fetchAllServiceTypes();

    if (!services) {
      return res.status(404).json({
        status: false,
        message: "No services found",
      });
    }

    res.status(200).json({
      status: true,
      message: services,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const getDeviceServiceType = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await serviceById(id);

    if (!service) {
      return res.status(404).json({
        status: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      status: true,
      message: service,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const updateServiceTypeById = async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const imageFile = req.files?.[0];

  if (!body.name) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (imageFile) {
    if (!["image/png", "image/jpeg"].includes(imageFile.mimetype)) {
      return res
        .status(400)
        .json({ message: "Only PNG or JPEG images are allowed" });
    }

    if (imageFile.size > 2 * 1024 * 1024) {
      return res
        .status(400)
        .json({ message: "Image size must be less than 2MB" });
    }

    try {
      const uploadedFile = await s3
        .upload({
          Bucket: process.env.CONTABO_BUCKET_NAME,
          Key: `icon/${Date.now()}-${imageFile.originalname}`,
          Body: imageFile.buffer,
          ContentType: imageFile.mimetype,
          ACL: "public-read",
        })
        .promise();

      body.icon_url = uploadedFile.Location;
    } catch (err) {
      return res
        .status(500)
        .json({ message: err.message || "Image upload failed" });
    }
  }

  try {
    await modifyServiceType(id, body);

    res.status(200).json({
      status: true,
      message: `Service Type ${body.name} updated successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message || "Service update failed",
    });
  }
};

export const deleteServiceType = async (req, res) => {
  const { id } = req.params;
  try {
    await removeServiceType(id);

    res.status(200).json({
      status: true,
      message: `Service Type deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const addNewSubService = async (req, res) => {
  const body = req.body;

  if (!body.name || !body.service_type) {
    return res
      .status(400)
      .json({ message: "Name and service_type are required" });
  }

  try {
    await saveNewSubService(body);
    res.status(200).json({
      status: true,
      message: `Sub Service ${body.name} added successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

export const allSubServices = async (req, res) => {
  try {
    const services = await fetchAllSubServices();
    if (!services || services.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No sub services found",
      });
    }

    res.status(200).json({
      status: true,
      message: services,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const subServiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await getSubServiceById(id);
    if (!service) {
      return res.status(404).json({
        status: false,
        message: "Sub Service not found",
      });
    }

    res.status(200).json({
      status: true,
      message: service,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const updateSubService = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  if (!body.name || !body.service_type) {
    return res
      .status(400)
      .json({ message: "name and service_type are required" });
  }

  try {
    await modifySubService(id, body);
    res.status(200).json({
      status: true,
      message: `Sub Service ${body.name} updated successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message || "Sub Service update failed",
    });
  }
};

export const deleteSubService = async (req, res) => {
  const { id } = req.params;
  try {
    await removeSubService(id);
    res.status(200).json({
      status: true,
      message: `Sub Service deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
