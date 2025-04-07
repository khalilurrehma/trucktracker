import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { toast, ToastContainer } from "react-toastify";
import {
  fetchControlUsageLogs,
  fetchControlUsageLogsByUserId,
} from "../apis/api";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import SettingLoader from "./common/SettingLoader";
import ReportsMenu from "../reports/components/ReportsMenu";
import { useSelector } from "react-redux";
import { useAppContext } from "../AppContext";

const UsageControlLogs = () => {
  const { traccarUser } = useAppContext();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [commandFilter, setCommandFilter] = useState("");
  const userId = useSelector((state) => state.session.user?.id);

  useEffect(() => {
    fetchAllLogs();
  }, []);

  const fetchAllLogs = async () => {
    try {
      const log = traccarUser?.superAdmin
        ? await fetchControlUsageLogs()
        : await fetchControlUsageLogsByUserId(userId);
      if (log && log.length) {
        setLogs(log);
        setFilteredLogs(log);
      } else {
        toast.warn("No logs available.");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleFilterChange = () => {
    const filtered = logs.filter((log) => {
      return (
        (deviceFilter ? log.device_name.includes(deviceFilter) : true) &&
        (userFilter ? log.performed_by.includes(userFilter) : true) &&
        (commandFilter ? log.action_command.includes(commandFilter) : true)
      );
    });
    setFilteredLogs(filtered);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const paginatedData = filteredLogs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs={["reportTitle", "usageControlReport"]}
    >
      <ToastContainer />

      <Box
        sx={{
          display: "flex",
          justifyContent: "start",
          gap: "12px",
          alignItems: "center",
          margin: "20px 10px",
        }}
      >
        <FormControl variant="outlined" sx={{ minWidth: 150 }}>
          <InputLabel>Device</InputLabel>
          <Select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            label="Device"
          >
            <MenuItem value="">All Devices</MenuItem>
            {logs
              .map((log) => log.device_name)
              .filter((value, index, self) => self.indexOf(value) === index)
              .map((device, index) => (
                <MenuItem key={index} value={device}>
                  {device}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControl variant="outlined" sx={{ minWidth: 250 }}>
          <InputLabel>User</InputLabel>
          <Select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            label="User"
          >
            <MenuItem value="">All Users</MenuItem>
            {logs
              .map((log) => log.performed_by)
              .filter((value, index, self) => self.indexOf(value) === index)
              .map((user, index) => (
                <MenuItem key={index} value={user}>
                  {user}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <TextField
          label="Command"
          variant="outlined"
          value={commandFilter}
          onChange={(e) => setCommandFilter(e.target.value)}
          placeholder="Filter by command"
          onKeyUp={handleFilterChange}
        />
      </Box>

      {/* MUI Table */}
      <div className="logs-table">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date Time</TableCell>
                <TableCell>Device Name</TableCell>
                <TableCell>Driver</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Auth Location</TableCell>
                <TableCell>Command</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length ? (
                paginatedData.map((log) => (
                  <TableRow key={log.log_id}>
                    <TableCell>
                      {new Date(log.log_timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.device_name}</TableCell>
                    <TableCell>{log.driver_name}</TableCell>
                    <TableCell>View Location</TableCell>
                    <TableCell>{log.location}</TableCell>
                    <TableCell>
                      {log.action_command === "900,1,1"
                        ? "Activate Usage"
                        : "Block Usage"}
                    </TableCell>
                    <TableCell>{log.performed_by}</TableCell>
                    <TableCell>{log.action_reason}</TableCell>
                  </TableRow>
                ))
              ) : (
                <SettingLoader />
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={paginatedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </div>
    </PageLayout>
  );
};

export default UsageControlLogs;
