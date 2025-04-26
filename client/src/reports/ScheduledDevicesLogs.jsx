import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  TextField,
  MenuItem,
  Pagination,
} from "@mui/material";
import dayjs from "dayjs";
import { useAppContext } from "../AppContext";
import { useTranslation } from "../common/components/LocalizationProvider";

const ScheduledDevicesLogs = () => {
  const { updateCronLogs } = useAppContext();
  const t = useTranslation();
  const [initialData, setInitialData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCronType, setSelectedCronType] = useState("");
  const [selectedDeviceName, setSelectedDeviceName] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const adminId = useSelector((state) => state.session.user.id);

  const url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  useEffect(() => {
    fetchFromApi();
  }, []);

  const fetchFromApi = async () => {
    try {
      const { data } =
        adminId === 1
          ? await axios.get(`${url}/cron/reports`)
          : await axios.get(`${url}/cron/reports/user/${adminId}`);
      if (data.status) {
        const sortedData = data.message.sort(
          (a, b) => new Date(b.executed_at) - new Date(a.executed_at)
        );
        setInitialData(sortedData);
        setFilteredData(sortedData);
      }
    } catch (error) {
      console.error("Error fetching logs:", error.message);
    }
  };

  useEffect(() => {
    if (updateCronLogs.length > 0) {
      fetchFromApi();
    }
  }, [updateCronLogs]);

  useEffect(() => {
    filterData();
    setPage(1); // Reset page when filters change
  }, [search, selectedCronType, selectedDeviceName, initialData]);

  const filterData = () => {
    let data = [...initialData];

    if (selectedCronType) {
      data = data.filter((item) => item.cron_type === selectedCronType);
    }

    if (selectedDeviceName) {
      data = data.filter((item) => item.device_name === selectedDeviceName);
    }

    if (search.trim()) {
      data = data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    setFilteredData(data);
  };

  // Pagination
  const paginatedData = filteredData.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Unique dropdown options
  const cronTypes = [...new Set(initialData.map((item) => item.cron_type))];
  const deviceNames = [...new Set(initialData.map((item) => item.device_name))];

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs2={["reportTitle", "Scheduled Devices Logs"]}
    >
      <Box p={2}>
        <Box display="flex" gap={2} mb={2}>
          <TextField
            select
            label={t("reportCronType")}
            value={selectedCronType}
            onChange={(e) => setSelectedCronType(e.target.value)}
            size="small"
            fullWidth
          >
            <MenuItem value="">All</MenuItem>
            {cronTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={t("reportDeviceName")}
            value={selectedDeviceName}
            onChange={(e) => setSelectedDeviceName(e.target.value)}
            size="small"
            fullWidth
          >
            <MenuItem value="">All</MenuItem>
            {deviceNames.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("reportCronType")}</TableCell>
                <TableCell>{t("reportDeviceID")}</TableCell>
                <TableCell>{t("reportDeviceName")}</TableCell>
                <TableCell>{t("reportsExecutedAt")}</TableCell>
                <TableCell>{t("reportsCronNotes")}</TableCell>
                <TableCell>{t("deviceStatus")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length ? (
                paginatedData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.cron_type}</TableCell>
                    <TableCell>{row.device_id}</TableCell>
                    <TableCell>{row.device_name}</TableCell>
                    <TableCell>
                      {dayjs(row.executed_at).format("YYYY-MM-DD HH:mm")}
                    </TableCell>
                    <TableCell>{row.notes}</TableCell>
                    <TableCell
                      style={{
                        color: row.status === "success" ? "green" : "red",
                        fontWeight: 500,
                      }}
                    >
                      {row.status}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination
            count={Math.ceil(filteredData.length / rowsPerPage)}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            size="small"
          />
        </Box>
      </Box>
    </PageLayout>
  );
};

export default ScheduledDevicesLogs;
