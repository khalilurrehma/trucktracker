import React, { useEffect, useRef, useState } from "react";
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
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { keyframes } from "@mui/system";
import { styled } from "@mui/material/styles";
import NotificationsIcon from "@mui/icons-material/Notifications";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import RuleIcon from "@mui/icons-material/Rule";
import { getAllNewCases } from "../apis/api";
import ReassignCaseModal from "./components/ReassignCaseModal";
import CaseReportDialog from "./components/CaseReportDialog";
import axios from "axios";
import { useSelector } from "react-redux";
import TableShimmer from "../common/components/TableShimmer";
import { useSuperVisor } from "../common/util/permissions";
import { useAppContext } from "../AppContext";
import SuggestedServicesModal from "../operations/components/SuggestedServicesModal";
import { useTheme } from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";

const blinkAnimation = keyframes`
  0% { background-color: #fff3cd; }
  50% { background-color: #ffeeba; }
  100% { background-color: transparent; }
`;

const ViewNewCases = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [searchInput, setSearchInput] = useState("");
  const debounceTimeout = useRef(null);
  const { subprocessEvents, liveSuggestedServices } = useAppContext();
  const [allCases, setAllCases] = useState([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loader, setLoader] = useState(false);
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [caseDetails, setCaseDetails] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState([
    { id: 1, message: "New case assigned", read: false },
    { id: 2, message: "ETA updated", read: false },
  ]);
  const [highlightedId, setHighlightedId] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [page, setPage] = useState(0);

  const userId = useSelector((state) => state.session.user.id);
  const superVisor = useSuperVisor();

  const [anchorElNotif, setAnchorElNotif] = useState(null);
  const [anchorElCols, setAnchorElCols] = useState(null);
  const [suggestedServices, setSuggestedServices] = useState({});
  const [openServicesModal, setOpenServicesModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [rejectedServiceIds, setRejectedServiceIds] = useState([]);
  const [openReassignModal, setOpenReassignModal] = useState(false);
  const [reassignCaseDetails, setReassignCaseDetails] = useState(null);

  const allColumns = [
    { id: "plate_no", label: "Insurance Plate Number" },
    { id: "saleforce", label: "Saleforce" },
    { id: "case", label: "Case" },
    { id: "placa", label: "Placa Asegurado" },
    { id: "address", label: "Address" },
    { id: "status", label: "Status" },
    { id: "process", label: "Current Process" },
    { id: "service", label: "Service Type" },
    { id: "subServices", label: "Sub Services" },
    { id: "driver", label: "Driver" },
    { id: "eta", label: "ETA" },
    { id: "distance", label: "Distance" },
    { id: "district", label: "District" },
    { id: "initialBase", label: "Initial Base" },
    { id: "created_at", label: "Creation Time" },
    { id: "actions", label: "Actions" },
  ];
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem("visibleColumns");
    return saved ? JSON.parse(saved) : allColumns.map((c) => c.id); // all visible by default
  });

  useEffect(() => {
    localStorage.setItem("visibleColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  useEffect(() => {
    if (subprocessEvents.length > 0) {
      const latestEvent = subprocessEvents[subprocessEvents.length - 1];
      if (latestEvent.subprocessEvent === "subprocessEvent-update") {
        setAllCases((prevCases) =>
          prevCases.map((caseItem) =>
            caseItem.id === Number(latestEvent.id)
              ? {
                  ...caseItem,
                  current_subprocess: latestEvent.current_subprocess,
                  status: latestEvent.status || caseItem.status,
                }
              : caseItem
          )
        );

        setHighlightedId(Number(latestEvent.id));

        setTimeout(() => {
          setHighlightedId(null);
        }, 1000);
      }
    }
  }, [subprocessEvents]);

  useEffect(() => {
    if (liveSuggestedServices.length > 0) {
      const latest = liveSuggestedServices[liveSuggestedServices.length - 1];
      const { caseId } = latest;

      setHighlightedId(Number(caseId));

      fetchSuggestedServices(caseId).then((newSuggestions) => {
        setSuggestedServices((prev) => ({
          ...prev,
          [caseId]: newSuggestions,
        }));
      });

      setTimeout(() => {
        setHighlightedId(null);
      }, 1000);
    }
  }, [liveSuggestedServices]);

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
      case "rejected":
        return (
          <Chip
            label="Rejected"
            sx={{
              backgroundColor: "#fdecea",
              color: "#d32f2f",
              fontWeight: 500,
              border: "1px solid #f5c6cb",
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
      case "waiting_approval":
        return (
          <Chip
            label="Waiting for Approval"
            sx={{
              backgroundColor: "#e3f2fd",
              color: "#1565c0",
              fontWeight: 500,
            }}
          />
        );
      case "approved":
        return (
          <Chip
            label="Approved"
            sx={{
              backgroundColor: "#e0f7fa",
              color: "#00838f",
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

  const getProcessChip = (status) => {
    switch (status) {
      case "advisor_assignment":
        return (
          <Chip
            label="Assignment of the Advisor"
            sx={{
              backgroundColor: "#ffdddd",
              color: "#c62828",
              fontWeight: 500,
            }}
          />
        );
      case "reception_case":
        return (
          <Chip
            label="Reception Case"
            sx={{
              backgroundColor: "#fff8e1",
              color: "#f9a825",
              fontWeight: 500,
            }}
          />
        );
      case "on_the_way":
        return (
          <Chip
            label="On the Way"
            sx={{
              backgroundColor: "#bbdefb",
              color: "#0d47a1",
              fontWeight: 500,
            }}
          />
        );
      case "in_reference":
        return (
          <Chip
            label="In Reference"
            sx={{
              backgroundColor: "#e0f7fa",
              color: "#00838f",
              fontWeight: 500,
            }}
          />
        );
      case "authorization_request":
        return (
          <Chip
            label="Authorization Request"
            sx={{
              backgroundColor: "#c8e6c9",
              color: "#388e3c",
              fontWeight: 500,
            }}
          />
        );
      case "supervisor_approval":
        return (
          <Chip
            label="Approved by the Supervisor"
            sx={{
              backgroundColor: "#a5d6a7",
              color: "#1b5e20",
              fontWeight: 500,
            }}
          />
        );
      case "case_completed":
        return (
          <Chip
            label="Case Finished"
            sx={{
              backgroundColor: "#a5d6a7",
              color: "#1b5e20",
              fontWeight: 500,
            }}
          />
        );
      default:
        return (
          <Chip
            label="Yet to start"
            sx={{ backgroundColor: "#e0e0e0", color: "#999", fontWeight: 500 }}
          />
        );
    }
  };

  useEffect(() => {
    async function fetchCases() {
      setLoader(true);
      try {
        const { data } = await getAllNewCases(
          userId,
          superVisor,
          page,
          rowsPerPage,
          searchTerm
        );

        if (data.status) {
          let formattedAllCases = data.data.map((c) => {
            const metaDataStr = c.meta_data;
            let isRimacCase = false;

            if (metaDataStr) {
              try {
                const meta = JSON.parse(metaDataStr);
                isRimacCase = meta.rimacCase === true;
              } catch (err) {
                console.warn("Failed to parse meta_data:", metaDataStr);
              }
            }

            return {
              ...c,
              rimacCase: isRimacCase,
            };
          });

          setAllCases(data.data);
          setTotalCases(data.pagination?.total || 0);

          const servicesPromises = data.data.map((caseItem) =>
            fetchSuggestedServices(caseItem.id)
          );
          const servicesResults = await Promise.all(servicesPromises);
          const servicesMap = {};
          data.data.forEach((caseItem, index) => {
            servicesMap[caseItem.id] = servicesResults[index] || [];
          });
          setSuggestedServices(servicesMap);
        }
      } catch (error) {
        console.error("Error fetching cases:", error);
      } finally {
        setLoader(false);
      }
    }

    async function getNotifications() {
      try {
        const { data } =
          userId === 1
            ? await axios.get(`${url}/dispatch/notifications/all`)
            : await axios.get(
                `${url}/dispatch/notifications/${userId}?superVisor=${superVisor}`
              );

        if (data.status && Array.isArray(data.message)) {
          setNotifications(data.message);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    }
    fetchCases();
    getNotifications();
  }, [userId, superVisor, page, rowsPerPage, searchTerm]);

  const fetchSuggestedServices = async (caseId) => {
    try {
      const { data } = await axios.get(
        `${url}/dispatch/case/${caseId}/suggestedservices/approvals?status=pending&userId=${userId}`
      );
      if (data.success) {
        return data.message;
      }
      return [];
    } catch (error) {
      console.error(
        `Error fetching suggested services for case ${caseId}:`,
        error
      );
      return [];
    }
  };

  const handleNotificationClick = (event) => {
    setAnchorElNotif(event.currentTarget);
  };
  const handleNotificationClose = () => {
    setAnchorElNotif(null);
  };

  const handleColumnMenuClick = (event) => {
    setAnchorElCols(event.currentTarget);
  };
  const handleColumnMenuClose = () => {
    setAnchorElCols(null);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      setSearchTerm(value);
    }, 400);
  };

  const handleRemoveSuggestedService = (caseId, serviceId) => {
    setSuggestedServices((prev) => {
      const updated = (prev[caseId] || []).filter((s) => s.id !== serviceId);
      return { ...prev, [caseId]: updated };
    });
  };

  const handleApprove = (serviceId) => {
    if (selectedCase?.id) {
      handleRemoveSuggestedService(selectedCase.id, serviceId);
    }
  };

  const handleReject = (serviceId) => {
    if (selectedCase?.id) {
      handleRemoveSuggestedService(selectedCase.id, serviceId);
    }
    // optionally track rejected ids:
    // setRejectedServiceIds((prev) => [...prev, serviceId]);
  };

  const differentiateValues = (valueStr) => {
    // Ensure it's a string
    const val = String(valueStr).trim();

    if (/^\d+$/.test(val)) {
      return { type: "saleforce", value: val };
    } else {
      return { type: "echong_case", value: val };
    }
  };

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
          value={searchInput}
          onChange={handleSearchChange}
        />

        <Box sx={{ display: "flex", gap: 1 }}>
          {/* Notifications Button */}
          <IconButton onClick={handleNotificationClick}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Column visibility button */}
          <IconButton onClick={handleColumnMenuClick}>
            <ViewColumnIcon />
          </IconButton>
        </Box>

        {/* Notification Menu */}
        <Menu
          anchorEl={anchorElNotif}
          open={Boolean(anchorElNotif)}
          onClose={handleNotificationClose}
          PaperProps={{ style: { width: 300 } }}
        >
          {notifications.length === 0 ? (
            <MenuItem disabled>No notifications</MenuItem>
          ) : (
            notifications.map((note) => (
              <MenuItem
                key={note.id}
                sx={{
                  bgcolor: note.read
                    ? theme.palette.background.paper
                    : theme.palette.action.hover,
                  "&:hover": { bgcolor: theme.palette.action.selected },
                }}
                onClick={async () => {
                  setCaseDetails({ id: note?.case_id });
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

        {/* Column toggle Menu */}
        <Menu
          anchorEl={anchorElCols}
          open={Boolean(anchorElCols)}
          onClose={handleColumnMenuClose}
        >
          {allColumns.map((col) => (
            <MenuItem key={col.id}>
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setVisibleColumns([...visibleColumns, col.id]);
                  } else {
                    setVisibleColumns(
                      visibleColumns.filter((c) => c !== col.id)
                    );
                  }
                }}
              />
              <Typography sx={{ ml: 1 }}>{col.label}</Typography>
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <Box sx={{ p: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {allColumns
                  .filter((col) => visibleColumns.includes(col.id))
                  .map((col) => (
                    <TableCell key={col.id}>{col.label}</TableCell>
                  ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {allCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} align="center">
                    No cases found
                  </TableCell>
                </TableRow>
              ) : !loader ? (
                allCases.map((row) => {
                  const devices = JSON.parse(row.device_meta || "[]");
                  let case_name = differentiateValues(row.case_name);

                  return devices.map((device, idx) => (
                    <TableRow
                      key={`${row.id}-${device.id}-${idx}`}
                      sx={{
                        animation:
                          row.id === highlightedId
                            ? `${blinkAnimation} 1s ease-in-out`
                            : undefined,
                      }}
                    >
                      {visibleColumns.includes("placa") && (
                        <TableCell>{device.name || "N/A"}</TableCell>
                      )}
                      {visibleColumns.includes("saleforce") && (
                        <TableCell>
                          {case_name.type === "saleforce"
                            ? case_name.value
                            : "-"}
                        </TableCell>
                      )}
                      {visibleColumns.includes("case") && (
                        <TableCell>
                          {case_name.type === "echong_case"
                            ? case_name.value
                            : "-"}
                        </TableCell>
                      )}
                      {visibleColumns.includes("plate_no") && (
                        <TableCell>{row.plate_no}</TableCell>
                      )}
                      {visibleColumns.includes("address") && (
                        <TableCell>{row.case_address}</TableCell>
                      )}
                      {visibleColumns.includes("status") && (
                        <TableCell>{getStatusChip(row.status)}</TableCell>
                      )}
                      {visibleColumns.includes("process") && (
                        <TableCell>
                          {getProcessChip(row?.current_subprocess)}
                        </TableCell>
                      )}
                      {visibleColumns.includes("service") && (
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
                      )}
                      {visibleColumns.includes("subServices") && (
                        <TableCell>
                          {(suggestedServices[row.id] || []).length > 0
                            ? suggestedServices[row.id].map(
                                (service, index) => (
                                  <Chip
                                    key={index}
                                    label={
                                      service.suggested_services.join(", ") ||
                                      "N/A"
                                    }
                                    sx={{ mr: 1, mb: 1 }}
                                  />
                                )
                              )
                            : "None"}
                        </TableCell>
                      )}
                      {visibleColumns.includes("driver") && (
                        <TableCell>{device.drivername || "N/A"}</TableCell>
                      )}
                      {visibleColumns.includes("eta") && (
                        <TableCell>
                          {device.eta ? `${device.eta} min` : "N/A"}
                        </TableCell>
                      )}
                      {visibleColumns.includes("distance") && (
                        <TableCell>
                          {device.distance ? `${device.distance} km` : "N/A"}
                        </TableCell>
                      )}
                      {visibleColumns.includes("district") && (
                        <TableCell>{device.district || "N/A"}</TableCell>
                      )}
                      {visibleColumns.includes("initialBase") && (
                        <TableCell>{device.initialBase || "N/A"}</TableCell>
                      )}
                      {visibleColumns.includes("created_at") && (
                        <TableCell>{row.created_at || "N/A"}</TableCell>
                      )}
                      {visibleColumns.includes("actions") && (
                        <TableCell>
                          <Box sx={{ display: "flex" }}>
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
                            <IconButton
                              onClick={() => {
                                setSelectedCase({
                                  id: row.id,
                                  name: row.case_name,
                                });
                                setOpenServicesModal(true);
                              }}
                            >
                              <Badge
                                badgeContent={
                                  (suggestedServices[row.id] || []).length
                                }
                                color="error"
                              >
                                <RuleIcon />
                              </Badge>
                            </IconButton>
                            <IconButton
                              onClick={() => {
                                setReassignCaseDetails({
                                  id: row.id,
                                  name: row.case_name,
                                });
                                setOpenReassignModal(true);
                              }}
                            >
                              {" "}
                              <SwapHorizIcon color="primary" />{" "}
                            </IconButton>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ));
                })
              ) : (
                <TableShimmer columns={visibleColumns.length} />
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[15, 25, 35]}
          component="div"
          count={totalCases}
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
        <ReassignCaseModal
          open={openReassignModal}
          onClose={() => setOpenReassignModal(false)}
          caseDetails={reassignCaseDetails}
          onReassign={async (caseId, advisorId, newCaseId) => {
            // 🔥 Refresh cases
            toast.success("Case reassigned successfully 🎉");
            await getAllNewCases(
              userId,
              superVisor,
              page,
              rowsPerPage,
              searchTerm
            ).then(({ data }) => {
              if (data.status) {
                setAllCases(data.data);
                setTotalCases(data.pagination?.total || 0);
              }
            });
          }}
        />

        <SuggestedServicesModal
          open={openServicesModal}
          onClose={() => {
            setOpenServicesModal(false);
            setSelectedCase(null);
          }}
          caseId={selectedCase?.id}
          caseName={selectedCase?.name}
          services={suggestedServices[selectedCase?.id] || []}
          onApproved={handleApprove}
          onRejected={handleReject}
        />
      </Box>
    </PageLayout>
  );
};

export default ViewNewCases;
