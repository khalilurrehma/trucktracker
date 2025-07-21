import jwt from "jsonwebtoken";
import {
  checkSessionInDB,
  findAssociateVehicleByDriverId,
  isDriverBlocked,
} from "../model/driver.js";

export const authDriver = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const knack_platform = req.query?.knack_platform === "true";

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

    const [isSessionValid, sessionVehicle, driverBlocked] = await Promise.all([
      checkSessionInDB(decoded.id, token),
      findAssociateVehicleByDriverId(decoded.id),
      isDriverBlocked(decoded.id),
    ]);

    if (
      !Array.isArray(isSessionValid) ||
      isSessionValid.length === 0 ||
      !sessionVehicle ||
      (!knack_platform && driverBlocked)
    ) {
      return res.status(401).json({
        status: false,
        message: "Session expired or logged out from another device",
      });
    }

    req.userId = decoded.id;
    req.email = decoded.email;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({
      status: false,
      message: "Unauthorized",
    });
  }
};
