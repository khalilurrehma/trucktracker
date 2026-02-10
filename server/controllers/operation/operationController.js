import * as operationModel from "../../model/operation/operationModel.js";
import {
  getAssignedCalculatorIdsByOperationId,
  getCalculatorIdsByOperationId,
} from "../../model/calculatorAssignments.js";
import { duplicateOperation } from "../../services/operationDuplicate.js";

// Create a new operation
export const createOperation = async (req, res) => {
  const operation = req.body;

  try {
    const result = await operationModel.createOperation(operation);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update an existing operation
export const updateOperation = async (req, res) => {
  const { id } = req.params;
  const operation = req.body;

  try {
    const result = await operationModel.updateOperation(id, operation);
    if (result.message) return res.status(404).json(result);  // If the operation wasn't found
    res.status(200).json(result);  // Return updated operation
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all operations
export const getAllOperations = async (req, res) => {
  try {
    const result = await operationModel.getAllOperations();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single operation by ID
export const getSingleOperation = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await operationModel.getOperationById(id);
    if (!result) return res.status(404).json({ message: "Operation not found" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete an operation by ID
export const deleteOperation = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await operationModel.deleteOperation(id);
    if (!result) return res.status(404).json({ message: "Operation not found" });
    res.status(200).json({ message: "Operation deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const duplicateOperationWithAll = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body || {};

  try {
    const result = await duplicateOperation(Number(id), { name });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getOperationCalculatorIds = async (req, res) => {
  const { id } = req.params;
  const assignedOnly =
    String(req.query.assignedOnly || "").toLowerCase() === "true" ||
    String(req.query.assignedOnly || "") === "1";

  try {
    let calcIds = assignedOnly
      ? await getAssignedCalculatorIdsByOperationId(id)
      : await getCalculatorIdsByOperationId(id);
    if (assignedOnly && (!calcIds || calcIds.length === 0)) {
      calcIds = await getCalculatorIdsByOperationId(id);
    }
    res.status(200).json({ status: true, data: calcIds || [] });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};

export const syncOperationCalculators = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await operationModel.syncOperationCalculatorsToDevices(id);
    res.status(200).json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};
