import {
  getLayersByOperationId,
  createOperationLayer,
  updateOperationLayer,
  deleteOperationLayer,
} from "../../model/operation/operationLayersModel.js";

const parseLayerRow = (row) => {
  let data = row.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (error) {
      // keep raw string
    }
  }
  return {
    id: row.id,
    operation_id: row.operation_id,
    name: row.name,
    type: row.type,
    visible: Boolean(row.visible),
    opacity: Number(row.opacity ?? 1),
    data,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const listOperationLayers = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await getLayersByOperationId(id);
    res.json(rows.map(parseLayerRow));
  } catch (error) {
    console.error("Error fetching operation layers:", error);
    res.status(500).json({ message: "Failed to fetch layers." });
  }
};

export const createLayer = async (req, res) => {
  try {
    const { id } = req.params;
    const layer = req.body || {};
    if (!layer.name || !layer.type) {
      return res.status(400).json({ message: "name and type are required." });
    }
    const layerId = await createOperationLayer(id, layer);
    const rows = await getLayersByOperationId(id);
    const created = rows.find((row) => row.id === layerId);
    res.status(201).json(created ? parseLayerRow(created) : { id: layerId });
  } catch (error) {
    console.error("Error creating operation layer:", error);
    res.status(500).json({ message: "Failed to create layer." });
  }
};

export const updateLayer = async (req, res) => {
  try {
    const { id, layerId } = req.params;
    const updates = req.body || {};
    const affected = await updateOperationLayer(id, layerId, updates);
    if (!affected) {
      return res.status(404).json({ message: "Layer not found." });
    }
    const rows = await getLayersByOperationId(id);
    const updated = rows.find((row) => String(row.id) === String(layerId));
    res.json(updated ? parseLayerRow(updated) : { id: Number(layerId) });
  } catch (error) {
    console.error("Error updating operation layer:", error);
    res.status(500).json({ message: "Failed to update layer." });
  }
};

export const removeLayer = async (req, res) => {
  try {
    const { id, layerId } = req.params;
    const affected = await deleteOperationLayer(id, layerId);
    if (!affected) {
      return res.status(404).json({ message: "Layer not found." });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting operation layer:", error);
    res.status(500).json({ message: "Failed to delete layer." });
  }
};
