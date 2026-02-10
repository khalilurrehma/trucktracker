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
  getCalcIdsUpdatedToday,
  getLatestCalcReportsByCalcIds,
  getReportById,
  getReports,
  modifyReport,
  removeReport,
  reportsByCreatedBy,
} from "../model/reports.js";
import { subaccountByTraccarId } from "../model/subaccounts.js";
import {
  getAssignedCalculatorsByOperationId,
  getCalculatorTypesByCalcIds,
} from "../model/calculatorAssignments.js";

const hasPersistableRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some(
    (row) =>
      row != null &&
      (typeof row !== "object" || Object.keys(row).length > 0)
  );
};

const normalizeCalcIds = (input) => {
  const values = Array.isArray(input) ? input : [input];
  const ids = values
    .map((item) => {
      if (item == null) return null;
      if (typeof item === "number" || typeof item === "string") {
        const parsed = Number(item);
        return Number.isFinite(parsed) ? parsed : null;
      }
      if (typeof item === "object") {
        const parsed = Number(item.calc_id ?? item.calcId ?? item.id);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    })
    .filter((id) => id != null);

  return Array.from(new Set(ids));
};

const parseCalcIdsField = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) return normalizeCalcIds(value);
  if (typeof value === "number") return normalizeCalcIds([value]);
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    return normalizeCalcIds(JSON.parse(trimmed));
  } catch {
    return normalizeCalcIds(trimmed.split(",").map((v) => v.trim()));
  }
};

const extractReportCalcIds = (report) => {
  if (!report || typeof report !== "object") return [];

  let calcIds = parseCalcIdsField(report.calcs_ids);

  if (calcIds.length === 0 && report.calcs != null) {
    let calcs = report.calcs;
    if (typeof calcs === "string") {
      try {
        calcs = JSON.parse(calcs);
      } catch {
        calcs = [];
      }
    }

    if (Array.isArray(calcs)) {
      calcIds = normalizeCalcIds(
        calcs.flatMap((item) => [
          item?.calc_id,
          item?.calcId,
          item?.id,
          ...(Array.isArray(item?.calcs_ids) ? item.calcs_ids : []),
        ])
      );
    } else if (calcs && typeof calcs === "object") {
      calcIds = normalizeCalcIds([
        calcs.calc_id,
        calcs.calcId,
        calcs.id,
        ...(Array.isArray(calcs.calcs_ids) ? calcs.calcs_ids : []),
      ]);
    }
  }

  return calcIds;
};

const normalizeCalcType = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const extractReportCalcTypes = (report) => {
  if (!report || typeof report !== "object") return [];

  const types = new Set();
  const pushType = (value) => {
    const normalized = normalizeCalcType(value);
    if (normalized) types.add(normalized);
  };

  let calcs = report.calcs;
  if (typeof calcs === "string") {
    try {
      calcs = JSON.parse(calcs);
    } catch {
      calcs = [];
    }
  }

  const readEntry = (item) => {
    if (!item || typeof item !== "object") return;
    pushType(item.calc_type);
    pushType(item.calcType);
    pushType(item.name);
  };

  if (Array.isArray(calcs)) {
    calcs.forEach(readEntry);
  } else if (calcs && typeof calcs === "object") {
    readEntry(calcs);
  }

  return Array.from(types);
};

const parseReportRows = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const resolveFlespiDeviceIds = async (deviceIds = []) => {
  const flespiDevices = await Promise.all(
    (Array.isArray(deviceIds) ? deviceIds : []).map(async (deviceId) => {
      const device = await getDeviceById(deviceId);
      return device ? Number(device.flespiId) : null;
    })
  );
  return flespiDevices.filter((id) => Number.isFinite(id));
};

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

    if (hasPersistableRows(report.flespiReport)) {
      await createCalcReport(report);
    }

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

const fetchIntervalsByCalc = async ({
  requestedCalcId,
  validFlespiIds,
  superAdmin,
  traccarId,
}) => {
  const authHeaders = {
    Authorization: `FlespiToken ${process.env.FlespiToken}`,
  };

  if (!Array.isArray(validFlespiIds) || validFlespiIds.length === 0) {
    return [];
  }

  const requestedIdNum = Number(requestedCalcId);
  if (!Number.isFinite(requestedIdNum)) {
    return [];
  }

  let resolvedCalcId = requestedIdNum;
  let headersForCalc = { ...authHeaders };

  if (!superAdmin) {
    const subaccount = await subaccountByTraccarId(traccarId);
    const cid = subaccount?.flespiId;
    if (cid) {
      try {
        const calcResponse = await axios.get(
          `https://flespi.io/gw/calcs/metadata.superAdminCalcId=${requestedIdNum}?fields=id%2Cname`,
          {
            headers: {
              ...authHeaders,
              "x-flespi-cid": cid,
            },
          }
        );
        const mapped = calcResponse?.data?.result?.[0]?.id;
        if (mapped) {
          resolvedCalcId = Number(mapped);
          headersForCalc = { ...authHeaders, "x-flespi-cid": cid };
        }
      } catch {
        // Fallback to direct calc id.
      }
    }
  }

  let intervalUrl = "all";
  if (requestedIdNum === 1742524) {
    intervalUrl =
      "all?fields=id,device_id,device.name,begin,end,duration,timestamp,max.speed,distance,distance_can,avg.speed,route";
  } else if (requestedIdNum === 1742527) {
    intervalUrl =
      "all?fields=id,device_id,device.name,begin,end,duration,timestamp,route";
  }

  try {
    const reportResponse = await axios.get(
      `https://flespi.io/gw/calcs/${resolvedCalcId}/devices/${validFlespiIds.join(",")}/intervals/${intervalUrl}`,
      { headers: headersForCalc }
    );
    return (reportResponse?.data?.result || []).map((row) => ({
      ...row,
      calcId: requestedIdNum,
    }));
  } catch {
    // Retry without cid restrictions if current path is scoped.
    if (headersForCalc["x-flespi-cid"]) {
      const fallbackResponse = await axios.get(
        `https://flespi.io/gw/calcs/${requestedIdNum}/devices/${validFlespiIds.join(",")}/intervals/${intervalUrl}`,
        { headers: authHeaders }
      );
      return (fallbackResponse?.data?.result || []).map((row) => ({
        ...row,
        calcId: requestedIdNum,
      }));
    }
    throw new Error(`Failed to fetch calc ${requestedIdNum}`);
  }
};

const syncAndReadCalcRows = async ({
  calcIds,
  traccarId,
  deviceIds,
  superAdmin,
  page,
  forceSync = false,
  syncPolicy = "on_page0",
}) => {
  const normalizedCalcIds = normalizeCalcIds(calcIds);
  const traccarIdNum = Number(traccarId);
  if (normalizedCalcIds.length === 0 || !Number.isFinite(traccarIdNum)) {
    return { rows: [], calcTotals: {} };
  }

  const validFlespiIds = await resolveFlespiDeviceIds(deviceIds);
  let calcIdsToSync = [];

  if (forceSync) {
    calcIdsToSync = normalizedCalcIds;
  } else if (syncPolicy === "daily") {
    const updatedToday = await getCalcIdsUpdatedToday({
      calcIds: normalizedCalcIds,
      traccarId: traccarIdNum,
    });
    const updatedSet = new Set(updatedToday);
    calcIdsToSync = normalizedCalcIds.filter((id) => !updatedSet.has(id));
  } else if (Number(page) === 0) {
    calcIdsToSync = normalizedCalcIds;
  }

  if (calcIdsToSync.length > 0 && validFlespiIds.length > 0) {
    for (const calcId of calcIdsToSync) {
      try {
        const rows = await fetchIntervalsByCalc({
          requestedCalcId: calcId,
          validFlespiIds,
          superAdmin,
          traccarId: traccarIdNum,
        });

        if (hasPersistableRows(rows)) {
          await createCalcReport({
            calcId,
            traccarId: traccarIdNum,
            flespiReport: rows,
            createdBy: traccarIdNum,
          });
        }
      } catch (saveError) {
        console.error(
          `Failed to sync calculator report for calc ${calcId}:`,
          saveError.message
        );
      }
    }
  }

  const savedRows = await getLatestCalcReportsByCalcIds({
    calcIds: normalizedCalcIds,
    traccarId: traccarIdNum,
  });

  const allowedDevices = new Set(
    Array.from(new Set(validFlespiIds.map((id) => Number(id))))
  );
  const mergedRows = [];
  const calcTotals = {};

  for (const row of savedRows) {
    const calcId = Number(row.calc_id);
    const parsedRows = parseReportRows(row.flespi_report).map((item) => ({
      ...item,
      calcId,
    }));
    const filteredRows =
      allowedDevices.size > 0
        ? parsedRows.filter((item) => {
            const deviceId = Number(item["device.id"] ?? item.device_id);
            return Number.isFinite(deviceId) && allowedDevices.has(deviceId);
          })
        : parsedRows;

    calcTotals[calcId] = filteredRows.length;
    mergedRows.push(...filteredRows);
  }

  return { rows: mergedRows, calcTotals };
};

export const generateCalcReportPaged = async (req, res) => {
  const { calcId, traccarId } = req.params;
  const { deviceIds, superAdmin, page = 0, pageSize = 25 } = req.body;

  if (!calcId || !traccarId) {
    return res.status(400).json({
      status: false,
      error: "Missing required parameters",
    });
  }

  try {
    const requestedCalcIds = normalizeCalcIds(
      String(calcId)
        .split(",")
        .map((id) => id.trim())
    );
    if (requestedCalcIds.length === 0) {
      return res.status(400).json({
        status: false,
        error: "Invalid calcId parameter",
      });
    }

    const { rows, calcTotals } = await syncAndReadCalcRows({
      calcIds: requestedCalcIds,
      traccarId,
      deviceIds,
      superAdmin,
      page,
    });
    const start = Math.max(0, Number(page) * Number(pageSize));
    const end = start + Number(pageSize);
    const pagedRows = rows.slice(start, end);

    res.status(200).json({
      status: true,
      message: pagedRows,
      total: rows.length,
      calcTotals,
      calcIds: requestedCalcIds,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};

export const generateReportCalcReportPaged = async (req, res) => {
  const { reportId, traccarId } = req.params;
  const {
    deviceIds,
    superAdmin,
    page = 0,
    pageSize = 25,
    calcIds,
    operationId,
    forceSync = false,
    allData = false,
  } = req.body;

  if (!reportId || !traccarId) {
    return res.status(400).json({
      status: false,
      error: "Missing required parameters",
    });
  }

  try {
    const report = await getReportById(reportId);
    if (!report) {
      return res.status(404).json({
        status: false,
        error: "Report not found",
      });
    }

    const reportCalcIds = extractReportCalcIds(report);
    const reportCalcTypes = new Set(extractReportCalcTypes(report));
    const requestedCalcIds = normalizeCalcIds(calcIds);
    const hasExplicitCalcIds = requestedCalcIds.length > 0;
    const requestedSet = new Set(requestedCalcIds);
    let effectiveCalcIds =
      requestedCalcIds.length > 0
        ? reportCalcIds.filter((id) => requestedSet.has(id))
        : reportCalcIds;

    const operationIdNum = Number(operationId);
    if (Number.isFinite(operationIdNum) && operationIdNum > 0) {
      const assignedRows = await getAssignedCalculatorsByOperationId(
        operationIdNum
      );
      const assignedById = new Set(
        assignedRows
          .map((row) => Number(row.calc_id))
          .filter((id) => Number.isFinite(id))
      );

      if (hasExplicitCalcIds) {
        // Strict mode: keep only report calculators requested by client and assigned to operation.
        effectiveCalcIds = effectiveCalcIds.filter((id) => assignedById.has(id));
      } else {
        // Fallback mode: map by calculator type when exact ids are unknown.
        const reportTypesFromAssignments = await getCalculatorTypesByCalcIds(
          effectiveCalcIds
        );
        for (const row of reportTypesFromAssignments) {
          const normalizedType = normalizeCalcType(row.calc_type);
          if (normalizedType) reportCalcTypes.add(normalizedType);
        }

        let mappedOperationCalcIds = [];
        if (reportCalcTypes.size > 0) {
          mappedOperationCalcIds = assignedRows
            .filter((row) => reportCalcTypes.has(normalizeCalcType(row.calc_type)))
            .map((row) => Number(row.calc_id))
            .filter((id) => Number.isFinite(id));
        }

        if (mappedOperationCalcIds.length === 0) {
          mappedOperationCalcIds = effectiveCalcIds.filter((id) =>
            assignedById.has(id)
          );
        }

        if (mappedOperationCalcIds.length > 0) {
          effectiveCalcIds = Array.from(new Set(mappedOperationCalcIds));
        } else {
          effectiveCalcIds = [];
        }
      }
    }

    if (effectiveCalcIds.length === 0) {
      return res.status(200).json({
        status: true,
        message: [],
        total: 0,
        calcTotals: {},
        calcIds: reportCalcIds,
        report: { id: Number(reportId), name: report.name || null },
      });
    }

    const { rows, calcTotals } = await syncAndReadCalcRows({
      calcIds: effectiveCalcIds,
      traccarId,
      deviceIds,
      superAdmin,
      page,
      forceSync: Boolean(forceSync),
      syncPolicy: "daily",
    });

    const start = Math.max(0, Number(page) * Number(pageSize));
    const end = start + Number(pageSize);
    const pagedRows = allData ? rows : rows.slice(start, end);

    res.status(200).json({
      status: true,
      message: pagedRows,
      total: rows.length,
      calcTotals,
      calcIds: effectiveCalcIds,
      report: {
        id: Number(reportId),
        name: report.name || null,
      },
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
