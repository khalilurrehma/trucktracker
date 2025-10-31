// server/controllers/operation/deviceAssignmentController.js
import {
  createDeviceAssignment,
  getAllAssignments,
  getAssignmentById,
  markAssignmentCompleted,
  deleteDeviceAssignment,
} from "../../model/operation/deviceAssignmentModel.js";

// ✅ Create
export const createAssignment = async (req, res) => {
  try {
    const { device_id, operation_id, zone_id } = req.body;

    if (!device_id || !operation_id) {
      return res.status(400).json({ error: "device_id and operation_id are required" });
    }

    const assignment = await createDeviceAssignment({
      device_id: Number(device_id),
      operation_id: Number(operation_id),
      zone_id: zone_id ? Number(zone_id) : null,
    });

    res.status(201).json(assignment);
  } catch (err) {
    console.error("❌ Error creating assignment:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get all
export const fetchAllAssignments = async (req, res) => {
  try {
    const results = await getAllAssignments();
    res.status(200).json(results);
  } catch (err) {
    console.error("❌ Error fetching assignments:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get by ID
export const fetchAssignmentById = async (req, res) => {
  try {
    const result = await getAssignmentById(req.params.id);
    if (!result) return res.status(404).json({ message: "Assignment not found" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Mark complete
export const completeAssignment = async (req, res) => {
  try {
    const success = await markAssignmentCompleted(req.params.id);
    if (!success) return res.status(404).json({ message: "Assignment not found" });
    res.status(200).json({ message: "Assignment marked as completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete
export const removeAssignment = async (req, res) => {
  try {
    const { device_id, zone_id } = req.body;

    if (!device_id || !zone_id)
      return res.status(400).json({ error: "device_id and zone_id are required" });

    const success = await deleteDeviceAssignment(device_id, zone_id);
    if (!success) return res.status(404).json({ message: "Assignment not found" });

    res.status(200).json({ message: "Assignment deleted and unassigned from Flespi" });
  } catch (err) {
    console.error("❌ Error removing assignment:", err.message);
    res.status(500).json({ error: err.message });
  }
};
