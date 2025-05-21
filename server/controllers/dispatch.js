import {
  addNewCase,
  fetchDispatchCases,
  findCaseStatusById,
  saveDispatchCaseAction,
  saveDispatchCaseReport,
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
  const { suggestedServices, subservices, additionalInformation } = req.body;
  const files = req.files || [];
  const plateNumbers = req.body.plateNumbers || [];

  if (!caseId || !driverId) {
    return res
      .status(400)
      .json({ status: false, message: "Case ID and driver ID are required" });
  }
  try {
    const caseCheck = await findCaseStatusById(caseId, driverId);

    if (!caseCheck.length || caseCheck[0].status !== "in progress") {
      return res
        .status(400)
        .json({ status: false, message: "Invalid or unaccepted case" });
    }

    const photosWithMetadata = await Promise.all(
      files.map(async (file) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const key = `photos/${uniqueSuffix}-${file.originalname}`;

        const params = {
          Bucket: process.env.CONTABO_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        const data = await s3.upload(params).promise();
        const originalUrl = data.Location;
        const authenticatedUrl = getAuthenticatedS3String(originalUrl);

        if (!authenticatedUrl) {
          throw new Error("Failed to generate authenticated URL");
        }

        return {
          url: authenticatedUrl,
          mimetype: file.mimetype,
          originalname: file.originalname,
        };
      })
    );

    const photoStructure = plateNumbers.map((plate, index) => {
      const vehiclePhotos = photosWithMetadata
        .filter((photo) => {
          return true;
        })
        .slice(index * 4, (index + 1) * 4);

      return {
        clientVehicle: vehiclePhotos
          .filter((p) =>
            ["image/jpeg", "image/jpg", "image/png"].includes(p.mimetype)
          )
          .map((p) => p.url),
        clientDocument: vehiclePhotos
          .filter((p) => p.mimetype === "application/pdf")
          .map((p) => p.url),
        additionalInformation: {
          description: additionalInformation || "",
          multipleImages: vehiclePhotos
            .filter((p) =>
              ["image/jpeg", "image/jpg", "image/png"].includes(p.mimetype)
            )
            .map((p) => p.url),
          plateNumber: plate || "",
        },
      };
    });

    const reportData = {
      case_id: parseInt(caseId),
      driver_id: parseInt(driverId),
      suggested_services: suggestedServices || null,
      subservices: subservices || null,
      additional_information: additionalInformation || null,
      photos: JSON.stringify(photoStructure),
    };

    await saveDispatchCaseReport(reportData);

    res.status(201).json({
      status: true,
      message: "Report submitted successfully",
    });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};
