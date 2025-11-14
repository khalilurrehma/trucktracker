import * as zoneModel from '../../model/operation/zoneModel.js';  // Import the zone model

// Create a new zone
export const createZone = async (req, res) => {
  try {
    const zone = req.body;
    // Validate the incoming data
    if (!zone.operationId || !zone.name || !zone.geometry) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const newZone = await zoneModel.createZone(zone);
    res.status(201).json(newZone);
  } catch (err) {
    console.error("Error creating zone:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Update an existing zone
export const updateZone = async (req, res) => {
  const { id } = req.params;
  const zoneData = req.body;

  try {
    if (!zoneData.name || !zoneData.geometry) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const updatedZone = await zoneModel.updateZone(id, zoneData);
    if (updatedZone.message) {
      return res.status(404).json(updatedZone);
    }
    res.status(200).json(updatedZone);
  } catch (err) {
    console.error("Error updating zone:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get all zones
export const getAllZones = async (req, res) => {
  try {
    const zones = await zoneModel.getAllZones();
    res.status(200).json(zones);
  } catch (err) {
    console.error("Error fetching zones:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get a single zone by ID
export const getZoneById = async (req, res) => {
  const { id } = req.params;
  try {
    const zone = await zoneModel.getZoneById(id);
    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }
    res.status(200).json(zone);
  } catch (err) {
    console.error("Error fetching zone:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Delete a zone by ID
export const deleteZone = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await zoneModel.deleteZone(id);
    if (!result) {
      return res.status(404).json({ message: "Zone not found" });
    }
    res.status(200).json({ message: "Zone deleted successfully" });
  } catch (err) {
    console.error("Error deleting zone:", err.message);
    res.status(500).json({ error: err.message });
  }
};


export const getZonesByOperationId = async (req, res) => {
  const { operationId } = req.params;

  try {
    const zones = await zoneModel.getZonesByOperationId(operationId);

    if (!zones || zones.length === 0) {
      return res.status(200).json([]); // return empty list, not 404
    }

    res.status(200).json(zones);
  } catch (err) {
    console.error("Error fetching zones by operation:", err.message);
    res.status(500).json({ error: err.message });
  }
};