import { subaccountDeviceCount } from "../model/devices.js";
import { subaccountUserCount } from "../model/realm.js";
import {
  subaccountDeviceLimit,
  subaccountUserLimit,
} from "../model/subaccounts.js";

export const checkUserLimit = async (req, res, next) => {
  const { subaccountId } = req.params;

  try {
    const userLimit = await subaccountUserLimit(subaccountId);

    if (userLimit === 0) {
      return res.status(404).json({
        status: false,
        error: "Failed to fetch limit or no limit found",
      });
    }

    const userCount = await subaccountUserCount(subaccountId);

    if (userCount >= userLimit) {
      return res.status(403).json({
        status: false,
        message:
          "User limit reached. Please contact support for more information.",
      });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const checkDeviceLimit = async (req, res, next) => {
  const { subaccountId } = req.params;

  try {
    const deviceLimit = await subaccountDeviceLimit(subaccountId);

    if (deviceLimit === 0) {
      return res.status(404).json({
        status: false,
        error: "Failed to fetch limit or no limit found",
      });
    }

    const deviceCount = await subaccountDeviceCount(subaccountId);

    if (deviceCount >= deviceLimit) {
      return res.status(403).json({
        status: false,
        message:
          "Device limit reached. Please contact support for more information.",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};
