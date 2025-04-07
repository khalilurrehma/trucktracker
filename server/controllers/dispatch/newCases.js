import { addNewCase, fetchAllNewCases } from "../../model/dispatch/newCases.js";

export const postNewCase = async (req, res) => {
  const body = req.body;

  try {
    await addNewCase(body);
    res.status(201).json({ success: true, data: "Data inserted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllNewCases = async (req, res) => {
  try {
    const result = await fetchAllNewCases();

    if (!result.length) {
      res.status(404).json({ success: false, message: "No data found" });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
