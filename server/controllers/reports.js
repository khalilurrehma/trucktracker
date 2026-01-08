import axios from "axios";
import {
  getAllDevices,
  getDeviceById,
  getDeviceByTraccarId,
  getDevicesByUserId,
} from "../model/devices.js";
import {
  createCalcReport,
  createReport,
  fetchCronLogs,
  getReportById,
  getReports,
  modifyReport,
  removeReport,
  reportsByCreatedBy,
} from "../model/reports.js";
import { subaccountByTraccarId } from "../model/subaccounts.js";

export const getAllReports = async (req, res) => {
  try {
    const reports = await getReports();

    res.status(200).json({
      status: true,
      data: reports,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const getReport = async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = await getReportById(reportId);

    res.status(200).json({
      status: true,
      data: report,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const generateCalcReport = async (req, res) => {
  const { calcId, traccarId } = req.params;
  const { deviceIds, superAdmin } = req.body;

  let FlespiReport;
  let calcResponse;

  if (!calcId || !traccarId) {
    return res.status(400).json({
      status: false,
      error: "Missing required parameters",
    });
  }

  try {
    const flespiDevices = await Promise.all(
      deviceIds?.map(async (deviceId) => {
        const device = await getDeviceById(deviceId);
        return device ? device.flespiId : null;
      })
    );

    const validFlespiIds = flespiDevices.filter((id) => id !== null);

    if (superAdmin) {
      let intervalUrl;
      calcResponse = await axios.get(
        `https://flespi.io/gw/calcs/${calcId}?fields=id%2Cname`,
        {
          headers: {
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        }
      );

      let foundCalcId = calcResponse.data.result[0].id;

      if (!foundCalcId) {
        return res.status(404).json({
          status: false,
          error: "Calc not found",
        });
      }

      if (foundCalcId == 1742524) {
        intervalUrl =
          "all?fields=id,device_id,device.name,begin,end,duration,timestamp,max.speed,distance,distance_can,avg.speed,route";
      } else if (foundCalcId == 1742527) {
        intervalUrl =
          "all?fields=id,device_id,device.name,begin,end,duration,timestamp,route";
      } else {
        intervalUrl = "all";
      }

      FlespiReport = await axios.get(
        `https://flespi.io/gw/calcs/${foundCalcId}/devices/${validFlespiIds}/intervals/${intervalUrl}`,
        {
          headers: {
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        }
      );
    } else {
      const subaccount = await subaccountByTraccarId(traccarId);

      let cid = subaccount?.flespiId;

      let intervalUrl;
      calcResponse = await axios.get(
        `https://flespi.io/gw/calcs/metadata.superAdminCalcId=${calcId}?fields=id%2Cname`,
        {
          headers: {
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
            "x-flespi-cid": cid,
          },
        }
      );

      if (!calcResponse.data.result[0]) {
        return res.status(404).json({
          status: false,
          error: "No calculator found",
        });
      }

      const calcId2 = calcResponse.data.result[0].id;

      if (calcId == 1742524) {
        intervalUrl =
          "all?fields=id,device_id,device.name,begin,end,duration,timestamp,max.speed,distance,distance_can,avg.speed,route";
      } else if (calcId == 1742527) {
        intervalUrl =
          "all?fields=id,device_id,device.name,begin,end,duration,timestamp,route";
      } else {
        intervalUrl = "all";
      }

      FlespiReport = await axios.get(
        `https://flespi.io/gw/calcs/${calcId2}/devices/${validFlespiIds}/intervals/${intervalUrl}`,
        {
          headers: {
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        }
      );
    }

    if (!FlespiReport) {
      return res.status(404).json({
        status: false,
        error: "No report found",
      });
    }

    const report = {
      calcId,
      traccarId,
      flespiReport: FlespiReport.data.result,
      createdBy: traccarId,
    };

    await createCalcReport(report);

    res.status(200).json({
      status: true,
      message: FlespiReport.data.result,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};

export const generateCalcReportPaged = async (req, res) => {
  const { calcId, traccarId } = req.params;
  const { deviceIds, superAdmin, page = 0, pageSize = 25 } = req.body;

  let FlespiReport;
  let calcResponse;

  if (!calcId || !traccarId) {
    return res.status(400).json({
      status: false,
      error: "Missing required parameters",
    });
  }

  try {
    const flespiDevices = await Promise.all(
      deviceIds?.map(async (deviceId) => {
        const device = await getDeviceById(deviceId);
        return device ? device.flespiId : null;
      })
    );

    const validFlespiIds = flespiDevices.filter((id) => id !== null);

    if (superAdmin) {
      let intervalUrl;
      calcResponse = await axios.get(
        `https://flespi.io/gw/calcs/${calcId}?fields=id%2Cname`,
        {
          headers: {
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        }
      );

      const foundCalcId = calcResponse.data.result[0]?.id;

      if (!foundCalcId) {
        return res.status(404).json({
          status: false,
          error: "Calc not found",
        });
      }

      if (foundCalcId == 1742524) {
        intervalUrl =
          "all?fields=id,device_id,device.name,begin,end,duration,timestamp,max.speed,distance,distance_can,avg.speed,route";
      } else if (foundCalcId == 1742527) {
        intervalUrl =
          "all?fields=id,device_id,device.name,begin,end,duration,timestamp,route";
      } else {
        intervalUrl = "all";
      }

      FlespiReport = await axios.get(
        `https://flespi.io/gw/calcs/${foundCalcId}/devices/${validFlespiIds}/intervals/${intervalUrl}`,
        {
          headers: {
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        }
      );
    } else {
      const subaccount = await subaccountByTraccarId(traccarId);

      const cid = subaccount?.flespiId;

      let intervalUrl;
      calcResponse = await axios.get(
        `https://flespi.io/gw/calcs/metadata.superAdminCalcId=${calcId}?fields=id%2Cname`,
        {
          headers: {
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
            "x-flespi-cid": cid,
          },
        }
      );

      if (!calcResponse.data.result[0]) {
        return res.status(404).json({
          status: false,
          error: "No calculator found",
        });
      }

      const calcId2 = calcResponse.data.result[0].id;

      if (calcId == 1742524) {
        intervalUrl =
          "all?fields=id,device_id,device.name,begin,end,duration,timestamp,max.speed,distance,distance_can,avg.speed,route";
      } else if (calcId == 1742527) {
        intervalUrl =
          "all?fields=id,device_id,device.name,begin,end,duration,timestamp,route";
      } else {
        intervalUrl = "all";
      }

      FlespiReport = await axios.get(
        `https://flespi.io/gw/calcs/${calcId2}/devices/${validFlespiIds}/intervals/${intervalUrl}`,
        {
          headers: {
            Authorization: `FlespiToken ${process.env.FlespiToken}`,
          },
        }
      );
    }

    if (!FlespiReport) {
      return res.status(404).json({
        status: false,
        error: "No report found",
      });
    }

    const rows = FlespiReport.data.result || [];
    const start = Math.max(0, Number(page) * Number(pageSize));
    const end = start + Number(pageSize);
    const pagedRows = rows.slice(start, end);

    res.status(200).json({
      status: true,
      message: pagedRows,
      total: rows.length,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};

export const customCalcReport = async (req, res) => {
  // const { calcId } = req.params;

  try {
    const exampleDevId = 5354530;

    // const beginTimestamp =
    //   timeBegin instanceof Date
    //     ? Math.floor(timeBegin.getTime() / 1000)
    //     : timeBegin;
    // const endTimestamp =
    //   timeEnd instanceof Date ? Math.floor(timeEnd.getTime() / 1000) : timeEnd;

    const response = await axios.get(
      `https://flespi.io/gw/calcs/${1674670}/devices/${exampleDevId}/intervals/all`,
      {
        headers: {
          Authorization: `FlespiToken DO3Z45affw3w5gOo04nP66scC73W5yIwbzl3tl7wGYQB4uOSn1xjVNllJc8EzE1A`,
        },
      }
    );

    res.status(200).json({
      status: true,
      message: response.data,
    });
  } catch (error) {
    console.error(
      "Error assigning device to calculator:",
      error.response?.data || error.message
    );
    res.status(500).json({
      status: false,
      message: error.response?.data || error.message,
    });
  }
};

export const getReportByCreatedBy = async (req, res) => {
  try {
    const createdBy = req.params.createdBy;
    const reports = await reportsByCreatedBy(createdBy);

    res.status(200).json({
      status: true,
      data: reports,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const addReport = async (req, res) => {
  const body = req.body;

  try {
    const report = await createReport(body);
    res.status(201).json({ message: "Report created", id: report.insertId });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).json({
        status: false,
        error: "Unknow Category ID",
      });
    } else {
      console.error(error);
      res.status(500).json({
        status: false,
        error: "Internal Server Error",
      });
    }
  }
};

export const updateReport = async (req, res) => {
  try {
    const reportId = req.params.id;
    const data = req.body;

    await modifyReport(reportId, data);

    res.status(200).json({
      status: true,
      message: "Report updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const reportId = req.params.id;

    await removeReport(reportId);

    res.status(200).json({
      status: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const getCronReports = async (req, res) => {
  try {
    const cronReports = await fetchCronLogs();

    res.status(200).json({
      status: true,
      message: cronReports,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};

export const getUserCronReports = async (req, res) => {
  const { userId } = req.params;

  try {
    const userDevices = await getDevicesByUserId(userId);
    const deviceIds = userDevices.map((device) => device.flespiId);

    const cronReports = await fetchCronLogs();

    const filteredReports = cronReports?.filter((report) =>
      deviceIds.includes(parseInt(report.device_id))
    );

    res.status(200).json({
      status: true,
      message: filteredReports,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      error: "Internal Server Error",
    });
  }
};
