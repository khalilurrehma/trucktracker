import axios from "axios";
import {
  allDevicesIdName,
  bulkServiceUpdate,
  createDevice,
  devicesWithServices,
  existingCombination,
  fetchAllServiceTypes,
  fetchAllServiceTypesByUserId,
  fetchAllSubServices,
  fetchAllSubServicesByUserId,
  getAllDevices,
  getAssignedServicesByDeviceId,
  getDeviceById,
  getDeviceInitialGeofence,
  getDevicesByIds,
  getDevicesByIMEI,
  getDevicesByUserId,
  getDeviceServices,
  getSubServiceById,
  modifyServiceType,
  modifySubService,
  removeServiceType,
  removeSubService,
  saveNewServiceType,
  saveNewSubService,
  serviceById,
  softDeleteDeviceById,
  unassignServicesForDevice,
  updateDeviceById,
} from "../model/devices.js";
import { getAllGroups } from "../model/groups.js";
import { getAllUniqueIds } from "../utils/common.js";
import { subaccountByTraccarId } from "../model/subaccounts.js";
import { extractDefaultCalcsId } from "../model/calculator.js";
import { fetchAllNotificationLogs } from "../model/notifications.js";
import { newDeviceInUsageControl } from "../model/usageControl.js";
import { s3 } from "../services/azure.s3.js";
import { flespiDeviceLiveLocation } from "../services/flespiApis.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { driverNameByDeviceId, driverStatus } from "../model/driver.js";
import { saveSearchHistory } from "../model/dispatch.js";

dayjs.extend(utc);
dayjs.extend(timezone);

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
  const query = req.query;
  let searchId;
  let currentDate;
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

    const deviceIds = await devices.map((device) => device.id);

    const services = await getDeviceServices(deviceIds);

    if (
      query?.address &&
      query?.radius &&
      query?.lat &&
      query?.lng &&
      query?.userId
    ) {
      searchId = await saveSearchHistory({
        userId: query.userId,
        address: query.address,
        radius: query.radius,
        lat: query.lat,
        lng: query.lng,
      });
    }

    if (query?.date) {
      currentDate = query?.date;
    }

    const enrichedDevices = await Promise.all(
      devices.map(async (device) => {
        const initialBase = await getDeviceInitialGeofence(
          device.flespiId,
          currentDate
        );

        const deviceServices = services.filter(
          (service) => service.device_id === device.id
        );

        const serviceDetails = deviceServices.map((service) => ({
          serviceId: service.service_type_id,
          serviceName: service.service_name,
        }));

        const group = groups.find(
          (group) => group.traccarId === device.groupId
        );

        let latitude = null;
        let longitude = null;
        let deviceFixTime = null;
        let deviceSpeed = null;
        let deviceDriver = null;
        let status_availability = null;

        if (query?.deviceLocation) {
          const deviceLocation = await flespiDeviceLiveLocation(
            device.flespiId
          );

          const driver = await driverNameByDeviceId(device.id);

          const driverAvailability = await driverStatus(driver?.id);

          deviceDriver = driver ? driver?.name : null;
          status_availability = driverAvailability
            ? driverAvailability
            : "not associate";

          if (
            Array.isArray(deviceLocation) &&
            deviceLocation[0]?.telemetry?.position?.value &&
            deviceLocation[0].telemetry?.position?.ts
          ) {
            latitude =
              deviceLocation[0].telemetry.position.value.latitude || null;
            longitude =
              deviceLocation[0].telemetry.position.value.longitude || null;

            deviceFixTime = deviceLocation[0].telemetry?.position.ts;

            deviceSpeed = deviceLocation[0].telemetry.position.value.speed;
          }
        }

        const deviceFixTimePeru = dayjs
          .unix(deviceFixTime)
          .tz("America/Lima")
          .format("YYYY-MM-DD HH:mm:ss");

        return {
          ...device,
          groupName: group ? group.name : `Unknown (${device.groupId})`,
          services: serviceDetails,
          initialBase: initialBase ? initialBase.geofence_name : null,
          ...(query?.deviceLocation
            ? {
                location: {
                  lat: latitude,
                  lng: longitude,
                },
                lastConnection: deviceFixTimePeru,
                speed: deviceSpeed,
                driver: deviceDriver,
                driverAvailability: status_availability,
              }
            : {}),
        };
      })
    );

    res.status(200).json({
      status: true,
      data: enrichedDevices,
      searchId: searchId || null,
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
      // service_type: serviceType.id,
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

export const deviceBulkServices = async (req, res) => {
  const { deviceIds, serviceIds } = req.body;

  const isValidArray = (arr) =>
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((id) => Number.isInteger(id) && id > 0);

  if (!isValidArray(deviceIds) || !isValidArray(serviceIds)) {
    return res.status(400).json({
      message: "deviceIds and serviceIds must be arrays of positive integers",
    });
  }

  try {
    let skippedAssignments = [];
    let newAssignments = [];

    const devices = await getDevicesByIds(deviceIds);

    const existingCombinations = await existingCombination(
      deviceIds,
      serviceIds
    );

    const existingCombinationsSet = new Set(
      existingCombinations.map(
        (row) => `${row.device_id}-${row.service_type_id}`
      )
    );

    const deviceMap = new Map(
      devices.map((device) => [device.id, device.name])
    );

    for (const deviceId of deviceIds) {
      for (const serviceId of serviceIds) {
        const combinationKey = `${deviceId}-${serviceId}`;

        if (existingCombinationsSet.has(combinationKey)) {
          skippedAssignments.push({
            deviceId,
            deviceName: deviceMap.get(deviceId),
            serviceId,
          });
        } else {
          newAssignments.push({
            deviceId,
            deviceName: deviceMap.get(deviceId),
            serviceId,
          });
        }
      }
    }

    if (newAssignments.length > 0) {
      await bulkServiceUpdate(newAssignments);
    }

    const message =
      newAssignments.length > 0
        ? `${newAssignments.length} new device-service assignments created.`
        : "No new device-service assignments created.";

    const skippedMessage =
      skippedAssignments.length > 0
        ? `${skippedAssignments.length} existing assignments skipped.`
        : "";

    res.status(200).json({
      status: true,
      message: `${message} ${skippedMessage}`,
      skippedAssignments,
      newAssignments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const getAllDevicesWithServices = async (req, res) => {
  const { userId } = req.query;

  try {
    const devices = await allDevicesIdName(userId);

    if (devices.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No devices found.",
      });
    }

    const devicesWithServicesPromises = devices.map(async (device) => {
      const services = await devicesWithServices(device.id);
      return {
        ...device,
        services: services.map((service) => ({
          id: service.service_id,
          name: service.service_name,
        })),
      };
    });

    const deviceServicesResponse = await Promise.all(
      devicesWithServicesPromises
    );

    res.status(200).json({
      status: true,
      message: deviceServicesResponse,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching devices.",
    });
  }
};

export const deviceAssignedServices = async (req, res) => {
  const { deviceId } = req.params;
  try {
    const services = await getAssignedServicesByDeviceId(deviceId);

    if (services.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No services found for this device.",
      });
    }

    res.status(200).json({
      status: true,
      services: services.map((service) => ({
        id: service.service_type_id,
        name: service.service_name,
      })),
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching assigned services.",
    });
  }
};

export const unassignDeviceServices = async (req, res) => {
  const { deviceId, serviceIds } = req.body;

  if (!deviceId || !Array.isArray(serviceIds) || serviceIds.length === 0) {
    return res.status(400).json({
      status: false,
      message: "Please provide deviceId and an array of serviceIds.",
    });
  }

  try {
    const result = await unassignServicesForDevice(deviceId, serviceIds);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: false,
        message: "No matching service assignments found to unassign.",
      });
    }

    res.status(200).json({
      status: true,
      message: `${result.affectedRows} service(s) unassigned successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error unassigning services.",
    });
  }
};

export const addNewServiceType = async (req, res) => {
  const body = req.body;

  if (!body.name || !body.userId) {
    return res.status(400).json({ message: "Name and userId are required" });
  }

  try {
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

export const allDeviceServiceTypesByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const services = await fetchAllServiceTypesByUserId(userId);

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

export const updateServiceTypeById = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  if (!body.name) {
    return res.status(400).json({ message: "Name is required" });
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

export const allSubServicesByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const services = await fetchAllSubServicesByUserId(userId);
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
