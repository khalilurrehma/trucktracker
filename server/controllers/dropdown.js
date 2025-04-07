import { getFlespiDevices } from "../services/flespiApis.js";

export const getAllDevicesDropDown = async (req, res) => {
  try {
    const data = await getFlespiDevices();

    const devices = data.result.map((device) => ({
      id: device.id,
      name: device.name,
      protocol_id: device.protocol_id,
    }));

    res.status(200).send({ success: true, message: devices });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: "Server error" });
  }
};

export const getGroupsDropdown = async (req, res) => {};
