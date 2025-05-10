import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Box,
  Typography,
  Button,
  TablePagination,
} from "@mui/material";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import { useTranslation } from "../common/components/LocalizationProvider";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  convertISODate,
  formatDateTime,
  graceTimeConverter,
} from "../settings/common/New.Helper";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

// Main Page
const AssistanceControlReports = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const t = useTranslation();
  const userId = useSelector((state) => state.session.user.id);

  const [filters, setFilters] = useState({
    device: "",
    driver: "",
    shiftEndStatus: "",
  });

  const [reports, setReports] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchFromApi();
  }, [userId]);

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    return dayjs(isoString).format("YYYY-MM-DD");
  };

  const fetchFromApi = async () => {
    try {
      const { data } =
        userId === 1
          ? await axios.get(`${url}/attendance/report`)
          : await axios.get(`${url}/attendance/report?userId=${userId}`);

      const transformed = data?.message?.map((item) => {
        const deviceObj = JSON.parse(item.device);

        return {
          date: formatDateTime(item.date),
          device: deviceObj?.name || "-",
          driver: item.driver || "-",
          shiftBegin: item.shift_begin || "N/A",
          shiftEnd: item.shift_end || "N/A",
          graceTime: graceTimeConverter(item.grace_time),
          igBeforeShiftBegin:
            item.ignition_before_shift_begin || "available soon",
          stationArrivalTime: item.station_arrival_time || "available soon",
          igBeforeShiftEnd: item.ignition_before_shift_end || "available soon",
          igOffAfterShiftEnd:
            item.ignition_off_after_shift_end || "available soon",
          shiftBeginStatus: item.shift_begin_status || "-",
          shiftEndStatus: item.shift_end_status || "-",
        };
      });

      setReports(transformed);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const filteredData = reports.filter((row) => {
    return (
      row.device.toLowerCase().includes(filters.device.toLowerCase()) &&
      row.driver.toLowerCase().includes(filters.driver.toLowerCase()) &&
      (filters.shiftEndStatus
        ? row.shiftEndStatus === filters.shiftEndStatus
        : true)
    );
  });

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      "report.xlsx"
    );
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs2={["reportTitle", "reportCombined"]}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            label={t("sharedDevice")}
            variant="outlined"
            size="small"
            value={filters.device}
            onChange={(e) => setFilters({ ...filters, device: e.target.value })}
          />
          <TextField
            label={t("sharedDriver")}
            variant="outlined"
            size="small"
            value={filters.driver}
            onChange={(e) => setFilters({ ...filters, driver: e.target.value })}
          />

          <Button
            variant="outlined"
            onClick={handleExportExcel}
            sx={{ width: "20%" }}
          >
            {t("sharedDownloadExcel")}
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("dates")}</TableCell>
                <TableCell>{t("sharedDevice")}</TableCell>
                <TableCell>{t("sharedDriver")}</TableCell>
                <TableCell>{t("sharedShiftStart")}</TableCell>
                <TableCell>{t("sharedShiftEnd")}</TableCell>
                <TableCell>{t("graceTime")}</TableCell>
                <TableCell>{t("ignitionBeforeShiftBegin")}</TableCell>
                <TableCell>{t("stationArrivalTime")}</TableCell>
                <TableCell>{t("ignitionBeforeShiftEnd")}</TableCell>
                <TableCell>{t("ignitionOffAfterShiftEnd")}</TableCell>
                <TableCell>{t("shiftBeginStatus")}</TableCell>
                <TableCell>{t("shiftEndStatus")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ width: "110px" }}>{row.date}</TableCell>
                    <TableCell>{row.device}</TableCell>
                    <TableCell>{row.driver}</TableCell>
                    <TableCell>{row.shiftBegin}</TableCell>
                    <TableCell>{row.shiftEnd}</TableCell>
                    <TableCell>{row.graceTime}</TableCell>
                    <TableCell>{row.igBeforeShiftBegin}</TableCell>
                    <TableCell>{row.stationArrivalTime}</TableCell>
                    <TableCell>{row.igBeforeShiftEnd}</TableCell>
                    <TableCell>{row.igOffAfterShiftEnd}</TableCell>
                    <TableCell>{row.shiftBeginStatus}</TableCell>
                    <TableCell>{row.shiftEndStatus}</TableCell>
                  </TableRow>
                ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>
    </PageLayout>
  );
};

export default AssistanceControlReports;
