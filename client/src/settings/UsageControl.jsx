import React, { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  CircularProgress,
} from "@mui/material";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import axios from "axios";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CachedIcon from "@mui/icons-material/Cached";
import { TailSpin } from "react-loader-spinner";
import { useSelector } from "react-redux";
import {
  fetchCommandExecution,
  fetchUsersUsageReport,
  modifyCommandResponse,
  removeUsageReportById,
} from "../apis/api";
import SettingLoader from "./common/SettingLoader";
import { toast, ToastContainer } from "react-toastify";
import TableShimmer from "../common/components/TableShimmer";

const UsageControl = () => {
  const [rows, setRows] = useState(25);
  const [sortColumn, setSortColumn] = useState("userId");
  const [sortType, setSortType] = useState("asc");
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updateLoad, setUpdateLoad] = useState(false);
  const user = useSelector((state) => state.session.user);
  const userId = user?.id;

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetchUsersUsageReport(userId);

      const alterResponse = response.map((item) => {
        const parsedDeviceInfo = JSON.parse(item.device_type_info);
        const parsedDeviceIds = JSON.parse(item.device_id || "[]");

        return {
          id: item.config_id,
          userId: userId,
          deviceIds: Array.isArray(parsedDeviceIds) ? parsedDeviceIds : [],
          model: parsedDeviceInfo.name,
          command: item.action_command,
          action: item.action_name,
          deviceId: item.device_id,
        };
      });

      setData(alterResponse);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const filteredData = data.filter((item) => {
    return (
      item.id.toString().includes(search) ||
      item.userId.toString().includes(search) ||
      item.model.toLowerCase().includes(search.toLowerCase()) ||
      item.command.toLowerCase().includes(search.toLowerCase()) ||
      item.action.toLowerCase().includes(search.toLowerCase()) ||
      item.deviceId.toString().includes(search)
    );
  });

  const sortedData = filteredData.sort((a, b) => {
    if (sortType === "asc") {
      return a[sortColumn] < b[sortColumn] ? -1 : 1;
    } else {
      return a[sortColumn] > b[sortColumn] ? -1 : 1;
    }
  });

  const displayedData = sortedData.slice(0, rows);

  const handleClick = async (deviceId, commandId) => {
    const deviceIdForm = JSON.parse(deviceId);

    try {
      const response = await fetchCommandExecution(deviceIdForm[1], commandId);
      console.log(response);

      if (response.message) {
        const res = response.message;
        setUpdateLoad(true);
        const modifiedResponse = await modifyCommandResponse(
          deviceIdForm[1],
          commandId,
          res
        );
        if (modifiedResponse.status === true) {
          setUpdateLoad(false);

          fetchData();
        }
      }
    } catch (error) {
      console.error("Error clicking command:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await removeUsageReportById(id);

      toast.success(res.message);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "usageControlReport"]}
    >
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          gap: "16px",
          padding: "10px",
          marginTop: "15px",
        }}
      >
        <ToastContainer />
        <FormControl sx={{ width: "15%" }} size="small">
          <InputLabel>Rows</InputLabel>
          <Select value={rows} onChange={(e) => setRows(e.target.value)}>
            {[25, 50, 100, 200].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ width: "25%" }} size="small">
          <InputLabel>Sort Column</InputLabel>
          <Select
            value={sortColumn}
            onChange={(e) => setSortColumn(e.target.value)}
          >
            {["userId", "model", "command", "action", "deviceId"].map(
              (column) => (
                <MenuItem key={column} value={column}>
                  {column}
                </MenuItem>
              )
            )}
          </Select>
        </FormControl>

        <FormControl sx={{ width: "25%" }} size="small">
          <InputLabel>Sort Type</InputLabel>
          <Select
            value={sortType}
            onChange={(e) => setSortType(e.target.value)}
          >
            <MenuItem value="asc">Ascending</MenuItem>
            <MenuItem value="desc">Descending</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
        />
      </div>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Model</TableCell>
              <TableCell>Command</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableShimmer columns={7} />
            ) : displayedData.length > 0 ? (
              displayedData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.model}</TableCell>
                  <TableCell>{item.command}</TableCell>
                  <TableCell>{item.action}</TableCell>
                  <TableCell>
                    {item.deviceIds.length > 1
                      ? `${item.deviceIds[0]}, ${
                          item.deviceIds.length - 1
                        }+ more`
                      : item.deviceIds[0]}
                  </TableCell>
                  <TableCell sx={{ display: "flex", gap: "8px" }}>
                    <DeleteIcon
                      sx={{ cursor: "pointer" }}
                      onClick={() => handleDelete(item.id)}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <CollectionFab editPath="/settings/new-control" />
    </PageLayout>
  );
};

export default UsageControl;
