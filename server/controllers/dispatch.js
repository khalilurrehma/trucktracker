import { addNewCase, fetchDispatchCases } from "../model/dispatch.js";
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

      const uploadedFile = await s3
        .upload({
          Bucket: process.env.CONTABO_BUCKET_NAME,
          Key: `dispatch-case-image/${Date.now()}-${files.originalname}`,
          Body: files.buffer,
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
