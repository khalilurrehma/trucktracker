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
  Paper,
  Typography,
  Box,
} from "@mui/material";
import dayjs from "dayjs";
import { useAppContext } from "../AppContext";

const ScheduledDevicesLogs = () => {
  const { updateCronLogs } = useAppContext();
  const [initialData, setInitialData] = useState([]);
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

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs2={["reportTitle", "Scheduled Devices Logs"]}
    >
      <Box p={2}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cron Type</TableCell>
                <TableCell>Device ID</TableCell>
                <TableCell>Device Name</TableCell>
                <TableCell>Executed At</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {initialData.map((row) => (
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </PageLayout>
  );
};

export default ScheduledDevicesLogs;
