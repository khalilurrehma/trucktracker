import * as operationModel from "../../model/operation/operationModel.js";
import { getCalculatorIdsByOperationId } from "../../model/calculatorAssignments.js";

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

export const getOperationCalculatorIds = async (req, res) => {
  const { id } = req.params;

  try {
    const calcIds = await getCalculatorIdsByOperationId(id);
    res.status(200).json({ status: true, data: calcIds || [] });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};
