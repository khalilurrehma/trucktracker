import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  AppBar,
  Toolbar,
  InputBase,
  Badge,
  Select,
  MenuItem,
  Box,
  IconButton,
  Typography,
  Chip,
  Grid,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import { getAllNewCases } from "../apis/api";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[100],
  border: `1px solid ${theme.palette.grey[300]}`,
  marginRight: theme.spacing(2),
  width: "100%",
  maxWidth: 300,
}));
const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));
const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  paddingLeft: theme.spacing(5),
}));

const ViewNewCases = () => {
  const [allCases, setAllCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchCases() {
      const { data } = await getAllNewCases();

      if (data.status) setAllCases(data.data);
    }
    fetchCases();
  }, []);

  const filteredCases = allCases.filter((item) => {
    const devices = item.assigned_devices.map((device) => device.device_name);

    const searchMatch = searchTerm
      ? item.case_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.case_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        devices.some((name) =>
          name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : true;
    return searchMatch;
  });

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "reportNewCase"]}
    >
      <Box
        sx={{ p: 2 }}
        display="flex"
        justifyContent="space-between"
        flexDirection="row"
      >
        <TextField
          sx={{ width: "30%" }}
          label="Search by Case"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <IconButton>
          <Badge badgeContent={filteredCases.length} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Box>
      <Box sx={{ p: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <b>Case</b>
                </TableCell>
                <TableCell>
                  <b>Address</b>
                </TableCell>
                <TableCell>
                  <b>Status</b>
                </TableCell>
                <TableCell>
                  <b>Service Type</b>
                </TableCell>
                <TableCell>
                  <b>Driver</b>
                </TableCell>
                <TableCell>
                  <b>License Plate</b>
                </TableCell>
                <TableCell>
                  <b>ETA</b>
                </TableCell>
                <TableCell>
                  <b>Distance</b>
                </TableCell>
                <TableCell>
                  <b>District</b>
                </TableCell>
                <TableCell>
                  <b>Initial Base</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCases.map((row) => {
                const devices = JSON.parse(row.device_meta || "[]");

                return devices.map((device, idx) => {
                  return (
                    <TableRow key={`${row.id}-${device.id}-${idx}`}>
                      <TableCell>{row.case_name}</TableCell>
                      <TableCell>{row.case_address}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>
                        {device.services?.map((service, index) => (
                          <Chip
                            key={index}
                            label={service.serviceName || service.name || "N/A"}
                            sx={{ mr: 1, mb: 1 }}
                          />
                        )) || "N/A"}
                      </TableCell>
                      <TableCell>{device.drivername || "N/A"}</TableCell>
                      <TableCell>{device.name || "N/A"}</TableCell>
                      <TableCell>
                        {device.eta ? `${device.eta} min` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {device.distance ? `${device.distance} km` : "N/A"}
                      </TableCell>
                      <TableCell>{device.district || "N/A"}</TableCell>
                      <TableCell>{device.initialBase || "N/A"}</TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </PageLayout>
  );
};

export default ViewNewCases;
