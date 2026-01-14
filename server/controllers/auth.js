import bcrypt from "bcrypt";
import crypto from "crypto";
import util from "util";
import jwt from "jsonwebtoken";
import { traccar1Db } from "../config/dbConfig.js";

const getAuthSecret = () =>
  process.env.WEB_ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;

const getTokenExpiry = () =>
  process.env.WEB_ACCESS_TOKEN_EXPIRES_IN || "7d";

export const issueWebToken = async (req, res) => {
  const { email, password, code } = req.body || {};

  if (!email ) {
    return res.status(400).json({
      status: false,
      message: "Email are required.",
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
    const query = util.promisify(traccar1Db.query).bind(traccar1Db);
    const rows = await query(
      "SELECT id, name, email, hashedpassword, salt FROM tc_users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        status: false,
        message: "Invalid Traccar credentials.",
      });
    }

    const userRecord = rows[0];
    console.log(userRecord);


    const user = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      admin: Boolean(userRecord.admin),
    };
    const payload = {
      id: user.id,
      email: user.email || email,
      name: user.name,
      admin: user.admin,
    };

    const token = jwt.sign(payload, authSecret, {
      expiresIn: getTokenExpiry(),
    });

    return res.status(200).json({
      status: true,
      token,
      user: payload,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error,
    });
  }
};
