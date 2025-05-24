import {
  addNewCase,
  fetchCaseReportById,
  fetchDispatchCases,
  findCaseById,
  findCaseStatusById,
  saveCaseAssignedDeviceId,
  saveDispatchCaseAction,
  saveDispatchCaseReport,
  saveInvolvedVehicle,
  saveVehiclePhoto,
  updateCaseServiceById,
  updateCaseStatusById,
} from "../model/dispatch.js";
import { getAuthenticatedS3String, s3 } from "../services/azure.s3.js";
import { EventEmitter } from "events";

export const DispatchEmitter = new EventEmitter();

export const handleNewDispatchCase = async (req, res) => {
  const { userId, caseName, caseAddress, message, devicesMeta } = req.body;
  let assignedDeviceIds = req.body.assignedDeviceIds;
  let files;

  assignedDeviceIds = JSON.parse(assignedDeviceIds);

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

      dbBody.file_data = JSON.stringify(uploadedFiles);
    }

    const newCase_id = await addNewCase(dbBody);

    await Promise.all(
      assignedDeviceIds.map((device_id) =>
        saveCaseAssignedDeviceId(newCase_id, device_id)
      )
    );

    res.status(201).json({
      status: true,
      message: "Case save and request send successfully!",
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

export const fetchAllDispatchCases = async (req, res) => {
  try {
    const dispatchCases = await fetchDispatchCases();

    res.status(200).json({
      status: true,
      data: dispatchCases,
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
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
      await updateCaseStatusById(caseId, "in progress");
    }

    res.status(200).json({
      status: true,
      message: "Case action saved successfully",
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
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
      message: report,
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

  if (!caseId || !driverId) {
    return res.status(400).json({
      status: false,
      message: "Case ID and driver ID are required",
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

    const reportDetails = {
      reportId,
      caseId: parseInt(caseId),
      driverId: parseInt(driverId),
      companyId: parseInt(companyId),
      caseName: caseCheck[0]?.case_name,
      createdAt: new Date().toISOString(),
    };

    DispatchEmitter.emit("newcase", {
      reportDetails,
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
      await updateCaseStatusById(caseId, "completed");
    }

    return res.status(200).json({
      status: true,
      message: "Case service completed successfully",
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};
