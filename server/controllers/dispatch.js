import {
  actionSuggestionService,
  addCaseIdInRimacReport,
  addNewCase,
  addNewTowCarServicePrice,
  allPendingSuggestedServices,
  allPendingSuggestedServicesByUserId,
  allRimacCases,
  allSearchHistory,
  allSearchHistoryByUserId,
  caseTrackingById,
  confirmIsRimacCase,
  defaultTemplateTimeForAdmin,
  deleteProviderPrice,
  existingProviderPrice,
  fetchAccidentTypes,
  fetchAgreementData,
  fetchCaseIdByReportId,
  fetchCaseReportById,
  fetchDispatchCases,
  fetchDispatchCasesByUserId,
  fetchDistricts,
  fetchInvolvedVehicles,
  fetchKnackVehicle,
  fetchPoliceStationData,
  fetchResponsibilityData,
  fetchSubserviceLocationData,
  fetchTowCarServiceLocationData,
  fetchZoneRatesByUserId,
  findCaseById,
  findCaseByName,
  findCaseStatusById,
  findPendingApprovalSuggestedService,
  findRimacReportByCaseId,
  findRimacReportById,
  getAllNotifications,
  getNotificationsByCompanyId,
  getRimacCaseByCode,
  initialCaseStageStatus,
  insertDispatchCompleteCase,
  insertDriverServiceTime,
  modifyRimacReportById,
  obtainCaseMetaData,
  onTheWayCaseStageStatus,
  processTemplateForAdmin,
  processTimeTemplate,
  saveAdminOverrideTemplate,
  saveCaseAssignedDeviceId,
  saveCaseReportNotification,
  saveDispatchCaseAction,
  saveDispatchCaseReport,
  saveDriverOdometerEntry,
  saveInvolvedVehicle,
  saveOrUpdateZonePrices,
  saveRequestedSuggestedService,
  saveRimacCase,
  saveVehiclePhoto,
  setNewStatusNotification,
  unBlockingDriver,
  updateCaseCurrentProcess,
  updateCaseReportStatus,
  updateCaseServiceById,
  updateCaseStatusById,
  updateProviderPriceInDb,
  updateRimacReportById,
  updateRimacReportStatus,
  updateSearchHistory,
  verifyExistingReading,
  queryUnassignedDrivers,
  reassignCaseModel,
} from "../model/dispatch.js";
import {
  driverStatusAvailable,
  driverStatusInService,
  findVehiclesByDriverId,
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
  adminAuthorizationRequestStage,
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
import { rimacBodyValidFields, rimacFromDDFields } from "../utils/rimacBody.js";
import {
  formatKnackPlateNumber,
  formattedRimacFields,
  knackHeaders,
  mapToRimacApiPayload,
  validRimacFormFields,
} from "../utils/common.js";
import axios from "axios";

export const DispatchEmitter = new EventEmitter();

export const handleNewDispatchCase = async (req, res) => {
  const {
    userId,
    searchId,
    caseName,
    caseAddress,
    lat,
    lng,
    message,
    devicesMeta,
    metadata,
    rimac_report_id,
  } = req.body;
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

  if (!searchId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing search ID" });
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

    if (metadata) {
      dbBody.metadata = metadata;
    }

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
          createdAt: dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss"),
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
            driverId: driverIds[0],
            current_subprocess: "advisor_assignment",
            created_at: dayjs()
              .tz("America/Lima")
              .format("YYYY-MM-DD HH:mm:ss"),
          });
          const casePayload = {
            driverId: driverIds[0],
            type: "case-assigned",
            caseId: newCase_id,
            caseName,
            caseAddress,
            position: { lat, lng },
            message,
            file_data: dbBody.file_data || [],
            assignedDeviceIds,
            createdAt: dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss"),
            respondWithin: expectedDuration,
            status: "pending",
          };

          DispatchEmitter.emit("driverCase", casePayload);
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

    await updateSearchHistory(searchId);

    if (rimac_report_id) {
      await addCaseIdInRimacReport(rimac_report_id, newCase_id);
    }

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
  const { userId, page = 1, limit = 10, search = "" } = req.query;
  const superVisor = JSON.parse(req.query.superVisor || "false");

  const pageInt = parseInt(page);
  const limitInt = parseInt(limit);
  const offset = (pageInt - 1) * limitInt;

  try {
    let dispatchCases;
    let total;

    if (!superVisor) {
      if (parseInt(userId) === 1) {
        ({ rows: dispatchCases, total } = await fetchDispatchCases(
          offset,
          limitInt,
          search
        ));
      } else {
        ({ rows: dispatchCases, total } = await fetchDispatchCasesByUserId(
          userId,
          offset,
          limitInt,
          search
        ));
      }
    } else {
      const fetchSuperVisorCompanyId = await realmUserByTraccarId(userId);
      const companyId = fetchSuperVisorCompanyId[0].userId;

      ({ rows: dispatchCases, total } = await fetchDispatchCasesByUserId(
        companyId,
        offset,
        limitInt,
        search
      ));
    }

    res.status(200).json({
      status: true,
      data: dispatchCases,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
      },
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

export const sendReportToRimac = async (req, res) => {
  const { report, rimacReport } = req.body;
  const { rimac_report_caseId: caseId } = req.query;

  if (!report || !rimacReport) {
    return res.status(400).json({
      success: false,
      message: "Missing report or rimacReport in request body",
    });
  }

  try {
    let loginResponse;
    try {
      loginResponse = await axios.post(
        "http://52.147.211.125/interplus-servicios/api/login?usuario=practicante&password=interplus"
      );
    } catch (loginError) {
      return res.status(502).json({
        success: false,
        message: "Failed to reach Rimac login API.",
        error: loginError?.response?.data || loginError.message,
      });
    }

    const rimacToken = loginResponse?.data?.token;

    if (!rimacToken) {
      return res.status(502).json({
        success: false,
        message:
          loginResponse?.data?.mensaje ||
          "Rimac login API did not return a token.",
        error: loginResponse?.data || null,
      });
    }

    let payload;
    try {
      payload = mapToRimacApiPayload(report, rimacReport);
    } catch (mapError) {
      return res.status(400).json({
        success: false,
        message: "Failed to map report data to Rimac payload.",
        error: mapError.message,
      });
    }

    let rimacResponse;
    try {
      rimacResponse = await axios.post(
        "http://52.147.211.125/interplus-servicios/api/informes/terminarinforme_nextop",
        payload,
        {
          headers: {
            token: rimacToken,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
    } catch (apiError) {
      return res.status(502).json({
        success: false,
        message: "Failed to reach Rimac report API.",
        error: apiError?.response?.data || apiError.message,
      });
    }

    const rimac = rimacResponse?.data;
    if (!rimac || typeof rimac !== "object") {
      return res.status(502).json({
        success: false,
        message: "Malformed Rimac API response.",
        error: rimacResponse?.data,
      });
    }

    if (rimac.successful) {
      try {
        if (caseId) {
          await updateRimacReportStatus(caseId, "sent_to_rimac");
        }
      } catch (statusUpdateError) {
        console.warn(
          "Warning: Sent to Rimac, but failed to update local case status.",
          statusUpdateError.message
        );
      }

      return res.status(200).json({
        success: true,
        rimac,
        message: rimac.mensaje || "Report sent successfully to Rimac.",
      });
    }

    return res.status(400).json({
      success: false,
      message: rimac.mensaje || "Rimac API rejected the report.",
      rimac,
    });
  } catch (error) {
    console.error(
      "Error sending report to Rimac:",
      error?.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "Unexpected server error.",
      error: error?.response?.data || error.message,
    });
  }
};

export const handleCaseAction = async (req, res) => {
  const driverId = req.userId;
  const { caseId, companyId: userId } = req.params;
  const { action, rejection_reason } = req.body;
  let nextTimer;

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
      driverId,
      current_subprocess: "reception_case",
      created_at: dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss"),
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

        nextTimer = expectedDuration;
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    await Promise.all([
      saveDispatchCaseAction(dbBody),
      updateCaseCurrentProcess(caseId, "reception_case"),
    ]);

    DispatchEmitter.emit("subprocessEvent", event);
    DispatchEmitter.emit("caseProcessUpdate", {
      driverId,
      caseId,
      type: "case-subprocess",
      subprocessUpdated: true,
    });

    res.status(200).json({
      status: true,
      message: "Case action saved successfully",
      data: {
        stage: "on the way",
        timer: nextTimer,
      },
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

    const [result, update, superVisorApproved, tracking] = await Promise.all([
      updateCaseReportStatus(reportId, true),
      updateCaseStatusById(caseId, "approved"),
      updateCaseCurrentProcess(caseId, "supervisor_approval"),
      adminAuthorizationRequestStage(caseId, "approved"),
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
      driverId,
      current_subprocess: "supervisor_approval",
      created_at: dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss"),
      status: "approved",
    });
    DispatchEmitter.emit("caseProcessUpdate", {
      driverId,
      caseId,
      type: "case-subprocess",
      subprocessUpdated: true,
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
    const [report, rimacReport] = await Promise.all([
      fetchCaseReportById(caseId),
      findRimacReportByCaseId(caseId),
    ]);

    let response = {
      ...report,
    };

    if (rimacReport.success) {
      response.rimacReport = rimacReport.report;
    }

    return res.status(200).json({
      status: true,
      message: response || [],
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

  if (!caseId || caseId === "") missingRequiredFields.push("caseId");
  if (!companyId || companyId === "") missingRequiredFields.push("companyId");
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

    const [caseData, superVisorIds] = await Promise.all([
      findCaseById(caseId),
      realmUserTraccarIdsByUserId(companyId),
    ]);

    DispatchEmitter.emit("suggestedServices", {
      companyId,
      caseId,
      superVisorIds,
      message: `New suggested services request for case ${caseData.case_name}`,
    });

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
  const {
    suggestedServices,
    subservices,
    additionalInformation,
    vehicles,
    OCR_meta_data,
  } = req.body;

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

  if (!Array.isArray(OCR_meta_data)) {
    return res.status(400).json({
      status: false,
      message: "OCR_meta_data must be an array",
    });
  }

  for (const ocr of OCR_meta_data) {
    if (!ocr.plateNumber) {
      return res.status(400).json({
        status: false,
        message: "Each OCR_meta_data item must have a plateNumber",
      });
    }
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
      meta_data: JSON.stringify(OCR_meta_data),
    };

    const reportId = await saveDispatchCaseReport(reportData);

    for (let vIndex = 0; vIndex < vehicles.length; vIndex++) {
      const vehicle = vehicles[vIndex];
      console.log(
        `\n🚗 Processing vehicle index ${vIndex}, vehicleId: ${vehicle.vehicle_id}`
      );

      const vehicleId = await saveInvolvedVehicle(reportId, vehicle);
      console.log(`✅ Saved vehicle in DB, got vehicleId: ${vehicleId}`);

      // ----- HANDLE NEW additionalInformation FIELD -----

      if (
        Array.isArray(vehicle.additionalInformation) &&
        vehicle.additionalInformation.length > 0
      ) {
        const infoArray = vehicle.additionalInformation; // ✅ Directly the array of strings
        console.log(
          `📦 additionalInformation for vehicle[${vIndex}]:`,
          infoArray
        );

        // Ensure photos array exists
        if (!Array.isArray(vehicle.photos)) {
          vehicle.photos = [];
          console.log(
            `ℹ️ Initialized empty photos array for vehicle[${vIndex}]`
          );
        }

        // Push each string as a synthetic photo entry
        for (const info of infoArray) {
          if (info && info.trim()) {
            const newPhoto = {
              category: `${vIndex} Additional Information`,
              type: `Multiple Images`,
              url: info.trim(),
            };
            vehicle.photos.push(newPhoto);
            console.log(
              `➕ Added synthetic photo for vehicle[${vIndex}]:`,
              newPhoto
            );
          }
        }
      } else {
        console.log(`⚠️ No valid additionalInformation for vehicle[${vIndex}]`);
      }

      // ----- EXISTING PHOTO SAVE LOGIC -----
      if (Array.isArray(vehicle.photos)) {
        const validPhotos = vehicle.photos.filter(
          (photo) => photo.category && photo.type && photo.url
        );
        console.log(
          `📸 Valid photos for vehicle[${vIndex}]:`,
          validPhotos.length
        );

        const allPhotosToSave = [];

        for (const photo of validPhotos) {
          // Handle comma-separated URLs for "Multiple Images"
          if (
            photo.category === "Additional Information" &&
            photo.type === "Multiple Images" &&
            photo.url.includes(",")
          ) {
            const urls = photo.url
              .split(",")
              .map((u) => u.trim())
              .filter(Boolean);

            console.log(
              `🔀 Splitting multiple URLs for photo_id:${
                photo.photo_id || "new"
              } ->`,
              urls
            );

            for (const singleUrl of urls) {
              allPhotosToSave.push({
                category: photo.category,
                type: photo.type,
                url: singleUrl,
              });
            }
          } else {
            allPhotosToSave.push(photo);
          }
        }

        console.log(
          `💾 Saving ${allPhotosToSave.length} photos for vehicleId ${vehicleId}...`
        );
        await Promise.all(
          allPhotosToSave.map((photo) => saveVehiclePhoto(vehicleId, photo))
        );
        console.log(`✅ Saved all photos for vehicle[${vIndex}]`);
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
      driverId,
      current_subprocess: "authorization_request",
      created_at: dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss"),
      status: "waiting_approval",
    });
    DispatchEmitter.emit("caseProcessUpdate", {
      driverId,
      caseId,
      type: "case-subprocess",
      subprocessUpdated: true,
    });

    setTimeout(() => {
      checkReportAuthorizedStatus(caseId).catch(console.error);
    }, expectedDuration * 1000);

    return res.status(201).json({
      status: true,
      message: "Report created successfully",
      data: {
        stage: "Send for Authorization",
        timer: expectedDuration,
      },
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

    const { Informe } = reportData;

    if (!Informe) {
      return res.status(400).json({
        success: false,
        message: "Se requiere código de Informe",
      });
    }

    const invalidFields = Object.keys(reportData).filter(
      (key) => !rimacBodyValidFields.includes(key)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid field(s): ${invalidFields.join(", ")}`,
      });
    }

    const existingReport = await getRimacCaseByCode(Informe);

    if (existingReport) {
      await updateRimacReportById(existingReport.id, reportData);

      DispatchEmitter.emit("rimacCase", {
        type: "update",
        report: {
          ...reportData,
          id: existingReport.id,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Report updated successfully",
        data: {
          id: existingReport.id,
          report_data: reportData,
        },
      });
    } else {
      const result = await saveRimacCase(reportData);

      DispatchEmitter.emit("rimacCase", {
        type: "post",
        report: {
          ...reportData,
          id: result.insertId,
        },
      });
      return res.status(201).json({
        success: true,
        message: "Report saved successfully",
        data: {
          id: result.insertId,
          report_data: reportData,
          created_at: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error("Error processing Rimac report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process report",
      error: error.message,
    });
  }
};

export const fetchAllRimacCases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const filter = req.query.filter || "";

    console.log(search, "search");

    const { data, total } = await allRimacCases(offset, limit, search, filter);

    res.status(200).json({
      success: true,
      message: "Rimac cases fetched successfully",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRimacReportById = async (req, res) => {
  const { id } = req.params;

  if (!id || id === "") {
    return res
      .status(404)
      .send({ status: false, message: "Invalid report ID" });
  }

  try {
    const report = await findRimacReportById(id);

    if (!report) {
      return res
        .status(404)
        .send({ status: false, message: "Report not found" });
    }

    const response = {
      rimac: {
        ...report,
      },
      dispatch: null,
    };

    if (report?.case_id) {
      const dispatchReport = await fetchCaseReportById(report.case_id);

      if (dispatchReport) {
        response.dispatch = {
          ...dispatchReport,
          vehicles:
            typeof dispatchReport.vehicles === "string"
              ? JSON.parse(dispatchReport.vehicles)
              : dispatchReport.vehicles,
        };
      }
    }

    res.status(200).json({
      status: true,
      message: response,
    });
  } catch (error) {
    res.status(204).send({ status: false, message: error.message });
  }
};

export const getRimacFormFields = async (req, res) => {
  const { caseId } = req.params;

  if (!caseId || caseId === "") {
    return res.status(404).send({ status: false, message: "Invalid caseId" });
  }

  try {
    const [
      result,
      CASE_REPORT_DATA,
      districts,
      responsibility_data,
      accident_type_data,
      agreement_data,
      police_station_data,
    ] = await Promise.all([
      findRimacReportByCaseId(caseId),
      obtainCaseMetaData(caseId),
      fetchDistricts(),
      fetchResponsibilityData(),
      fetchAccidentTypes(),
      fetchAgreementData(),
      fetchPoliceStationData(),
    ]);

    if (result.success && result.report.length === 0) {
      return res
        .status(404)
        .send({ status: false, message: "Report not found" });
    }

    const caseDetails = result.report[0];

    let parsedReportData = caseDetails.report_data
      ? JSON.parse(caseDetails.report_data)
      : {};

    let parsedMetaData = CASE_REPORT_DATA
      ? JSON.parse(CASE_REPORT_DATA.meta_data)
      : [];

    let INVOLVED_VEHICLES = await fetchInvolvedVehicles(CASE_REPORT_DATA.id);

    let onlyPlateNumbers = INVOLVED_VEHICLES.map((v) => {
      return {
        plate_number: v.plate_number,
      };
    });

    const fields = formattedRimacFields(parsedReportData);

    const {
      vehicleUsage,
      driverDocumentType,
      driverLicenseCategory,
      driverAlcoholTest,
      vehicleYear,
      participantType,
      participantGender,
    } = rimacFromDDFields;

    let formattedResponse = {
      caseId: caseDetails.case_id,
      rimac_report_id: caseDetails.id,
      status: caseDetails.status,
      involvedVehicle: onlyPlateNumbers,
      ocr_data: parsedMetaData,
      ...fields,
      districts,
      responsibility_data,
      accident_type_data,
      agreement_data,
      police_station_data,
      vehicleUsage,
      driverDocumentType,
      driverLicenseCategory,
      driverAlcoholTest,
      vehicleYear,
      participantType,
      participantGender,
    };

    res.status(200).json({
      status: true,
      message: formattedResponse,
    });
  } catch (error) {
    res.status(204).send({ status: false, message: error.message });
  }
};

export const saveAdvisorForm = async (req, res) => {
  const { caseId, reportId } = req.params;

  if (!caseId || caseId === "" || !reportId || reportId === "") {
    return res
      .status(404)
      .send({ status: false, message: "Invalid caseId or reportId" });
  }

  try {
  } catch (error) {
    res.status(204).send({ status: false, message: error.message });
  }
};

export const saveChangesOfRimacReport = async (req, res) => {
  const { id } = req.params;
  const { report_data } = req.body;

  if (!id || id === "") {
    return res
      .status(404)
      .send({ status: false, message: "Invalid report ID" });
  }

  if (!report_data) {
    return res
      .status(404)
      .send({ status: false, message: "Invalid Report Data" });
  }

  try {
    const updatedResult = await modifyRimacReportById(report_data, id);

    if (updatedResult.affectedRows === 0) {
      return res
        .status(404)
        .send({ status: false, message: "Cannot save changes." });
    }

    res.status(200).json({
      status: true,
      message: "Changes saved successfully!",
    });
  } catch (error) {
    res.status(204).send({ status: false, message: error.message });
  }
};

export const getZoneRates = async (req, res) => {
  const { userId } = req.params;
  const { deviceDistrict, incidentDistrict, destinationDistrict } = req.query;

  let missingFields = [];

  if (!deviceDistrict || deviceDistrict === "")
    missingFields.push("deviceDistrict");
  if (!incidentDistrict || incidentDistrict === "")
    missingFields.push("incidentDistrict");
  if (!destinationDistrict || destinationDistrict === "")
    missingFields.push("destinationDistrict");

  if (!userId || userId === "") {
    return res
      .status(400)
      .json({ status: false, message: "User ID is required" });
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    const zoneRates = await fetchZoneRatesByUserId(userId, deviceDistrict);

    if (!zoneRates) {
      return res.status(200).json({
        status: false,
        message: "No zone rates found for given district and user",
        zoneRates: [],
      });
    }

    const highestPriceZone = zoneRates.reduce((prev, curr) =>
      curr.price > prev.price ? curr : prev
    );

    res.status(200).json({
      status: true,
      message: "Highest zone rate fetched successfully",
      zoneRate: highestPriceZone,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching zone rates",
      error: error.message,
    });
  }
};

export const dispatchCaseCompleteService = async (req, res) => {
  const driverId = req.userId;
  const { caseId } = req.params;
  const { damage, meta_information, meta_data, ...REST_FORM_BODY } = req.body;

  const isRimacCase = await confirmIsRimacCase(caseId);

  let missingFields = [];

  if (!damage) missingFields.push("damage");
  if (!meta_information) missingFields.push("meta_information");

  if (isRimacCase) {
    const missingFormFields = validRimacFormFields.filter(
      (field) => !(field in REST_FORM_BODY)
    );

    if (missingFormFields.length > 0) {
      missingFields.push(...missingFormFields);
    }
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
      missingFields,
    });
  }

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

    const updatePayload = {
      damage,
      meta_information,
      meta_data,
    };

    if (isRimacCase) {
      updatePayload.rimac_form_data = {
        ...REST_FORM_BODY,
      };
    }

    const updateResults = await updateCaseServiceById(
      updatePayload,
      caseId,
      isRimacCase
    );

    if (updateResults.affectedRows === 1) {
      const bothTime = await calculateDriverServiceTime(caseId);

      await Promise.all([
        updateCaseStatusById(caseId, "completed"),
        updateCaseCurrentProcess(caseId, "case_completed"),
        driverStatusAvailable(driverId),
        updateRimacReportStatus(caseId, "completed"),
      ]);

      DispatchEmitter.emit("subprocessEvent", {
        id: caseId,
        driverId,
        current_subprocess: "case_completed",
        created_at: dayjs().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss"),
        status: "completed",
      });

      DispatchEmitter.emit("caseProcessUpdate", {
        driverId,
        caseId,
        type: "case-subprocess",
        subprocessUpdated: true,
      });

      await Promise.all([
        insertDriverServiceTime(caseId, driverId, bothTime.totalSeconds),
        insertDispatchCompleteCase(caseId, driverId),
      ]);

      return res.status(200).json({
        status: true,
        message: "Case service completed successfully",
      });
    } else {
      console.warn(`Update failed for caseId ${caseId}`);
      return res.status(400).json({
        status: false,
        message: "Update failed",
      });
    }
  } catch (error) {
    console.error("Service Error:", error);
    return res.status(500).send({
      status: false,
      message: error.message || "Internal Server Error",
    });
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
  const { action, driver_id } = req.query;
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

    const fcmToken = await getFcmTokensByDriverIds(driver_id);
    if (fcmToken.length > 0) {
      const notificationTitle = `Sub Services ${action}`;
      const notificationBody = `Supervisor has ${action} your sub services.`;

      const { successCount, failureCount } = await sendPushNotification(
        fcmToken,
        notificationTitle,
        notificationBody
        // payload
      );
      console.log(
        `Notifications sent: ${successCount} succeeded, ${failureCount} failed`
      );
    } else {
      console.log("No FCM token found for driver");
    }

    return res.status(200).json({
      status: true,
      message: `Sub service ${action} successfully`,
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

export const towcarServiceLocationData = async (req, res) => {
  try {
    const userId = req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const { rows, total } = await fetchTowCarServiceLocationData(
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

export const updateTowCarServicePrice = async (req, res) => {
  const { userId, locationId, providers } = req.body;
  const newProviders = [];
  const existingProviders = [];

  if (
    !userId ||
    !locationId ||
    !Array.isArray(providers) ||
    providers.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: userId, locationId, and providers are mandatory",
    });
  }

  if (userId === "1") {
    return res.status(403).json({
      success: false,
      message: "Superadmin cannot update tow car service prices",
    });
  }

  try {
    const existing = await existingProviderPrice({ locationId, userId });

    const existingIds = existing.map((row) => row.id);
    const incomingIds = providers.map((p) => p.providerId).filter(Boolean);

    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (toDelete.length > 0) {
      await deleteProviderPrice({ userId, locationId, toDeleteIds: toDelete });
    }

    for (let providerData of providers) {
      if (!providerData.providerId) {
        newProviders.push({
          provider: providerData.provider,
          price: providerData.price,
        });
      } else {
        existingProviders.push(providerData);
      }
    }

    if (newProviders.length > 0) {
      await addNewTowCarServicePrice({
        userId,
        locationId,
        providers: newProviders,
      });
    }

    for (let providerData of existingProviders) {
      await updateProviderPriceInDb({
        providerId: providerData.providerId,
        userId,
        locationId,
        provider: providerData.provider,
        price: providerData.price,
      });
    }

    res.status(200).json({
      success: true,
      message: "Tow car service prices updated successfully",
    });
  } catch (error) {
    console.error("Error updating tow car service price:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update tow car service price",
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

export const saveSubservicePrices = async (req, res) => {
  try {
    const { userId, locationId, subservices } = req.body;

    if (!userId || !locationId || !Array.isArray(subservices)) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: userId, locationId, and subservices[]",
      });
    }

    if (userId === "1") {
      return res.status(403).json({
        success: false,
        message: "Superadmin cannot modify subservice prices",
      });
    }

    const allIds = subservices.map((s) => s.subserviceType);
    const validSubservices = await validateSubserviceType(allIds);

    const validIds = validSubservices.map((row) => row.id);
    if (validIds.length !== allIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more subserviceType IDs are invalid",
      });
    }

    const result = await saveOrUpdateZonePrices({
      userId,
      locationId,
      subservices,
    });

    res.status(200).json({
      success: true,
      message: "Subservice prices synced successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error saving subservice price:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const addTowCarServicePrice = async (req, res) => {
  try {
    const { userId, locationId, providers } = req.body;

    if (
      !userId ||
      !locationId ||
      !Array.isArray(providers) ||
      providers.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: userId, locationId, and providers are mandatory",
      });
    }

    if (userId === "1") {
      return res.status(403).json({
        success: false,
        message: "Superadmin cannot add tow car service prices",
      });
    }

    for (let providerData of providers) {
      if (!providerData.provider || !providerData.price) {
        return res.status(400).json({
          success: false,
          message: "Each provider must have both a provider name and price",
        });
      }
    }

    const insertedIds = await addNewTowCarServicePrice({
      userId,
      locationId,
      providers,
    });

    res.status(201).json({
      success: true,
      message: "Tow car service prices saved successfully",
      data: insertedIds.map((id, index) => ({
        id,
        userId,
        locationId,
        provider: providers[index].provider,
        price: providers[index].price,
      })),
    });
  } catch (error) {
    console.error("Error saving tow car service price:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save tow car service price",
      error: error.message,
    });
  }
};

export const getKnackVehicleOdometer = async (req, res) => {
  const driverId = req.userId;

  try {
    const driverVehicle = await findVehiclesByDriverId(driverId);

    if (!driverVehicle || driverVehicle.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cannot fetch driver vehicle",
      });
    }

    const { device_name } = driverVehicle[0];
    const formattedDeviceName = formatKnackPlateNumber(device_name);

    const knackDetails = await fetchKnackVehicle(formattedDeviceName);
    const knackIdToUse = knackDetails?.knack_id;

    if (!knackIdToUse) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found in Knack table",
      });
    }

    const { data: knackData } = await axios.get(
      `https://api.knack.com/v1/objects/object_5/records/${knackIdToUse}`,
      { headers: knackHeaders }
    );

    if (!knackData || !knackData.field_23) {
      return res.status(404).json({
        success: false,
        message: "Vehicle name field not found in Knack data",
      });
    }

    let responseBody = {
      current_reading: knackData.field_30 || "",
      device_name: knackData.field_23,
    };

    res.status(200).json({
      success: true,
      message: "fetched current reading",
      data: responseBody,
    });
  } catch (error) {
    console.error("Error fetching current reading:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetched current reading",
      error: error.message,
    });
  }
};

export const postVehicleOdometerReading = async (req, res) => {
  const driverId = req.userId;
  const { odometer_reading, reading_date } = req.body;
  const maxJump = 200;

  if (!reading_date || !dayjs(reading_date, "YYYY-MM-DD", true).isValid()) {
    return res.status(400).json({
      success: false,
      message: "reading_date must be a valid date in format YYYY-MM-DD",
    });
  }

  // For local testing
  // const testPlate_number = "TEST1";
  // const testknack_id = "686eb869aff93e02f4ad81e8";

  const numericReading = Number(odometer_reading);

  if (!numericReading || numericReading <= 0) {
    return res.status(400).json({
      success: false,
      message: "Odometer reading must be a positive number",
    });
  }

  try {
    const [existingRecord, driverVehicle] = await Promise.all([
      verifyExistingReading(driverId, reading_date),
      findVehiclesByDriverId(driverId),
    ]);

    if (!driverVehicle || driverVehicle.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cannot fetch driver vehicle",
      });
    }

    const { device_name, device_id } = driverVehicle[0];
    const formattedDeviceName = formatKnackPlateNumber(device_name);

    const knackDetails = await fetchKnackVehicle(formattedDeviceName);
    const knackIdToUse = knackDetails?.knack_id;
    // const knackIdToUse = testknack_id;

    if (!knackIdToUse) {
      return res.status(404).json({
        success: false,
        message: `Vehicle not found in Knack table, Placa no. ${device_name}`,
      });
    }

    const { data: knackData } = await axios.get(
      `https://api.knack.com/v1/objects/object_5/records/${knackIdToUse}`,
      { headers: knackHeaders }
    );

    if (!knackData || !knackData.field_23) {
      return res.status(404).json({
        success: false,
        message: "Vehicle name field not found in Knack data",
      });
    }

    const nowFormatted = dayjs().tz("America/Lima").format("DD/MM/YYYY HH:mm");
    const oldOdometer = Number(knackData.field_30_raw) || 0;

    if (numericReading < oldOdometer) {
      return res.status(400).json({
        success: false,
        message: "New odometer reading cannot be less than current odometer",
      });
    }

    if (numericReading - oldOdometer > maxJump) {
      return res.status(400).json({
        success: false,
        message:
          "New odometer reading exceeds the maximum allowed jump of 200 km.",
      });
    }

    // two actions needed insert and update

    // update fields, field_149, field_30 and field_156

    const updateKnackBody = {
      field_149: nowFormatted,
      field_30: numericReading,
      field_156: knackIdToUse,
    };

    const { data: updateResponse } = await axios.put(
      `https://api.knack.com/v1/objects/object_5/records/${knackIdToUse}`,
      updateKnackBody,
      { headers: knackHeaders }
    );

    // insert fields, field_156, field_158 and field_159

    const insertKnackBody = {
      field_156: knackIdToUse,
      field_158: numericReading,
      field_159: nowFormatted,
    };

    const { data: insertResponse } = await axios.post(
      `https://api.knack.com/v1/objects/object_15/records`,
      insertKnackBody,
      { headers: knackHeaders }
    );

    let dbBody = {
      driver_id: driverId,
      vehicle_id: device_id,
      reading_date,
      odometer_reading: numericReading,
    };

    if (!existingRecord) {
      await saveDriverOdometerEntry(dbBody);
      await unBlockingDriver(driverId, reading_date);
    }

    res.status(200).json({
      success: true,
      message: "Odometer reading updated successfully",
      data: { insertResponse, updateResponse },
      reading_date: reading_date,
    });
  } catch (error) {
    console.error("Error saving vehicle odometer reading:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    let errorMessage = "Failed to save reading";

    if (error?.code === "ER_DUP_ENTRY") {
      errorMessage = "A reading for this date already exists.";
    } else if (error?.name === "ValidationError") {
      errorMessage = "Invalid data provided.";
    } else if (error?.name === "CastError") {
      errorMessage = "Invalid ID format.";
    }

    return res.status(500).json({
      success: false,
      message: errorMessage,
      error:
        process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};
export const getUnassignedDrivers = async (req, res) => {
  const { search } = req.query;

  try {
    const drivers = await queryUnassignedDrivers(search || "");

    if (!drivers || drivers.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No unassigned drivers found" });
    }

    res.status(200).json({
      status: true,
      message: "Unassigned drivers fetched successfully",
      data: drivers,
    });
  } catch (error) {
    console.error("Error in getUnassignedDrivers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reassignCaseController = async (req, res) => {
  const { caseId, driverId, deviceId } = req.body;

  if (!caseId || !driverId || !deviceId) {
    return res.status(400).json({ success: false, message: "Missing params" });
  }

  try {
    const newCaseId = await reassignCaseModel(caseId, driverId, deviceId);

    res.status(200).json({
      success: true,
      message: "Case reassigned successfully",
      newCaseId,
    });
  } catch (error) {
    console.error("Error reassigning case:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
