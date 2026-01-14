import jwt from "jsonwebtoken";

const getAuthSecret = () =>
  process.env.WEB_ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;

export const authWebToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
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

  const authSecret = getAuthSecret();
  if (!authSecret) {
    return res.status(500).json({
      status: false,
      message: "Auth secret is not configured.",
    });
  }

  try {
    const decoded = jwt.verify(token, authSecret);
    req.authUser = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      status: false,
      message: "Unauthorized",
    });
  }
};
