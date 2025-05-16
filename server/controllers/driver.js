import {
  addDriver,
  checkAlreadyAssociatedVehicle,
  driverByEmail,
  driversShiftDetails,
  fetchDriver,
  fetchDriverAvailability,
  fetchDrivers,
  fetchDriversByUserId,
  getDriverCompany,
  removeDriver,
  saveAssociationRelation,
  updateDriver,
  updateDriverAvailability,
} from "../model/driver.js";
import {
  getLatestDriverBehaivorReports,
  getLatestDriverBehaivorReportsByUserId,
} from "../model/notifications.js";
import axios from "axios";
import { refreshShiftJobs } from "../services/cronJobs.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config.js";
import { devicesListWithSearchByCompanyId } from "../model/devices.js";
import { getAuthenticatedS3String, s3 } from "../services/azure.s3.js";

export const postDriver = async (req, res) => {
  const { userId, isSuperAdmin, traccarUserToken, ...restFields } = req.body;

  if (
    userId === undefined ||
    userId === null ||
    isNaN(userId) ||
    typeof userId !== "number"
  ) {
    return res.status(400).json({
      status: false,
      error: "User ID is required.",
    });
  }

  if (isSuperAdmin === undefined) {
    return res.status(400).json({
      status: false,
      error: "isSuperAdmin field is required and must be a boolean.",
    });
  }

  if (!isSuperAdmin && !traccarUserToken) {
    return res.status(400).json({
      status: false,
      error: "Nextop Token is required.",
    });
  }

  try {
    const { name, uniqueId, attributes, password } = restFields;

    const hashedPW = await bcrypt.hash(password, 10);

    const traccarResponse = await axios.post(
      `http://${process.env.TraccarPort}/api/drivers`,
      {
        name,
        uniqueId,
        attributes,
      },
      {
        headers: {
          Authorization: isSuperAdmin
            ? `Bearer ${process.env.TraccarToken}`
            : `Bearer ${traccarUserToken}`,
        },
      }
    );

    let dbBody = {
      ...req.body,
      traccarId: traccarResponse.data.id,
      password: hashedPW,
    };
    const newDriver = await addDriver(dbBody);

    res.status(201).json({ status: true, data: newDriver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

export const assignDriverToVehicle = async (req, res) => {
  const driver_id = req.userId;
  let files;
  const {
    vehicleId: device_id,
    odometer,
    vehicle_status: device_status,
    description,
  } = req.body;

  if (!device_id || !odometer || !device_status) {
    return res.status(400).json({
      status: false,
      message: "Device ID, Odometer, and Vehicle Status are required",
    });
  }

  try {
    const existingDevice = await checkAlreadyAssociatedVehicle(
      driver_id,
      device_id
    );

    if (existingDevice) {
      return res.status(400).json({
        status: false,
        message: "Driver is already associated with this vehicle",
      });
    }

    let dbBody = {
      device_id,
      driver_id,
      odometer,
      device_status,
    };

    if (device_status.toLowerCase() === "bad") {
      files = req.files[0];

      if (!files || !description) {
        return res.status(400).json({
          status: false,
          message: "Image and description are required",
        });
      }

      const uploadedFile = await s3
        .upload({
          Bucket: process.env.CONTABO_BUCKET_NAME,
          Key: `vehicle-report-image/${Date.now()}-${files.originalname}`,
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

      dbBody = {
        ...dbBody,
        description,
        image_url: imageUrl,
      };
    }

    const save = await saveAssociationRelation(dbBody);

    if (!save) {
      return res.status(500).json({
        status: false,
        message: "Failed to save association",
      });
    }

    res.status(201).json({
      status: true,
      message: "Driver assigned to vehicle successfully",
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getCompanyVehicles = async (req, res) => {
  const { companyId } = req.params;
  const userId = req.userId;
  const search = req.query.search || "";

  try {
    const devices = await devicesListWithSearchByCompanyId(search, companyId);

    res.status(200).json({ status: true, message: devices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

export const getDrivers = async (req, res) => {
  try {
    const drivers = await fetchDrivers();

    res.status(200).json({ status: true, message: drivers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

export const getDriver = async (req, res) => {
  const { id } = req.params;

  try {
    const driver = await fetchDriver(id);
    res.status(200).json({ status: true, message: driver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

export const getDriversByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const drivers = await fetchDriversByUserId(userId);

    res.status(200).json({ status: true, message: drivers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getDriversShiftDetails = async (req, res) => {
  const { userId } = req.query;

  try {
    const drivers = await driversShiftDetails(parseInt(userId));

    const filteredDriversDetails = drivers?.filter(
      (driver) => driver.availability_details !== null
    );

    res.status(200).send({ status: true, message: filteredDriversDetails });
  } catch (error) {
    res.status(500).send({ status: false, message: "Internal Server Error" });
  }
};

export const putDriver = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    if (body.password) {
      const hashedPW = await bcrypt.hash(body.password, 10);
      body.password = hashedPW;
    }

    await updateDriver(id, body);

    res.status(200).json({
      status: true,
      message: "Driver Updated Successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const deleteDriver = async (req, res) => {
  const { id } = req.params;

  try {
    await removeDriver(id);
    res
      .status(200)
      .json({ status: true, message: "Driver Deleted Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

export const getDriverBehaivor = async (req, res) => {
  const userId = Number(req.params.userId);
  let resp;

  try {
    if (userId === 1) {
      resp = await getLatestDriverBehaivorReports();
    } else {
      resp = await getLatestDriverBehaivorReportsByUserId(userId);
    }

    res.status(200).json({ status: true, message: resp });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

export const saveDriverAvailability = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const result = await updateDriverAvailability(parseInt(id), body);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: false,
        message: "Driver not found or availability not updated",
      });
    }

    await refreshShiftJobs();

    res.status(200).json({
      status: true,
      message: "Driver Availability Updated Successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message:
        error.message || "Something went wrong while updating availability",
    });
  }
};

export const getDriverAvailability = async (req, res) => {
  const { id } = req.params;

  try {
    const driver = await fetchDriverAvailability(parseInt(id));

    if (!driver) {
      return res.status(404).json({
        status: false,
        message: "Driver not found",
      });
    }

    let availability = [];

    if (driver.availability_details) {
      try {
        availability = JSON.parse(driver.availability_details);
      } catch (parseErr) {
        return res.status(500).json({
          status: false,
          message: parseErr.message,
        });
      }
    }

    res.status(200).json({
      status: true,
      message: availability,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

export const driverLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const driver = await driverByEmail(email);

    if (!driver) {
      return res.status(404).json({
        status: false,
        message: "Driver not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, driver.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: false,
        message: "Invalid password",
      });
    }

    const parsedAttributes = JSON.parse(driver.attributes);

    const token = jwt.sign(
      { id: driver.id, email: parsedAttributes.email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
      }
    );

    const driverData = {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      uniqueId: driver.uniqueId,
      companyId: driver.user_id,
      // attributes: JSON.parse(driver.attributes),
      // location: JSON.parse(driver.location),
      token,
    };

    res.status(200).json({
      status: true,
      message: driverData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

export const driverLogout = async (req, res) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(400).json({
        status: false,
        message: "Token is required",
      });
    }

    res.status(200).json({ status: true, message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};
