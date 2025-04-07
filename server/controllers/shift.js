import {
  addNewShift,
  fetchShifts,
  updateShift,
  deleteShift,
  fetchShiftById,
  fetchShiftByType,
  fetchShiftByUserId,
} from "../model/shift.js";

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
    await updateShift(body, id);
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
