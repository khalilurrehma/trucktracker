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
  Menu,
  TablePagination,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import NotificationsIcon from "@mui/icons-material/Notifications";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { getAllNewCases } from "../apis/api";
import CaseReportDialog from "./components/CaseReportDialog";
import axios from "axios";
import { useSelector } from "react-redux";
import TableShimmer from "../common/components/TableShimmer";
import { useSuperVisor } from "../common/util/permissions";

const ViewNewCases = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const [allCases, setAllCases] = useState([]);
  const [loader, setLoader] = useState(false);
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [caseDetails, setCaseDetails] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([
    { id: 1, message: "New case assigned", read: false },
    { id: 2, message: "ETA updated", read: false },
  ]);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [page, setPage] = useState(0);

  const userId = useSelector((state) => state.session.user.id);
  const superVisor = useSuperVisor();

  const [anchorEl, setAnchorEl] = useState(null);

  const getStatusChip = (status) => {
    switch (status) {
      case "pending":
        return (
          <Chip
            label="Pending"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case "in progress":
        return (
          <Chip
            label="In Progress"
            sx={{
              backgroundColor: "#fff4cc",
              color: "#ef6c00",
              fontWeight: 500,
            }}
          />
        );
      case "completed":
        return (
          <Chip
            label="Case Completed"
            sx={{
              backgroundColor: "#d0f2d0",
              color: "#2e7d32",
              fontWeight: 500,
            }}
          />
        );
      default:
        return (
          <Chip
            label="Unknown"
            sx={{ backgroundColor: "#e0e0e0", color: "#999", fontWeight: 500 }}
          />
        );
    }
  };

  useEffect(() => {
    async function fetchCases() {
      setLoader(true);
      try {
        const { data } =
          userId === 1
            ? await getAllNewCases()
            : await getAllNewCases(userId, superVisor);

        if (data.status) setAllCases(data.data), setLoader(false);
      } catch (error) {
        console.error("Error fetching cases:", error);
      }
    }

    async function getNotifications() {
      try {
        const { data } =
          userId === 1
            ? await axios.get(`${url}/dispatch/notifications/all`)
            : await axios.get(`${url}/dispatch/notifications/${180}`);

        if (data.status && Array.isArray(data.message)) {
          setNotifications(data.message);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    }
    fetchCases();
    getNotifications();
  }, []);

  const filteredCases = allCases.filter((item) => {
    const devices = item.assigned_devices.map((device) => device.device_name);

    const searchMatch = searchTerm
      ? item.case_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.case_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        devices.some((name) =>
          name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : true;
    return searchMatch;
  });

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
        <IconButton onClick={handleNotificationClick}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{ style: { width: 300 } }}
        >
          {notifications.length === 0 ? (
            <MenuItem disabled>No notifications</MenuItem>
          ) : (
            notifications.map((note) => (
              <MenuItem
                key={note.id}
                sx={{ bgcolor: note.read ? "white" : "#f0f4ff" }}
                onClick={async () => {
                  setCaseDetails({ id: note.report_id });
                  setOpenAssignModal(true);

                  await axios.patch(
                    `${url}/dispatch/update/report/notification/${note.id}`
                  );

                  setNotifications((prev) =>
                    prev.map((n) =>
                      n.id === note.id ? { ...n, read: true } : n
                    )
                  );
                }}
              >
                {note.message}
              </MenuItem>
            ))
          )}
        </Menu>
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
                <TableCell>
                  <b>Report</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    No cases found
                  </TableCell>
                </TableRow>
              ) : !loader ? (
                filteredCases
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => {
                    const devices = JSON.parse(row.device_meta || "[]");

                    return devices.map((device, idx) => {
                      return (
                        <TableRow key={`${row.id}-${device.id}-${idx}`}>
                          <TableCell>{row.case_name}</TableCell>
                          <TableCell>{row.case_address}</TableCell>
                          <TableCell>{getStatusChip(row.status)}</TableCell>
                          <TableCell>
                            {device.services?.map((service, index) => (
                              <Chip
                                key={index}
                                label={
                                  service.serviceName || service.name || "N/A"
                                }
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
                          <TableCell>
                            <IconButton
                              onClick={() => {
                                setOpenAssignModal(true);
                                setCaseDetails({
                                  id: row.id,
                                  name: row.case_name,
                                });
                              }}
                              disabled={row.status === "pending"}
                            >
                              <FullscreenIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })
              ) : (
                <TableShimmer columns={11} />
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[15, 25, 35]}
          component="div"
          count={filteredCases.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />

        <CaseReportDialog
          openAssignModal={openAssignModal}
          setOpenAssignModal={setOpenAssignModal}
          caseDetails={caseDetails}
        />
      </Box>
    </PageLayout>
  );
};

export default ViewNewCases;
