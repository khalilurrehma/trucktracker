import axios from "axios";
import {
  getAllCalculators,
  getCalculatorById,
  modifyCalculator,
  removeCalculator,
  saveCalculator,
  superAdminCustomCalc,
  superAdminDefaultCalc,
  superAdminNotificationCalc,
} from "../model/calculator.js";
import {
  subaccountByTraccarId,
  userAssignedCustomCalcs,
} from "../model/subaccounts.js";
import {
  allSuperAdminCalculators,
  flespiRealmUserById,
} from "../services/flespiApis.js";
import { getDeviceByFlespiId } from "../model/devices.js";
import { newNotificationTypeCalc } from "../model/notifications.js";

export const addCalculators = async (req, res) => {
  const { formData, mode } = req.body;

  try {
    const calcResponse = await axios.post(
      `https://flespi.io/gw/calcs`,
      [{ ...formData, metadata: mode }],
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (!calcResponse.data.result) {
      return res.status(400).json({
        status: false,
        message: "Failed to add calculator",
      });
    }

    const { id, cid, version, ...restFields } = calcResponse.data.result[0];

    const combinedBody = {
      ...restFields,
      metadata: mode,
    };

    const dbBody = {
      calc_id: id,
      name: restFields.name,
      calcs_body: combinedBody,
      calc_type: mode,
    };

    await saveCalculator(dbBody);

    if (mode.id === 2) {
      let dbBody = {
        name: restFields.name,
        mqtt_topic: `flespi/interval/gw/calcs/${id}/devices/+/activated,deactivated`,
        is_subscribed: 0,
        calc_id: id,
      };

      await newNotificationTypeCalc(dbBody);
    }

    res.status(200).json({
      status: true,
      message: "Calculator added successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error,
    });
  }
};

export const allCalculators = async (req, res) => {
  try {
    const calcs = await allSuperAdminCalculators();
    const dbCalcs = await getAllCalculators();

    const CalcIds = new Set(calcs.map((calc) => calc.id));

    const matchedDbCalcs = dbCalcs.filter((calc) => CalcIds.has(calc.calc_id));

    res.status(200).json({
      status: true,
      message: matchedDbCalcs,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error,
    });
  }
};

export const calculatorById = async (req, res) => {
  const { id } = req.params;

  try {
    const dbCalcs = await getAllCalculators();

    const calc = dbCalcs?.find((calc) => calc.id == id);

    if (!calc) {
      return res.status(404).json({
        status: false,
        message: "Calculator not found",
      });
    }

    const formattedResponse = {
      ...calc,
      calcs_body: JSON.parse(calc?.calcs_body),
    };

    res.status(200).json({
      status: true,
      message: formattedResponse,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error,
    });
  }
};

export const calculatorsByType = async (req, res) => {
  const { t } = req.query;

  if (!["default", "custom", "notification"].includes(t)) {
    return res.status(400).json({
      status: false,
      message: "Invalid calculator type",
    });
  }
  const calcType = t === "default" ? 0 : t === "custom" ? 1 : 2;

  try {
    let calcs;

    switch (calcType) {
      case 0:
        calcs = await superAdminDefaultCalc();
        break;
      case 1:
        calcs = await superAdminCustomCalc();
        break;
      case 2:
        calcs = await superAdminNotificationCalc();
        break;
      default:
        return res.status(400).json({
          status: false,
          message: "Invalid calculator type",
        });
    }

    if (!calcs) {
      return res.status(404).json({
        status: false,
        message: "No calculators found",
      });
    }

    res.status(200).json({
      status: true,
      message: calcs,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error,
    });
  }
};

export const calculatorByTraccarId = async (req, res) => {
  const { traccarId } = req.params;

  try {
    const subaccount = await subaccountByTraccarId(traccarId);

    let subaccount_cid = subaccount?.flespiId;
    let validAccCalcs = JSON.parse(subaccount?.calcs_id);

    const subaccountCalcs = await axios.get(
      `https://flespi.io/gw/calcs/${validAccCalcs}?fields=id%2Cname`,
      {
        headers: {
          "x-flespi-cid": subaccount_cid,
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    res.status(200).json({
      status: true,
      message: subaccountCalcs.data.result,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error,
    });
  }
};

export const allcustomCalcs = async (req, res) => {
  try {
    const dbCustomCalc = await superAdminCustomCalc();

    if (!dbCustomCalc) {
      return res.status(404).json({
        status: false,
        message: "Custom calculations not found",
      });
    }

    const dbCalc = dbCustomCalc.map((calc) => ({
      id: calc.calc_id,
      name: calc.name,
    }));

    let checkOnFlespi = await Promise.all(
      dbCalc.map(async (calc) => {
        try {
          const flespiCalc = await axios.get(
            `https://flespi.io/gw/calcs/${calc.id}?fields=id%2Cname`,
            {
              headers: {
                Authorization: `FlespiToken ${process.env.FlespiToken}`,
              },
            }
          );

          return flespiCalc.data.result[0];
        } catch (err) {
          return null;
        }
      })
    );

    res.json({
      status: true,
      message: checkOnFlespi,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

export const companyDefaultCalcs = async (req, res) => {
  const { traccarId } = req.params;

  try {
    const subaccount = await subaccountByTraccarId(traccarId);

    if (!subaccount) {
      return res.status(404).json({
        status: false,
        message: "Subaccount not found",
      });
    }

    let subaccount_cid = subaccount?.flespiId;
    let validAccCalcs = JSON.parse(subaccount?.calcs_id);

    const subaccountCalcs = await axios.get(
      `https://flespi.io/gw/calcs/${validAccCalcs}?fields=id%2Cname`,
      {
        headers: {
          "x-flespi-cid": subaccount_cid,
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    res.status(200).json({
      status: true,
      message: subaccountCalcs.data.result,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error,
    });
  }
};

export const companyCustomCalcs = async (req, res) => {
  const { traccarId } = req.params;

  try {
    const subaccount = await subaccountByTraccarId(traccarId);

    if (!subaccount) {
      return res.status(404).json({
        status: false,
        message: "Subaccount not found",
      });
    }

    let subaccount_cid = subaccount?.flespiId;

    if (!subaccount_cid) {
      return res.status(400).json({
        status: false,
        message: "Subaccount not found",
      });
    }

    let validAccCalcs = JSON.parse(subaccount?.custom_calcs) || [];

    if (validAccCalcs.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No calculators assigned to this subaccount",
      });
    }

    const allCalcs = await axios.get(
      `https://flespi.io/gw/calcs/all?fields=id,name,metadata`,
      {
        headers: {
          "x-flespi-cid": subaccount_cid,
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    const validCalcs = allCalcs?.data.result.filter(
      (calc) =>
        calc.metadata?.superAdminCalcId &&
        validAccCalcs.includes(calc.metadata.superAdminCalcId)
    );

    res.status(200).json({
      status: true,
      message: validCalcs,
    });
  } catch (error) {
    console.error("Error fetching default calcs:", error);
    res.status(500).json({
      status: false,
      message: "An internal error occurred",
      error: error?.message || error,
    });
  }
};

export const assignedCustomCalcs = async (req, res) => {
  const { traccarId } = req.params;

  try {
    const subaccountCalcs = await userAssignedCustomCalcs(traccarId);

    if (!subaccountCalcs) {
      return res.status(404).json({
        status: false,
        message: "No linked calculator permissions found",
      });
    }

    let validCalcs = JSON.parse(subaccountCalcs);

    const linkedCalcs = await axios.get(
      `https://flespi.io/gw/calcs/${validCalcs}?fields=id%2Cname`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    res.status(200).json({
      status: true,
      message: linkedCalcs.data.result,
    });
  } catch (error) {}
};

export const customCalcDevices = async (req, res) => {
  const { deviceId, traccarId } = req.params;

  try {
    const subaccount = await subaccountByTraccarId(traccarId);

    if (!subaccount) {
      return res.status(404).json({
        status: false,
        message: "Subaccount not found",
      });
    }

    let subaccount_cid = subaccount?.flespiId;

    if (!subaccount_cid) {
      return res.status(400).json({
        status: false,
        message: "Subaccount not found",
      });
    }

    const allCalcsResponse = await axios.get(
      "https://flespi.io/gw/calcs/all?fields=id,name,metadata",
      {
        headers: {
          "x-flespi-cid": subaccount_cid,
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (
      allCalcsResponse.data.errors &&
      allCalcsResponse.data.errors.length > 0
    ) {
      console.error("API Error:", allCalcsResponse.data.errors[0].reason);
      return res.status(400).json({
        status: false,
        message: `Failed to fetch calculators: ${allCalcsResponse.data.errors[0].reason}`,
      });
    }

    const allCalcs = allCalcsResponse.data.result || [];
    const assignedCalcs = [];

    for (const calc of allCalcs) {
      try {
        const response = await axios.get(
          `https://flespi.io/gw/calcs/${calc.id}/devices/${deviceId}`,
          {
            headers: {
              Authorization: `FlespiToken ${process.env.FlespiToken}`,
            },
          }
        );

        if (response.data.result && response.data.result.length > 0) {
          assignedCalcs.push(calc);
        }
      } catch (error) {
        console.log(`Error checking calculator ${calc.id}: ${error.message}`);
      }
    }

    res.status(200).json({
      status: true,
      message: assignedCalcs,
    });
  } catch (error) {
    console.error("Error fetching linked calculators:", error);
    res.status(500).json({
      status: false,
      message: "An internal error occurred",
      error: error?.message || error,
    });
  }
};

export const spAdminCustomCalcsDevices = async (req, res) => {
  const { deviceId } = req.params;

  try {
    const allCalcsResponse = await axios.get(
      "https://flespi.io/gw/calcs/all?fields=id,name,metadata",
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (
      allCalcsResponse.data.errors &&
      allCalcsResponse.data.errors.length > 0
    ) {
      console.error("API Error:", allCalcsResponse.data.errors[0].reason);
      return res.status(400).json({
        status: false,
        message: `Failed to fetch calculators: ${allCalcsResponse.data.errors[0].reason}`,
      });
    }

    const allCalcs = allCalcsResponse.data.result || [];
    const assignedCalcs = [];

    for (const calc of allCalcs) {
      try {
        const response = await axios.get(
          `https://flespi.io/gw/calcs/${calc.id}/devices/${deviceId}`,
          {
            headers: {
              Authorization: `FlespiToken ${process.env.FlespiToken}`,
            },
          }
        );

        if (response.data.result && response.data.result.length > 0) {
          assignedCalcs.push(calc);
        }
      } catch (error) {
        console.log(`Error checking calculator ${calc.id}: ${error.message}`);
      }
    }

    return res.status(200).json({
      status: true,
      message: assignedCalcs,
      // data: assignedCalcs,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error?.response?.data || error.message || "Unknown error",
    });
  }
};

export const linkedCalculators = async (req, res) => {
  const { realmId, realmuserId, traccarId } = req.params;

  try {
    const currentConfig = await flespiRealmUserById(realmId, realmuserId);
    if (!currentConfig) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    let linkedCalcsIds =
      currentConfig?.token_params?.access?.acl?.find(
        (entry) => entry.uri === "gw/calcs"
      )?.ids || [];

    if (!linkedCalcsIds) {
      return res.status(404).json({
        status: false,
        message: "No linked calculator permissions found",
      });
    }

    // now compare ids with subaccount calcs ids and return linked ones with id and name

    const subaccount = await subaccountByTraccarId(traccarId);
    let subaccount_cid = subaccount?.flespiId;

    if (linkedCalcsIds.length > 0) {
      const linkedCalcs = await axios.get(
        `https://flespi.io/gw/calcs/${linkedCalcsIds}?fields=id%2Cname`,
        {
          headers: {
            "x-flespi-cid": subaccount_cid,
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        }
      );

      res.status(200).json({
        status: true,
        message: linkedCalcs.data.result,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error,
    });
  }
};

export const updateCalculator = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const calculator = await getCalculatorById(id);

    if (!calculator) {
      return res.status(404).json({
        status: false,
        message: "Calculator not found",
      });
    }

    const flespiResponse = await axios.put(
      `https://flespi.io/gw/calcs/${calculator.calc_id}?fields=name%2Cupdate_delay%2Cmessages_source%2Cversion%2Cintervals_ttl%2Cintervals_rotate%2Cselectors%2Ccounters%2Cvalidate_interval%2Cvalidate_message%2Ctimezone%2Cdevices_count%2Cintervals_size%2Cupdate_period%2Cupdate_onchange`,
      JSON.stringify(body),
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (flespiResponse.data.errors && flespiResponse.data.errors.length > 0) {
      console.error("API Error:", flespiResponse.data.errors);
      return res.status(400).json({
        status: false,
        message: `Failed to update calculator: ${flespiResponse.data.errors[0].reason}`,
      });
    }

    const { version, ...data } = flespiResponse.data.result[0];

    const updateBody = {
      id,
      name: data.name,
      calcs_body: data,
    };

    await modifyCalculator(updateBody);

    res.status(200).json({
      status: true,
      message: "Calculator updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error,
    });
  }
};

export const deleteCalculator = async (req, res) => {
  const { id } = req.params;

  try {
    const calculator = await getCalculatorById(id);

    if (!calculator) {
      return res.status(404).json({
        status: false,
        message: "Calculator not found",
      });
    }

    const FlespiResponse = await axios.delete(
      `https://flespi.io/gw/calcs/${calculator.calc_id}`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (!FlespiResponse.data.result) {
      return res.status(400).json({
        status: false,
        message: "Failed to delete calculator",
      });
    }

    await removeCalculator(calculator.id);

    res.status(200).json({
      status: true,
      message: "Calculator deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error,
    });
  }
};
