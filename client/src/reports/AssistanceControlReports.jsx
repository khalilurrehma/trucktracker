import React, { useState } from "react";
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
} from "@mui/material";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import { useTranslation } from "../common/components/LocalizationProvider";

// Mock Data
const mockData = [
  {
    device: "Device A",
    driver: "Walter",
    shiftBegin: "2025-04-30 09:00",
    shiftEnd: "2025-04-30 17:00",
    graceTime: 10,
    igBeforeShiftBegin: "2025-04-30 08:55",
    stationArrivalTime: "2025-04-30 08:57",
    igBeforeShiftEnd: "2025-04-30 16:50",
    igOffAfterShiftEnd: "2025-04-30 17:10",
    shiftBeginStatus: "On Time",
    shiftEndStatus: "Late",
  },
  {
    device: "Device B",
    driver: "Ronaldo",
    shiftBegin: "2025-04-30 08:00",
    shiftEnd: "2025-04-30 16:00",
    graceTime: 5,
    igBeforeShiftBegin: "2025-04-30 07:50",
    stationArrivalTime: "2025-04-30 07:55",
    igBeforeShiftEnd: "2025-04-30 15:45",
    igOffAfterShiftEnd: "2025-04-30 16:05",
    shiftBeginStatus: "Early",
    shiftEndStatus: "On Time",
  },
];

// Main Page
const AssistanceControlReports = () => {
  const t = useTranslation();
  const [filters, setFilters] = useState({
    device: "",
    driver: "",
    shiftEndStatus: "",
  });

  const filteredData = mockData.filter((row) => {
    return (
      row.device.toLowerCase().includes(filters.device.toLowerCase()) &&
      row.driver.toLowerCase().includes(filters.driver.toLowerCase()) &&
      (filters.shiftEndStatus
        ? row.shiftEndStatus === filters.shiftEndStatus
        : true)
    );
  });

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
          <TextField
            select
            label={t("shiftEndStatus")}
            value={filters.shiftEndStatus}
            size="small"
            onChange={(e) =>
              setFilters({ ...filters, shiftEndStatus: e.target.value })
            }
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="On Time">On Time</MenuItem>
            <MenuItem value="Late">Late</MenuItem>
          </TextField>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
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
              {filteredData.map((row, index) => (
                <TableRow key={index}>
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
      </Box>
    </PageLayout>
  );
};

export default AssistanceControlReports;
