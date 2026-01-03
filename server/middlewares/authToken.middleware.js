import jwt from "jsonwebtoken";

const extractToken = (req) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.headers["x-auth-token"] || null;
};

export const authToken = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ status: false, message: "Access denied. No token provided." });
  }

  const expected = process.env.AUTH_TOKEN;
  if (expected && token === expected) {
    req.auth = { type: "static" };
    return next();
  }

  const jwtSecret = process.env.ACCESS_TOKEN_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ status: false, message: "Server auth is not configured." });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.auth = { type: "jwt", ...decoded };
    return next();
  } catch (error) {
    return res.status(401).json({ status: false, message: "Unauthorized" });
  }
};
