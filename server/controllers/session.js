import axios from "axios";
import { realmUserByTraccarId } from "../model/realm.js";
import { subaccountByTraccarId } from "../model/subaccounts.js";

export const realmUserCalcs = async (req, res) => {
  const { traccarId } = req.params;
  let calcsId = [];

  try {
    const user = await realmUserByTraccarId(traccarId);
    if (!user || user.length === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const { flespi_user_id, realm_id } = user[0];

    const flespiResponse = await axios.get(
      `https://flespi.io/platform/realms/${realm_id}/users/${flespi_user_id}`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (!flespiResponse.data || !flespiResponse.data.result) {
      return res.status(500).json({
        status: false,
        message: "Invalid response from Flespi user API",
      });
    }

    const result = flespiResponse.data.result;

    if (result.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No user data found in Flespi",
      });
    }

    const calcsAcl = result[0]?.token_params?.access?.acl?.find(
      (acl) => acl.uri === "gw/calcs"
    );

    calcsId = Array.isArray(calcsAcl?.ids) ? calcsAcl.ids : [];

    if (calcsId.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No linked calculator permissions found",
      });
    }

    const superAdminCalc = await axios.get(
      `https://flespi.io/gw/calcs/all?fields=id%2Cmetadata`,
      {
        headers: {
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    if (!superAdminCalc.data || !superAdminCalc.data.result) {
      return res.status(500).json({
        status: false,
        message: "Invalid response from Flespi calculations API",
      });
    }

    const calcs = superAdminCalc.data.result;

    if (!Array.isArray(calcs) || calcs.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No calculators found in Flespi",
      });
    }

    const filteredCalcs = calcs.filter((calc) => calcsId.includes(calc.id));

    if (filteredCalcs.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No matching calculators found for the user",
      });
    }

    const formattedResponse = filteredCalcs.map((calc) => ({
      id: calc.id,
      actualId: calc.metadata?.superAdminCalcId || null,
    }));

    res.status(200).json({
      status: true,
      data: formattedResponse,
    });
  } catch (error) {
    console.error("Error fetching realm user calcs:", error.message);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const companyValidCustomCalc = async (req, res) => {
  const { traccarId } = req.params;

  try {
    const subaccount = await subaccountByTraccarId(traccarId);
    if (!subaccount) {
      return res.status(404).json({
        status: false,
        message: "Subaccount not found",
      });
    }

    let subaccount_cid = subaccount.flespiId;

    const calcMetadataResp = await axios.get(
      `https://flespi.io/gw/calcs/all?fields=metadata.superAdminCalcId`,
      {
        headers: {
          "x-flespi-cid": subaccount_cid,
          Authorization: `FlespiToken ${process.env.FlespiToken}`,
        },
      }
    );

    return res.status(200).json({
      status: true,
      message: calcMetadataResp.data.result,
    });
  } catch (error) {
    console.error("Error fetching company valid custom calc:", error.message);

    if (error.response && error.response.data && error.response.data.errors) {
      const flespiErrors = error.response.data.errors;
      return res.status(error.response.status || 500).json({
        status: false,
        message: "Flespi API error",
        errors: flespiErrors,
      });
    }

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
