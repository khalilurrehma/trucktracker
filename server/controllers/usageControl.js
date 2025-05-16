import { deviceShiftAssigned } from "../model/devices.js";
import { confirmDriverShift, fetchDriver } from "../model/driver.js";
import {
  actionCommandByTypeId,
  addDeviceShift,
  addLogAndReport,
  addUsageActions,
  assignDriver,
  checkTypeIdConfig,
  enrichAvailabilityDetailsWithShiftData,
  fetchAllLogs,
  fetchAllLogsbyUserId,
  fetchAllReports,
  fetchAllReportsByUserId,
  fetchControlUsageTable,
  fetchControlUsageTableByUserId,
  fetchDeviceShiftByDeviceId,
  fetchDeviceShiftById,
  fetchDeviceShiftByUserId,
  fetchDeviceUsageById,
  fetchUsageReportOfUser,
  generateUsageReport,
  getAllActionByUserId,
  getDeviceShift,
  modifyExtendTime,
  removeDeviceShift,
  removeUsageReport,
  unAssignUsageControl,
  updateDeviceInUsageControl,
  updateDeviceShift,
  updateReason,
  updateUsageControl,
  updateUsageControlShift,
  updateUsageResponse,
} from "../model/usageControl.js";
import {
  initializeCronJobs,
  refreshShiftJobs,
  scheduleShiftJobs,
} from "../services/cronJobs.js";

export const postUsageActions = async (req, res) => {
  const body = req.body;

  try {
    const action = await addUsageActions(body);

    res.status(201).json({ status: true, message: action });
  } catch (error) {
    console.error(error);
  }
};

export const postUsageReport = async (req, res) => {
  const body = req.body;
  const { device_type_info, actionCommand } = body;

  try {
    const existingRecords = await checkTypeIdConfig(device_type_info.id);

    const isDuplicate = existingRecords.some(
      (record) => record.actionCommand === actionCommand
    );

    if (isDuplicate) {
      return res.status(400).json({
        status: false,
        message:
          "Duplicate actionCommand for this device_type_info.id already exists.",
      });
    }

    await generateUsageReport(body);

    res.status(200).json({
      status: true,
      message: "Command has been configured successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

export const putUsageReport = async (req, res) => {
  const { deviceId, commandId } = req.params;
  const body = req.body;
  try {
    const modifiedRes = await updateUsageResponse(deviceId, commandId, body);

    res.status(200).json({ status: true, message: modifiedRes });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getUsageActionsOfUser = async (req, res) => {
  const id = req.params.userId;

  try {
    const actions = await getAllActionByUserId(id);

    res.status(200).json({ status: true, message: actions });
  } catch (error) {
    console.error(error);
  }
};

export const getUsageReportByUserId = async (req, res) => {
  const id = req.params.userId;

  try {
    const actions = await fetchUsageReportOfUser(id);

    res.status(200).json({ status: true, message: actions });
  } catch (error) {
    console.error(error);
  }
};

export const actionCommand = async (req, res) => {
  const typeId = parseInt(req.params.typeId);

  try {
    const actions = await actionCommandByTypeId(typeId);

    res.status(200).json({ status: true, message: actions });
  } catch (error) {
    console.error(error);
  }
};

export const getUsageControlInfo = async (req, res) => {};

export const postDeviceShift = async (req, res) => {
  const body = req.body;
  const { deviceId, shiftId, driver_id } = body;

  try {
    const driverResult = await confirmDriverShift(driver_id);

    if (!driverResult.exists) {
      return res.status(404).json({
        success: false,
        message:
          driverResult.message || "Driver's Shift is missing or not assigned.",
      });
    }

    const newDeviceShift = await addDeviceShift(body);

    if (!newDeviceShift.insertId) {
      return res
        .status(400)
        .json({ status: false, message: "Failed to add device shift" });
    }

    try {
      const [updateResult, assignedDriver, deviceAssigned] = await Promise.all([
        updateUsageControl(
          deviceId,
          newDeviceShift.insertId,
          driver_id,
          "newDeviceShift"
        ).catch((e) => {
          throw new Error("updateUsageControl failed: " + e.message);
        }),
        assignDriver(driver_id, true).catch((e) => {
          throw new Error("assignDriver failed: " + e.message);
        }),
        deviceShiftAssigned(deviceId, true).catch((e) => {
          throw new Error("deviceShiftAssigned failed: " + e.message);
        }),
      ]);

      console.log(
        `All update operations completed. "postDeviceShift Controller" `
      );

      await refreshShiftJobs();
      res.status(201).json({
        status: true,
        message: `Shift added successfully, Shift Id: ${newDeviceShift.insertId}`,
      });
    } catch (updateError) {
      console.error("Error during shift update:", updateError);
      return res.status(400).json({
        status: false,
        message: updateError.message || "Shift update failed",
      });
    }
  } catch (error) {
    console.error("Error in postDeviceShift:", error);
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getDeviceShiftId = async (req, res) => {
  try {
    const deviceShift = await getDeviceShift();

    res.status(200).json({ status: true, message: deviceShift });
  } catch (error) {
    console.error(error);
  }
};

export const getDeviceShiftById = async (req, res) => {
  const id = req.params.id;

  try {
    const deviceShift = await fetchDeviceShiftById(id);

    res.status(200).json({ status: true, message: deviceShift });
  } catch (error) {
    console.error(error);
  }
};

export const getDeviceShiftByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const deviceShift = await fetchDeviceShiftByUserId(userId);

    res.status(200).json({ status: true, message: deviceShift });
  } catch (error) {
    console.error(error);
  }
};

export const getDeviceShiftByDeviceId = async (req, res) => {
  const deviceId = req.params.deviceId;

  try {
    const deviceShift = await fetchDeviceShiftByDeviceId(deviceId);

    res.status(200).json({ status: true, message: deviceShift });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const updateDeviceShiftId = async (req, res) => {
  const { id, prevDriverId } = req.params;
  const body = req.body;
  const deviceId = body.deviceId;
  const shiftId = body.shiftId;
  const driverId = body.driver_id;

  try {
    const [updatedShift, updateResult, assignedDriver] = await Promise.all([
      updateDeviceShift(id, prevDriverId, body),
      updateUsageControl(
        deviceId,
        shiftId,
        null,
        driverId,
        "deviceShiftUpdate"
      ),
      assignDriver(driverId),
    ]);

    if (updateResult.affectedRows === 0) {
      return res.status(400).json({
        status: false,
        message: "Can't update usage control",
      });
    }

    res.status(200).json({
      status: true,
      message: `Device Shift updated successfully`,
    });
  } catch (error) {
    console.error(error);
  }
};

export const updateExtendTime = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const updatedShift = await modifyExtendTime(parseInt(id), body);

    await scheduleShiftJobs();

    res.status(200).json({
      status: true,
      message: `Device Shift extended successfully`,
    });
  } catch (error) {
    console.error(error);
  }
};

export const deleteDeviceShiftId = async (req, res) => {
  const id = req.params.id;
  const { deviceId, shiftId, driverId } = req.query;

  try {
    const [removeResponse, updateResult, assignedDriver, deviceAssigned] =
      await Promise.all([
        removeDeviceShift(id),
        unAssignUsageControl(deviceId),
        assignDriver(driverId, false),
        deviceShiftAssigned(deviceId, false),
      ]);
    await refreshShiftJobs();
    res
      .status(200)
      .json({ status: true, message: "Shift deleted successfully" });
  } catch (error) {
    console.error(error);
  }
};

// USAGE CONTROL TABLE:

export const getControlAllDevice = async (req, res) => {
  const { page = 1, limit = 10, searchTerm = "" } = req.query;

  try {
    const { data, total } = await fetchControlUsageTable(
      parseInt(page),
      parseInt(limit),
      searchTerm
    );

    const enrichedTable = await enrichAvailabilityDetailsWithShiftData(data);

    res.status(200).json({
      status: true,
      message: enrichedTable,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getControlDevicesByUserId = async (req, res) => {
  const { page = 1, limit = 10, searchTerm = "" } = req.query;
  const { userId } = req.params;

  try {
    const { data, pagination } = await fetchControlUsageTableByUserId(
      userId,
      parseInt(page),
      parseInt(limit),
      searchTerm
    );

    const enrichedTable = await enrichAvailabilityDetailsWithShiftData(data);

    res.status(200).json({
      status: true,
      message: enrichedTable,
      pagination: {
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, error: error.message });
  }
};

export const modifyUsageControlShift = async (req, res) => {
  const { userId, deviceId, shiftId, driverId } = req.params;
  const body = req.body;

  const deviceShift = {
    deviceBody: body.device,
    driver_id: body.driverId,
    shiftId: body.shiftId,
    queue: 0,
    queue_time: 0,
    userId: userId,
  };

  try {
    const [controlUpdate, assignedDriver] = await Promise.all([
      updateUsageControlShift(deviceId, shiftId, driverId, deviceShift),
      assignDriver(driverId),
    ]);

    res
      .status(200)
      .json({ status: controlUpdate.status, message: controlUpdate.message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, error: error.message });
  }
};

export const modifyControlUsageDeviceConfig = async (req, res) => {
  const { deviceId } = req.params;
  const body = req.body;
  const { driverId } = req.body;

  try {
    const [updateResponse, assignResponse] = await Promise.all([
      updateDeviceInUsageControl(deviceId, body),
      assignDriver(driverId),
    ]);

    res.status(200).json({
      status: true,
      message:
        "Device configuration and driver assignment updated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: false,
      error:
        error.message ||
        "An error occurred while updating the device configuration",
    });
  }
};

export const modifyUsageControlReason = async (req, res) => {
  const { reason, deviceId } = req.body;

  try {
    await updateReason(reason, deviceId);
    res.status(200).json({
      status: true,
      message: "Usage control reason updated successfully",
    });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const generateLogAndReport = async (req, res) => {
  const body = req.body;

  try {
    await addLogAndReport(body);

    res.status(200).json({ status: true, message: "Log generated" });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getAllGeneratedLogs = async (req, res) => {
  try {
    const logs = await fetchAllLogs();

    res.status(200).json({ status: true, message: logs });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getAllGeneratedLogsByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const logs = await fetchAllLogsbyUserId(userId);

    if (!logs && logs.length === 0) {
      return res.status(404).json({ status: false, message: "No logs found" });
    }

    res.status(200).json({ status: true, message: logs });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getAllUsageReports = async (req, res) => {
  try {
    const logs = await fetchAllReports();

    res.status(200).json({ status: true, message: logs });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getAllUsageReportsByUserId = async (req, res) => {
  const { userId } = req.params;
  try {
    const logs = await fetchAllReportsByUserId(userId);

    res.status(200).json({ status: true, message: logs });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getUsageControlDeviceById = async (req, res) => {
  const { deviceId } = req.params;

  try {
    const device = await fetchDeviceUsageById(deviceId);
    if (!device) {
      return res
        .status(404)
        .json({ status: false, message: "Device not found" });
    }

    res.status(200).json({ status: true, message: device });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const deleteUsageReport = async (req, res) => {
  const { id } = req.params;
  try {
    await removeUsageReport(id);

    res
      .status(200)
      .json({ status: true, message: "Usage report deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};
