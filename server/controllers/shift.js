import { getDevicesByUserId } from "../model/devices.js";
import {
  addNewShift,
  fetchShifts,
  updateShift,
  deleteShift,
  fetchShiftById,
  fetchShiftByType,
  fetchShiftByUserId,
  fetchAttendanceReports,
} from "../model/shift.js";
import { refreshShiftJobs } from "../services/cronJobs.js";

export const newShift = async (req, res) => {
  const body = req.body;

  try {
    const newShift = await addNewShift(body);

    res.status(201).json({
      status: true,
      message: newShift.insertId,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getShifts = async (req, res) => {
  try {
    const shifts = await fetchShifts();
    res.status(200).json({ status: true, message: shifts });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getShiftByType = async (req, res) => {
  const { type } = req.body;

  try {
    const shifts = await fetchShiftByType(type);
    res.status(200).json({ status: true, message: shifts });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getShiftByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const shifts = await fetchShiftByUserId(parseInt(userId));
    res.status(200).json({ status: true, message: shifts });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getShiftById = async (req, res) => {
  const { id } = req.params;
  try {
    const shift = await fetchShiftById(id);
    if (!shift) {
      return res
        .status(404)
        .json({ status: false, message: "Shift not found" });
    }

    res.status(200).json({ status: true, message: shift });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const modifyShifts = async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  try {
    const result = await updateShift(body, id);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Shift not found" });
    }
    if (result.changedRows === 0) {
      return res.status(200).json({
        status: true,
        message: "No changes made to the shift",
      });
    }
    await refreshShiftJobs();
    res
      .status(200)
      .send({ status: true, message: "Shift updated successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const removeShift = async (req, res) => {
  const { id } = req.params;

  try {
    await deleteShift(id);
    res
      .status(200)
      .send({ status: true, message: "Shift deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAttendanceReports = async (req, res) => {
  const { userId } = req.query;
  let filterDevicesReport;
  try {
    const attendanceReports = await fetchAttendanceReports();

    if (userId) {
      const companyDevices = await getDevicesByUserId(userId);

      if (companyDevices.length > 0) {
        const deviceIds = companyDevices.map((device) => device.flespiId);
        filterDevicesReport = attendanceReports?.filter((report) =>
          deviceIds.includes(report.flespi_device_id)
        );
      } else {
        filterDevicesReport = [];
      }
    }

    res.status(200).json({
      status: true,
      message: userId ? filterDevicesReport : attendanceReports,
    });
  } catch (error) {}
};
