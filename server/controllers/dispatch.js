import {
  addNewCase,
  fetchDispatchCases,
  findCaseById,
  findCaseStatusById,
  saveDispatchCaseAction,
  saveDispatchCaseReport,
  updateCaseServiceById,
  updateCaseStatusById,
} from "../model/dispatch.js";
import { getAuthenticatedS3String, s3 } from "../services/azure.s3.js";

export const handleNewDispatchCase = async (req, res) => {
  const {
    assignedDeviceId,
    userId,
    caseName,
    caseAddress,
    status,
    message,
    cost,
  } = req.body;
  let files;

  if (!assignedDeviceId || !caseName || !caseAddress || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const dbBody = {
      assigned_device_id: assignedDeviceId,
      user_id: userId,
      case_name: caseName,
      case_address: caseAddress,
      cost,
      status,
      message,
    };

    if (req.files) {
      files = req.files[0];

      if (!files) {
        return res.status(400).json({ error: "No files provided" });
      }

      const uploadedFile = await s3
        .upload({
          Bucket: process.env.CONTABO_BUCKET_NAME,
          Key: `dispatch-case-image/${Date.now()}-${
            files.originalname ? files.originalname : "no-file"
          }`,
          Body: files?.buffer,
          ContentType: files.mimetype,
          ACL: "public-read",
        })
        .promise();

      if (!uploadedFile) {
        return res.status(500).json({
          status: false,
          message: "Failed to upload image",
        });
      }

      const imageUrl = getAuthenticatedS3String(uploadedFile.Location);

      dbBody.file_url = imageUrl;
    }

    await addNewCase(dbBody);

    res.status(201).json({
      status: true,
      message: "Case added successfully",
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

export const dispatchCaseReport = async (req, res) => {
  const driverId = req.userId;
  const { caseId } = req.params;
  const {
    suggestedServices,
    subservices,
    additionalInformation = "",
    fileMeta = [],
    plateNumbers = [],
  } = req.body;

  const files = req.files || [];

  if (!caseId || !driverId) {
    return res.status(400).json({
      status: false,
      message: "Case ID and driver ID are required",
    });
  }

  if (
    !files.length ||
    !plateNumbers.length ||
    fileMeta.length !== files.length
  ) {
    return res.status(400).json({
      status: false,
      message: "Missing or mismatched files and metadata",
    });
  }

  try {
    const caseCheck = await findCaseStatusById(caseId);

    if (!caseCheck.length || caseCheck[0].status !== "in progress") {
      return res.status(400).json({
        status: false,
        message: "Invalid or unaccepted case",
      });
    }

    const parsedMeta = fileMeta.map((m) => {
      if (typeof m === "string") {
        return JSON.parse(m);
      }
      return m;
    });

    const uploadedPhotos = await Promise.all(
      files.map(async (file, index) => {
        const meta = parsedMeta[index];
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const key = `photos/${uniqueSuffix}-${file.originalname}`;

        const params = {
          Bucket: process.env.CONTABO_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        const data = await s3.upload(params).promise();
        const originalUrl = data.Location;
        const authenticatedUrl = getAuthenticatedS3String(originalUrl);

        return {
          url: authenticatedUrl,
          mimetype: file.mimetype,
          ...meta,
        };
      })
    );

    const grouped = {};

    uploadedPhotos.forEach((photo) => {
      const index = photo.vehicleIndex;

      if (!grouped[index]) {
        grouped[index] = {
          plate_number: plateNumbers[index] || "",
          clientVehicle: [],
          clientDocument: [],
          additionalInformation: {
            multipleImages: [],
            description: additionalInformation || "",
          },
        };
      }

      if (photo.category === "Client Vehicle") {
        grouped[index].clientVehicle.push({ type: photo.type, url: photo.url });
      } else if (photo.category === "Client Document") {
        grouped[index].clientDocument.push({
          type: photo.type,
          url: photo.url,
        });
      } else if (photo.category === "Additional information") {
        grouped[index].additionalInformation.multipleImages.push(photo.url);
      }
    });

    const photoStructure = Object.values(grouped);

    const reportData = {
      case_id: parseInt(caseId),
      driver_id: parseInt(driverId),
      suggested_services: suggestedServices || null,
      subservices: subservices || null,
      additional_information: additionalInformation || null,
      photos: JSON.stringify(photoStructure),
    };

    await saveDispatchCaseReport(reportData);

    return res.status(201).json({
      status: true,
      message: reportData,
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
