import {
  actionSuggestionService,
  addNewCase,
  addNewZonePrice,
  allPendingSuggestedServices,
  allPendingSuggestedServicesByUserId,
  allSearchHistory,
  allSearchHistoryByUserId,
  caseTrackingById,
  defaultTemplateTimeForAdmin,
  fetchCaseIdByReportId,
  fetchCaseReportById,
  fetchDispatchCases,
  fetchDispatchCasesByUserId,
  fetchSubserviceLocationData,
  findCaseById,
  findCaseByName,
  findCaseStatusById,
  findPendingApprovalSuggestedService,
  getAllNotifications,
  getNotificationsByCompanyId,
  initialCaseStageStatus,
  insertDriverServiceTime,
  onTheWayCaseStageStatus,
  processTemplateForAdmin,
  processTimeTemplate,
  saveAdminOverrideTemplate,
  saveCaseAssignedDeviceId,
  saveCaseReportNotification,
  saveDispatchCaseAction,
  saveDispatchCaseReport,
  saveInvolvedVehicle,
  saveRequestedSuggestedService,
  saveRimacCase,
  saveVehiclePhoto,
  setNewStatusNotification,
  updateCaseCurrentProcess,
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
  calculateDriverServiceTime,
  checkAndMarkDelayedCase,
  checkReportAuthorizedStatus,
  defaultTemplateTime,
  getDispatchCaseAction,
  markCaseStage,
  markCaseStageAsDelayed,
  onTheWayStageStatusCheck,
  saveAuthorizationRequestStage,
} from "../services/dispatchService.js";
import { validateSubserviceType } from "../model/devices.js";
import dayjs from "dayjs";

export const DispatchEmitter = new EventEmitter();

export const handleNewDispatchCase = async (req, res) => {
  const { userId, caseName, caseAddress, lat, lng, message, devicesMeta } =
    req.body;
  let assignedDeviceIds = req.body.assignedDeviceIds;
  let files;

  try {
    assignedDeviceIds = JSON.parse(assignedDeviceIds);
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid JSON in assignedDeviceIds" });
  }

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
      user_id: 180,
      case_name: caseName,
      case_address: caseAddress,
      position: { lat, lng },
      message,
      devicesMeta,
    };

    if (req.files?.length) {
      const uploadedFiles = await Promise.all(
        req.files.map(async (file) => {
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

          return {
            filename: file.originalname || "no-file",
            url: getAuthenticatedS3String(uploadedFile.Location),
          };
        })
      );
      dbBody.file_data = uploadedFiles;
    }

    const newCase_id = await addNewCase(dbBody);

    await Promise.all(
      assignedDeviceIds.map((device_id) =>
        saveCaseAssignedDeviceId(newCase_id, device_id)
      )
    );

    const stage =
      userId !== "1"
        ? await defaultTemplateTimeForAdmin("advisor_assignment", userId)
        : await defaultTemplateTime("advisor_assignment");

    let expectedDuration = stage ? stage?.time_sec : 55;

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
          caseId: newCase_id,
          position: { lat, lng },
          message,
          status: "pending",
          file_data: dbBody.file_data || [],
          assignedDeviceIds,
          createdAt: dayjs().tz("Asia/Karachi").format("YYYY-MM-DD HH:mm:ss"),
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
        if (successCount > 0) {
          await updateCaseCurrentProcess(newCase_id, "advisor_assignment");

          DispatchEmitter.emit("subprocessEvent", {
            id: newCase_id,
            current_subprocess: "advisor_assignment",
          });
        }
      } else {
        console.log("No FCM tokens found for drivers");
      }
    } else {
      console.log("No drivers found for the provided device IDs");
    }

    await initialCaseStageStatus({
      caseId: newCase_id,
      expected_duration: expectedDuration,
    });

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
  const { caseId, companyId: userId } = req.params;
  const { action, rejection_reason } = req.body;

  if (!caseId) {
    return res.status(400).json({ error: "Case Id is required" });
  }

  if (action === "reject" && !rejection_reason) {
    return res.status(400).json({ error: "Rejection reason is required" });
  }

  try {
    const dbBody = {
      case_id: caseId,
      driver_id: driverId,
      action,
      ...(rejection_reason && { rejection_reason }),
    };

    const event = {
      id: caseId,
      current_subprocess: "reception_case",
    };

    switch (action) {
      case "reject":
        await updateCaseStatusById(caseId, "rejected");
        event.status = "rejected";
        break;

      case "accept":
        const stage =
          userId !== "1"
            ? await defaultTemplateTimeForAdmin("on_the_way", userId)
            : await defaultTemplateTime("on_the_way");

        const expectedDuration = stage?.time_sec || 60;

        await Promise.all([
          updateCaseStatusById(caseId, "in progress"),
          driverStatusInService(driverId),
          onTheWayCaseStageStatus({
            caseId,
            expected_duration: expectedDuration,
          }),
        ]);

        event.status = "in progress";

        setTimeout(() => {
          onTheWayStageStatusCheck(caseId);
        }, expectedDuration * 1000);
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    await Promise.all([
      saveDispatchCaseAction(dbBody),
      updateCaseCurrentProcess(caseId, "reception_case"),
    ]);

    DispatchEmitter.emit("subprocessEvent", event);

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
    const caseId = await fetchCaseIdByReportId(reportId);

    if (!caseId) {
      return res.status(404).json({
        status: false,
        message: "Report not found",
      });
    }

    const [result, update, superVisorApproved] = await Promise.all([
      updateCaseReportStatus(reportId, true),
      updateCaseStatusById(caseId, "approved"),
      updateCaseCurrentProcess(caseId, "supervisor_approval"),
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: false,
        message: "Report not found or already authorized",
      });
    }
    const fcmToken = await getFcmTokensByDriverIds(driverId);
    if (fcmToken.length > 0) {
      const notificationTitle = "Case Report Authorized";
      const notificationBody = `Your case report has been authorized. Please complete the service.`;
      const payload = {
        caseId,
      };
      const { successCount, failureCount } = await sendPushNotification(
        fcmToken,
        notificationTitle,
        notificationBody,
        payload
      );
      console.log(
        `Notifications sent: ${successCount} succeeded, ${failureCount} failed`
      );
    } else {
      console.log("No FCM token found for driver");
    }

    DispatchEmitter.emit("subprocessEvent", {
      id: caseId,
      current_subprocess: "supervisor_approval",
      status: "approved",
    });

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

export const suggestedServicesApproval = async (req, res) => {
  const driverId = req.userId;
  const { caseId, companyId } = req.params;
  const { suggested_services } = req.body;

  let missingRequiredFields = [];

  if (!caseId) missingRequiredFields.push("caseId");
  if (!companyId) missingRequiredFields.push("companyId");
  if (!suggested_services) missingRequiredFields.push("suggested_services");

  if (missingRequiredFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingRequiredFields.join(", ")}`,
    });
  }

  if (!Array.isArray(suggested_services) || suggested_services.length === 0) {
    missingRequiredFields.push("Suggested Services (array)");
  }

  try {
    let dbBody = {
      user_id: companyId,
      case_id: caseId,
      driver_id: driverId,
      suggested_services,
    };

    await saveRequestedSuggestedService(dbBody);

    return res.status(200).json({
      status: true,
      message: "Approval request sent.",
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
      if (Array.isArray(vehicle.photos)) {
        const validPhotos = vehicle.photos.filter(
          (photo) => photo.category && photo.type && photo.url
        );
        const savePhotos = validPhotos.map((photo) =>
          saveVehiclePhoto(vehicleId, photo)
        );
        await Promise.all(savePhotos);
      }
    }

    const [superVisorIds, stage] = await Promise.all([
      realmUserTraccarIdsByUserId(companyId),
      companyId !== "1"
        ? defaultTemplateTimeForAdmin("supervisor_approval", companyId)
        : defaultTemplateTime("supervisor_approval"),
    ]);

    const expectedDuration = stage?.time_sec || 60;

    await Promise.all([
      saveAuthorizationRequestStage(caseId, expectedDuration),
      saveCaseReportNotification({
        company_id: companyId,
        report_id: reportId,
        message: `New case report generated: ${caseCheck[0]?.case_name}`,
      }),
      updateCaseStatusById(caseId, "waiting_approval"),
      updateCaseCurrentProcess(caseId, "authorization_request"),
    ]);

    DispatchEmitter.emit("newcase", {
      reportDetails: {
        reportId,
        caseId: parseInt(caseId),
        driverId,
        companyId: parseInt(companyId),
        superVisorIds,
        caseName: caseCheck[0]?.case_name,
        createdAt: new Date().toISOString(),
      },
    });
    DispatchEmitter.emit("subprocessEvent", {
      id: caseId,
      current_subprocess: "authorization_request",
      status: "waiting_approval",
    });

    setTimeout(() => {
      checkReportAuthorizedStatus(caseId).catch(console.error);
    }, expectedDuration * 1000);

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

  const bothTime = await calculateDriverServiceTime(caseId);

  try {
    const caseCheck = await findCaseById(caseId);

    if (!caseCheck) {
      return res.status(400).json({
        status: false,
        message: "Invalid or unaccepted case",
      });
    }

    if (caseCheck.status !== "approved") {
      return res.status(400).json({
        status: false,
        message: "Case not approved",
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
        updateCaseCurrentProcess(caseId, "case_completed"),
        driverStatusAvailable(driverId),
      ]);
    } else {
      console.warn(`Update failed for caseId ${caseId}`);
      return res.status(400).json({
        status: false,
        message: error.message,
      });
    }

    DispatchEmitter.emit("subprocessEvent", {
      id: caseId,
      current_subprocess: "case_completed",
      status: "completed",
    });

    await insertDriverServiceTime(caseId, driverId, bothTime.totalSeconds);

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
      return res
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
    return res
      .status(204)
      .send({ status: false, message: "Company Id is required" });
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
      return res
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

export const responseSuggestedService = async (req, res) => {
  const { action } = req.query;
  const { id } = req.params;

  try {
    const sgService = await findPendingApprovalSuggestedService(id);

    if (!sgService) {
      return res.status(400).json({
        status: false,
        message: "Suggested service not found",
      });
    }

    if (action === "approved") {
      await actionSuggestionService(id, action);
    }
    if (action === "rejected") {
      await actionSuggestionService(id, action);
    }

    return res.status(200).json({
      status: true,
      message: `Suggested service ${action} successfully`,
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

export const fetchSearchHistory = async (req, res) => {
  try {
    const history = await allSearchHistory();

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const fetchSearchHistoryByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const history = await allSearchHistoryByUserId(userId);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSuggestedServiceApprovals = async (req, res) => {
  const { status, userId } = req.query;
  const { caseId } = req.params;
  let awaitingApprovals;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  try {
    if (parseInt(userId) === 1) {
      awaitingApprovals = await allPendingSuggestedServices(caseId);
    } else {
      awaitingApprovals = await allPendingSuggestedServicesByUserId(
        caseId,
        userId
      );
    }

    if (!awaitingApprovals || awaitingApprovals.length === 0) {
      return res.status(204).json({
        success: false,
        message: "No pending approvals found",
      });
    }

    return res.status(200).json({
      success: true,
      message: awaitingApprovals,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addNewSubservicePrice = async (req, res) => {
  try {
    const { userId, locationId, subserviceType, price } = req.body;

    if (
      !userId ||
      !locationId ||
      !Array.isArray(subserviceType) ||
      subserviceType.length === 0 ||
      !price
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: userId, locationId, subserviceType (array), and price are mandatory",
      });
    }

    if (userId === "1") {
      return res.status(403).json({
        success: false,
        message: "Superadmin cannot add subservice prices",
      });
    }

    const validSubservices = await validateSubserviceType(subserviceType);

    const validIds = validSubservices?.map((row) => row.id);

    if (validIds.length !== subserviceType.length) {
      return res.status(400).json({
        success: false,
        message: "One or more subserviceType IDs are invalid",
      });
    }

    const insertedIds = await addNewZonePrice({
      userId,
      locationId,
      subserviceType,
      price,
    });

    res.status(201).json({
      success: true,
      message: "Subservice prices saved successfully",
      data: insertedIds.map((id, index) => ({
        id,
        userId,
        locationId,
        subserviceType: subserviceType[index],
        price,
      })),
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
