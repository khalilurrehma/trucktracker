import {
  addNewCase,
  addNewZonePrice,
  caseTrackingById,
  fetchCaseReportById,
  fetchDispatchCases,
  fetchDispatchCasesByUserId,
  fetchSubserviceLocationData,
  findCaseById,
  findCaseByName,
  findCaseStatusById,
  getAllNotifications,
  getNotificationsByCompanyId,
  initialCaseStageStatus,
  onTheWayCaseStageStatus,
  processTemplateForAdmin,
  processTimeTemplate,
  saveAdminOverrideTemplate,
  saveCaseAssignedDeviceId,
  saveCaseReportNotification,
  saveDispatchCaseAction,
  saveDispatchCaseReport,
  saveInvolvedVehicle,
  saveRimacCase,
  saveVehiclePhoto,
  setNewStatusNotification,
  updateCaseReportStatus,
  updateCaseServiceById,
  updateCaseStatusById,
} from "../model/dispatch.js";
import {
  driverStatusAvailable,
  driverStatusInService,
  getDriverIdsByDeviceIds,
  getFcmTokensByDriverIds,
} from "../model/driver.js";
import { getAuthenticatedS3String, s3 } from "../services/azure.s3.js";
import { EventEmitter } from "events";
import { sendPushNotification } from "../utils/pushNotification.js";
import {
  realmUserByTraccarId,
  realmUserTraccarIdsByUserId,
} from "../model/realm.js";
import {
  checkAndMarkDelayedCase,
  checkReportAuthorizedStatus,
  defaultTemplateTime,
  getDispatchCaseAction,
  markCaseStage,
  markCaseStageAsDelayed,
  onTheWayStageStatusCheck,
  saveAuthorizationRequestStage,
} from "../services/dispatchService.js";

export const DispatchEmitter = new EventEmitter();

export const handleNewDispatchCase = async (req, res) => {
  const { userId, caseName, caseAddress, lat, lng, message, devicesMeta } =
    req.body;
  let assignedDeviceIds = req.body.assignedDeviceIds;
  let files;

  assignedDeviceIds = JSON.parse(assignedDeviceIds);

  // assignedDeviceIds = [assignedDeviceIds];

  if (!Array.isArray(assignedDeviceIds)) {
    return res
      .status(400)
      .json({ success: false, message: "Provided Device Ids are not Array!" });
  }

  if (!caseName || !caseAddress) {
    return res
      .status(400)
      .json({ success: false, message: `Missing required fields` });
  }

  try {
    const dbBody = {
      user_id: userId,
      case_name: caseName,
      case_address: caseAddress,
      position: { lat, lng },
      message,
      devicesMeta,
    };

    if (req.files && Array.isArray(req.files)) {
      const uploadedFiles = [];

      for (const file of req.files) {
        const uploadedFile = await s3
          .upload({
            Bucket: process.env.CONTABO_BUCKET_NAME,
            Key: `dispatch-case-image/${Date.now()}-${
              file.originalname || "no-file"
            }`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: "public-read",
          })
          .promise();

        if (!uploadedFile) {
          return res.status(500).json({
            status: false,
            message: "Failed to upload one or more images",
          });
        }

        uploadedFiles.push({
          filename: file.originalname || "no-file",
          url: getAuthenticatedS3String(uploadedFile.Location),
        });
      }

      dbBody.file_data = uploadedFiles;
    }

    const newCase_id = await addNewCase(dbBody);

    await Promise.all(
      assignedDeviceIds.map((device_id) =>
        saveCaseAssignedDeviceId(newCase_id, device_id)
      )
    );

    const stage = await defaultTemplateTime("advisor_assignment");

    let expectedDuration = stage ? stage?.time_sec : 60;

    const driverIds = await getDriverIdsByDeviceIds(assignedDeviceIds);

    if (driverIds.length > 0) {
      const fcmTokens = await getFcmTokensByDriverIds(driverIds);

      if (fcmTokens.length > 0) {
        const notificationTitle = "New Case Assigned";
        const notificationBody = `You have a new case: ${caseName} at ${caseAddress}`;
        const payload = {
          userId,
          caseName,
          caseAddress,
          position: { lat, lng },
          message,
          status: "pending",
          file_data: dbBody.file_data || [],
          assignedDeviceIds,
          createdAt: Date.now(),
          respondWithin: expectedDuration,
        };

        const { successCount, failureCount } = await sendPushNotification(
          fcmTokens,
          notificationTitle,
          notificationBody,
          payload
        );
        console.log(
          `Notifications sent: ${successCount} succeeded, ${failureCount} failed`
        );
      } else {
        console.log("No FCM tokens found for drivers");
      }
    } else {
      console.log("No drivers found for the provided device IDs");
    }

    await initialCaseStageStatus({ caseId: newCase_id });

    setTimeout(() => {
      checkAndMarkDelayedCase(newCase_id);
    }, expectedDuration * 1000);

    res.status(201).json({
      status: true,
      message: `Case saved, Case ID: ${newCase_id} and request send successfully!`,
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

export const fetchAllDispatchCases = async (req, res) => {
  const { userId } = req.query;
  const superVisor = JSON.parse(req.query.superVisor || "false");

  try {
    let dispatchCases;

    if (!superVisor) {
      if (parseInt(userId) === 1) {
        dispatchCases = await fetchDispatchCases();
      } else {
        dispatchCases = await fetchDispatchCasesByUserId(userId);
      }
    } else {
      const fetchSuperVisorCompanyId = await realmUserByTraccarId(userId);
      const companyId = fetchSuperVisorCompanyId[0].userId;

      dispatchCases = await fetchDispatchCasesByUserId(companyId);
    }

    res.status(200).json({
      status: true,
      data: dispatchCases,
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

export const dispatchCaseSearch = async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Case name is required" });
  }

  try {
    const caseData = await findCaseByName(name);

    if (caseData.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Case not found" });
    }

    res.status(200).json({
      status: true,
      message: "Case found",
      case: caseData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDispatchCaseTracking = async (req, res) => {
  const { caseId } = req.params;

  if (!caseId) {
    return res
      .status(400)
      .json({ success: false, message: "Case Id is required" });
  }

  try {
    const caseData = await caseTrackingById(caseId);

    res.status(200).json({
      status: true,
      message: "Case subprocesses loaded",
      case: caseData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleCaseAction = async (req, res) => {
  const driverId = req.userId;
  const { caseId } = req.params;
  const { action, rejection_reason } = req.body;

  if (!caseId) {
    return res.status(400).json({ error: "Case Id is required" });
  }

  try {
    let dbBody = {
      case_id: caseId,
      driver_id: driverId,
      action,
    };

    if (action === "reject") {
      if (!rejection_reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      dbBody.rejection_reason = rejection_reason;
    }

    await saveDispatchCaseAction(dbBody);

    if (action === "accept") {
      const stage = await defaultTemplateTime("on_the_way");

      let expectedDuration = stage ? stage?.time_sec : 60;

      await updateCaseStatusById(caseId, "in progress");
      await driverStatusInService(driverId);
      await onTheWayCaseStageStatus({
        caseId,
        expected_duration: expectedDuration,
      });

      setTimeout(() => {
        onTheWayStageStatusCheck(caseId);
      }, expectedDuration * 1000);
    }

    res.status(200).json({
      status: true,
      message: "Case action saved successfully",
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

export const authorizeCaseReport = async (req, res) => {
  const { reportId, driverId } = req.params;

  if (!reportId || !driverId) {
    return res.status(400).json({
      status: false,
      message: "Report ID and Driver ID are required",
    });
  }

  try {
    const result = await updateCaseReportStatus(reportId, true);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: false,
        message: "Report not found or already authorized",
      });
    }

    const fcmToken = await getFcmTokensByDriverIds(driverId);

    if (fcmToken.length > 0) {
      const notificationTitle = "Case Report Authorized";
      const notificationBody = `Your case report has been authorized.`;
      const { successCount, failureCount } = await sendPushNotification(
        fcmToken,
        notificationTitle,
        notificationBody
      );
      console.log(
        `Notifications sent: ${successCount} succeeded, ${failureCount} failed`
      );
    } else {
      console.log("No FCM token found for driver");
    }

    return res.status(200).json({
      status: true,
      message: "Report authorized successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const getDispatchCaseReport = async (req, res) => {
  const { caseId } = req.params;

  if (!caseId) {
    return res.status(400).json({
      status: false,
      message: "Case ID is required",
    });
  }

  try {
    const report = await fetchCaseReportById(caseId);

    return res.status(200).json({
      status: true,
      message: report || [],
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const dispatchCaseReport = async (req, res) => {
  const driverId = req.userId;
  const { caseId, companyId } = req.params;
  const { suggestedServices, subservices, additionalInformation, vehicles } =
    req.body;

  if (!caseId || !driverId || !companyId) {
    return res.status(400).json({
      status: false,
      message: "Case ID and driver ID are required",
    });
  }

  if (!companyId) {
    return res.status(400).json({
      status: false,
      message: "Company ID is required in API V1.1",
    });
  }

  if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
    return res.status(400).json({
      status: false,
      message: "At least one vehicle is required",
    });
  }

  try {
    const caseCheck = await findCaseStatusById(caseId);

    if (!caseCheck.length || caseCheck[0].status !== "in progress") {
      let message = `Case not found`;
      let caseProgressMsg = `Case not in progress yet!`;
      return res.status(400).json({
        status: false,
        message: !caseCheck.length ? message : caseProgressMsg,
      });
    }

    const reportData = {
      case_id: parseInt(caseId),
      driver_id: parseInt(driverId),
      suggested_services: suggestedServices || null,
      subservices: subservices || null,
      additional_information: additionalInformation || null,
    };

    const reportId = await saveDispatchCaseReport(reportData);

    for (const vehicle of vehicles) {
      const vehicleId = await saveInvolvedVehicle(reportId, vehicle);
      if (vehicle.photos && Array.isArray(vehicle.photos)) {
        for (const photo of vehicle.photos) {
          if (!photo.category || !photo.type || !photo.url) {
            throw new Error(
              "Invalid photo data: category, type, and url are required"
            );
          }
          await saveVehiclePhoto(vehicleId, photo);
        }
      }
    }

    const superVisorIds = await realmUserTraccarIdsByUserId(companyId);

    const reportDetails = {
      reportId,
      caseId: parseInt(caseId),
      driverId: parseInt(driverId),
      companyId: parseInt(companyId),
      superVisorIds: superVisorIds || null,
      caseName: caseCheck[0]?.case_name,
      createdAt: new Date().toISOString(),
    };

    const stage = await defaultTemplateTime("supervisor_approval");

    let expectedDuration = stage ? stage?.time_sec : 60;

    await saveAuthorizationRequestStage(caseId, expectedDuration);

    setTimeout(() => {
      checkReportAuthorizedStatus(caseId);
    }, expectedDuration * 1000);

    DispatchEmitter.emit("newcase", {
      reportDetails,
    });

    await saveCaseReportNotification({
      company_id: companyId,
      report_id: reportId,
      message: `New case report generated: ${caseCheck[0]?.case_name}`,
    });

    return res.status(201).json({
      status: true,
      message: "Report created successfully",
      reportId,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const adminOverrideTemplate = async (req, res) => {
  const { adminId, stage_key, custom_time_sec } = req.body;

  if (!adminId) {
    return res
      .status(400)
      .json({ success: false, message: "Admin ID is required" });
  }

  try {
    await saveAdminOverrideTemplate(req.body);

    return res.status(201).json({
      status: true,
      message: "Saved Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const rimacReport = async (req, res) => {
  try {
    const reportData = req.body;

    if (!reportData || Object.keys(reportData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body cannot be empty",
      });
    }

    const result = await saveRimacCase(reportData);

    res.status(201).json({
      success: true,
      message: "Report received and stored successfully",
      data: {
        id: result.insertId,
        report_data: reportData,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error processing Rimac report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process report",
      error: error.message,
    });
  }
};

export const dispatchCaseCompleteService = async (req, res) => {
  const driverId = req.userId;
  const { caseId } = req.params;
  const { damage, meta_information } = req.body;

  try {
    const caseCheck = await findCaseById(caseId);

    if (!caseCheck) {
      return res.status(400).json({
        status: false,
        message: "Invalid or unaccepted case",
      });
    }

    const fieldsToUpdate = {
      damage,
      meta_information,
    };
    const updateResults = await updateCaseServiceById(fieldsToUpdate, caseId);

    if (updateResults.affectedRows === 1) {
      await Promise.all([
        updateCaseStatusById(caseId, "completed"),
        driverStatusAvailable(driverId),
      ]);
    } else {
      console.warn(`Update failed for caseId ${caseId}`);
      return res.status(400).json({
        status: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Case service completed successfully",
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

export const allCaseReportsNotifications = async (req, res) => {
  try {
    const notifications = await getAllNotifications();

    if (!notifications) {
      res
        .status(204)
        .send({ status: false, message: "No notifications found" });
    }

    return res.status(200).json({
      status: true,
      message: notifications,
    });
  } catch (error) {
    res.status(204).send({ status: false, message: error.message });
  }
};

export const newCaseReportNotifications = async (req, res) => {
  const { userId } = req.params;
  const superVisor = JSON.parse(req.query.superVisor || "false");
  let notifications;

  if (!userId) {
    res.status(204).send({ status: false, message: "Company Id is required" });
  }

  try {
    if (!superVisor) {
      notifications = await getNotificationsByCompanyId(userId);
    } else {
      const fetchSuperVisorCompanyId = await realmUserByTraccarId(userId);
      const companyId = fetchSuperVisorCompanyId[0].userId;

      notifications = await getNotificationsByCompanyId(companyId);
    }

    if (!notifications || notifications.length === 0) {
      res
        .status(204)
        .send({ status: false, message: "No notifications found" });
    }

    return res.status(200).json({
      status: true,
      message: notifications,
    });
  } catch (error) {
    res.status(204).send({ status: false, message: error.message });
  }
};

export const notificationStatusUpdate = async (req, res) => {
  const { id } = req.params;

  try {
    await setNewStatusNotification(parseInt(id));

    return res.status(200).json({
      status: true,
      message: `notification readed!`,
    });
  } catch (error) {
    res.status(204).send({ status: false, message: error.message });
  }
};

export const processTemplate = async (req, res) => {
  try {
    const template = await processTimeTemplate();

    return res.status(200).json({
      status: true,
      message: template,
    });
  } catch (error) {
    res.status(204).send({ status: false, message: error.message });
  }
};

export const adminProcessTemplate = async (req, res) => {
  const { adminId } = req.params;
  try {
    const template = await processTemplateForAdmin(adminId);

    return res.status(200).json({
      status: true,
      message: template,
    });
  } catch (error) {
    res.status(204).send({ status: false, message: error.message });
  }
};

export const subservicesLocationData = async (req, res) => {
  try {
    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const { rows, total } = await fetchSubserviceLocationData(
      userId,
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      data: rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
      error: error.message,
    });
  }
};

export const addNewSubservicePrice = async (req, res) => {
  try {
    const { userId, locationId, subserviceType, price } = req.body;

    if (!userId || !locationId || !subserviceType || !price) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: userId, locationId, subserviceType, and price are mandatory",
      });
    }

    if (userId === "1") {
      return res.status(403).json({
        success: false,
        message: "Superadmin cannot add subservice prices",
      });
    }

    await addNewZonePrice({ userId, locationId, subserviceType, price });

    res.status(201).json({
      success: true,
      message: "Subservice price saved successfully",
      data: { id: result.insertId, userId, locationId, subserviceType, price },
    });
  } catch (error) {
    console.error("Error saving subservice price:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save subservice price",
      error: error.message,
    });
  }
};
