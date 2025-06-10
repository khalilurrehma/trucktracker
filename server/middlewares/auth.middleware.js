import jwt from "jsonwebtoken";
import { checkSessionInDB } from "../model/driver.js";

export const authDriver = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: false,
      message: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      status: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const isSessionValid = await checkSessionInDB(decoded.id, token);
    if (!isSessionValid) {
      return res.status(401).json({
        status: false,
        message: "Session expired or logged out from another device",
      });
    }

    req.userId = decoded.id;
    req.email = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({
      status: false,
      message: "Unauthorized",
    });
  }
};
