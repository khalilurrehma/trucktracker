import { fetchAllTraccarDevices } from "../model/traccar.js";

export const allDevicesLists = async (req, res) => {
  try {
    const devices = await fetchAllTraccarDevices();

    res.status(200).send({ status: true, message: devices });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: "Server error" });
  }
};
