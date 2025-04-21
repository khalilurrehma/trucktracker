import {
  addDriver,
  driversShiftDetails,
  fetchDriver,
  fetchDriverAvailability,
  fetchDrivers,
  fetchDriversByUserId,
  removeDriver,
  updateDriver,
  updateDriverAvailability,
} from "../model/driver.js";
import {
  getLatestDriverBehaivorReports,
  getLatestDriverBehaivorReportsByUserId,
} from "../model/notifications.js";
import axios from "axios";
import { refreshShiftJobs } from "../services/cronJobs.js";

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
    const { name, uniqueId, attributes } = restFields;

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
    };
    const newDriver = await addDriver(dbBody);

    res.status(201).json({ status: true, data: newDriver });
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
    const updatedDriver = await updateDriver(id, body);
    res
      .status(200)
      .json({ status: true, message: "Driver Updated Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
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
