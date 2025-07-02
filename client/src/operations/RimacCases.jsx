import React, { useState, useEffect } from "react";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import {
  Box,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Select,
  MenuItem,
  IconButton,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import notificationSound from "./../resources/clicking-412.mp3";
import FilterListIcon from "@mui/icons-material/FilterList";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import SummarizeIcon from "@mui/icons-material/Summarize";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../AppContext";
import dayjs from "dayjs";
import { toast, ToastContainer } from "react-toastify";
import { useTheme } from "@mui/material";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const safeValue = (value) =>
  typeof value === "string" || typeof value === "number" ? value : "N/A";

const mapIncomingReport = (report) => {
  const now = dayjs();
  const createdAt = dayjs(report.created_at || new Date());
  const isNew = now.diff(createdAt, "hour") <= 24;

  const echong_created_at = dayjs(createdAt).format("YYYY-MM-DD HH:mm");

  let rimac_created_at = "";
  if (report.FecEnvio && report.HorEnvio) {
    const readbleFecEnvio = dayjs(report.FecEnvio, "YYYYMMDD").format(
      "YYYY-MM-DD"
    );

    rimac_created_at = `${readbleFecEnvio} ${report.HorEnvio}`;
  }

  return {
    id: report.id,
    caseId: report.case_id,
    status: report.status,
    creationDate: new Date(
      report.created_at || new Date()
    ).toLocaleDateString(),
    echong_created_at,
    rimac_created_at,
    code: safeValue(report.Informe),
    salesforce: safeValue(report.Caso),
    plate: safeValue(report.NroPlaca),
    districtOrigin: safeValue(report.Dist),
    destinationDistrict: safeValue(report.Dist),
    issue: safeValue(report.DescEnvio),
    mode: report.LMDM === "S" ? "LMDM" : "Auctioned",
    state: report.EstadoPoliza === "ACTIVA" ? "CULIMINATION" : "OTHER",
    accidentAddress: safeValue(report.DirSin),
    isNew,
    isLive: true,
  };
};

const RimacCases = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { url, liveRimacCases } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnRimacPage = location.pathname === "/operations/rimac/cases";
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");

  const fetchFromApi = async (page = 1, search = "", selectedFilter = "") => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${url}/rimac/cases`, {
        params: { page, limit: 8, search, filter: selectedFilter },
      });

      const now = dayjs();
      const mappedCases = data.data.map((item) => {
        const report =
          typeof item.report_data === "string"
            ? JSON.parse(item.report_data)
            : item.report_data;

        const createdAt = dayjs(item.created_at);
        const isNew = now.diff(createdAt, "hour") <= 24;

        const echong_created_at = dayjs(createdAt).format("YYYY-MM-DD HH:mm");

        let rimac_created_at = "";
        if (report.FecEnvio && report.HorEnvio) {
          const readbleFecEnvio = dayjs(report.FecEnvio, "YYYYMMDD").format(
            "YYYY-MM-DD"
          );

          rimac_created_at = `${readbleFecEnvio} ${report.HorEnvio}`;
        }

        return {
          id: item.id,
          caseId: item.case_id,
          status: item.status,
          creationDate: new Date(item.created_at).toLocaleDateString(),
          echong_created_at,
          rimac_created_at,
          code: safeValue(report.Informe),
          salesforce: safeValue(report.Caso),
          plate: safeValue(report.NroPlaca),
          districtOrigin: safeValue(report.Dist),
          destinationDistrict: safeValue(report.Dist),
          issue: safeValue(report.DescEnvio),
          mode: report.LMDM === "S" ? "LMDM" : "Auctioned",
          state: report.EstadoPoliza === "ACTIVA" ? "CULIMINATION" : "OTHER",
          accidentAddress: safeValue(report.DirSin),
          reference: safeValue(report.RefSin),
          isNew,
        };
      });

      setCases(mappedCases);
      setTotalPages(data.pagination.totalPages);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFromApi(page, searchQuery, filter);
  }, [page, searchQuery, filter]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(1);
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
  };

  useEffect(() => {
    if (!liveRimacCases || liveRimacCases.length === 0) return;

    const latest = liveRimacCases[liveRimacCases.length - 1];
    const updated = mapIncomingReport(latest.report);

    if (latest?.type === "post") {
      setCases((prev) => [updated, ...prev]);

      setTimeout(() => {
        setCases((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, isLive: false } : c))
        );
      }, 5000);

      if (isOnRimacPage) {
        toast.info("📋 New Rimac case received", { autoClose: 4000 });
        try {
          const audio = new Audio(notificationSound);
          audio.load();
          audio
            .play()
            .catch((error) => console.warn("⚠️ Audio play error:", error));
        } catch (error) {
          console.error("🚨 Failed to play audio:", error);
        }
      }
    }

    if (latest?.type === "update") {
      setCases((prev) =>
        prev.map((c) =>
          c.id === updated.id ? { ...updated, isLive: true } : c
        )
      );

      setTimeout(() => {
        setCases((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, isLive: false } : c))
        );
      }, 5000);
    }
  }, [liveRimacCases]);

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs2={["Operations", "Rimac Cases"]}
    >
      <ToastContainer />
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <TextField
            placeholder="Search for Attorney Cases"
            variant="outlined"
            size="small"
            sx={{ width: "300px" }}
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Select
              value={filter}
              onChange={handleFilterChange}
              size="small"
              sx={{ minWidth: "120px" }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="sent_to_rimac">Sent to Rimac</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
          </Box>
        </Box>

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, mt: 6 }}
        >
          <Box
            sx={{
              width: "24px",
              height: "24px",
              backgroundColor: "#E57373",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ color: "white", fontSize: "14px" }}>
              📋
            </Typography>
          </Box>
          <Typography variant="h6">List of Rimac Cases</Typography>
        </Box>

        <TableContainer component={Paper} sx={{ mt: 4 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#FFEBEE" }}>
                <TableCell
                  sx={{ color: "#E57373", fontWeight: "bold" }}
                ></TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  Echong created at
                </TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  Rimac created at
                </TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  CODE
                </TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  SALESFORCE
                </TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  PLATE
                </TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  DISTRICT OF ORIGIN
                </TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  ISSUE
                </TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  MODE
                </TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  STATE
                </TableCell>
                <TableCell sx={{ color: "#E57373", fontWeight: "bold" }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No cases found
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((row) => {
                  // console.log(row);

                  return (
                    <TableRow
                      key={row.id}
                      onClick={
                        !row.caseId
                          ? () => {
                              navigate(
                                `/operations/dispatch?address=${row.accidentAddress}&casenumber=${row.salesforce}&rimac_report_id=${row.id}&reference=${row?.reference}`
                              );
                            }
                          : undefined
                      }
                      sx={{
                        cursor: !row.caseId ? "pointer" : "not-allowed",
                        backgroundColor: row.isLive
                          ? isDark
                            ? "#3b3b3b"
                            : "#FFF8E1"
                          : "inherit",
                        transition: "background-color 0.3s ease",
                        "&:hover": {
                          backgroundColor: !row.caseId
                            ? isDark
                              ? "#2e2e2e"
                              : "#f5f5f5"
                            : isDark
                            ? "#ff6666"
                            : "red",
                        },
                      }}
                    >
                      <TableCell>
                        <Box
                          component="span"
                          sx={{
                            backgroundColor: "#E57373",
                            color: "white",
                            fontSize: "11px",
                            borderRadius: "8px",
                            px: 1,
                            py: 0.2,
                            fontWeight: "bold",
                          }}
                        >
                          {row.status === "completed"
                            ? row.status
                            : row.isNew
                            ? "new"
                            : row.status}
                        </Box>
                      </TableCell>
                      <TableCell>{row.echong_created_at}</TableCell>
                      <TableCell>{row.rimac_created_at}</TableCell>
                      <TableCell>{row.code}</TableCell>
                      <TableCell>{row.salesforce}</TableCell>
                      <TableCell>{row.plate}</TableCell>
                      <TableCell>{row.districtOrigin}</TableCell>
                      <TableCell>{row.issue}</TableCell>
                      <TableCell>{row.mode}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            backgroundColor:
                              row.state === "OTHER"
                                ? "rgb(255 78 78)"
                                : "rgb(97 255 139)",
                            color:
                              row.state === "OTHER" ? "#FFFFFF" : "rgb(0 0 0)",
                            borderRadius: "12px",
                            textAlign: "center",
                            padding: "4px 8px",
                            display: "inline-block",
                          }}
                        >
                          {row.state}
                        </Box>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: "flex" }}>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/operations/rimac/case/report/${row.id}`
                              );
                            }}
                          >
                            <VisibilityOutlinedIcon />
                          </IconButton>
                          <Tooltip
                            title={
                              !row.caseId
                                ? "Disabled: This report cannot be viewed because the case is yet to be assigned."
                                : "View detailed Rimac report"
                            }
                            arrow
                          >
                            <span>
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/operations/rimac-case/report/final/${row.id}/caseId/${row.caseId}`
                                  );
                                }}
                                disabled={!row.caseId}
                              >
                                <SummarizeIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            sx={{
              "& .MuiPaginationItem-root": {
                color: "#E57373",
              },
              "& .Mui-selected": {
                backgroundColor: "#E57373",
                color: "white",
              },
            }}
          />
        </Box>
      </Box>
    </PageLayout>
  );
};

export default RimacCases;
