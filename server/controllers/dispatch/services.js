import {
  addDispatchServices,
  fetchAllDispatchServices,
} from "../../model/dispatch/dispatch.js";

export const postDispatchServices = async (req, res) => {
  const body = req.body.service;

  try {
    const newDispatchServices = await addDispatchServices(body);

    res.status(201).json({ success: true, data: newDispatchServices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllDispatchServices = async (req, res) => {
  try {
    const dispatchServices = await fetchAllDispatchServices();
    res.status(200).json({ success: true, data: dispatchServices });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
