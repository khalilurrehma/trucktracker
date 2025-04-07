import { getAllProtocols } from "../services/flespiApis.js";

export const getProtocols = async (req, res) => {
  try {
    const data = await getAllProtocols();

    res.json({
      status: true,
      message: data.result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};
