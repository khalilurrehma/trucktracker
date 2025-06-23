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
import FilterListIcon from "@mui/icons-material/FilterList";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../AppContext";
import dayjs from "dayjs";

const safeValue = (value) =>
  typeof value === "string" || typeof value === "number" ? value : "N/A";

const RimacCases = () => {
  const { url } = useAppContext();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("Salesforce");

  const fetchFromApi = async (page = 1) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${url}/rimac/cases`, {
        params: { page, limit: 10 },
      });

      const now = dayjs();
      const mappedCases = data.data.map((item) => {
        const report =
          typeof item.report_data === "string"
            ? JSON.parse(item.report_data)
            : item.report_data;

        const createdAt = dayjs(item.created_at);
        const isNew = now.diff(createdAt, "hour") <= 24;

        return {
          id: item.id,
          creationDate: new Date(item.created_at).toLocaleDateString(),
          code: safeValue(report.Informe),
          salesforce:
            typeof report.NomBrok === "string" ? report.NomBrok : "N/A",
          plate: typeof report.NroPlaca === "string" ? report.NroPlaca : "N/A",
          districtOrigin: typeof report.Dist === "string" ? report.Dist : "N/A",
          destinationDistrict:
            typeof report.Dist === "string" ? report.Dist : "N/A",
          issue:
            typeof report.DescEnvio === "string" ? report.DescEnvio : "N/A",
          mode: report.LMDM === "S" ? "LMDM" : "Standard",
          state: report.EstadoPoliza === "ACTIVA" ? "SECURED CONTACT" : "OTHER",
          accidentAddress:
            typeof report.DirSin === "string" ? report.DirSin : "N/A",
          isNew, // 👈 Add this flag
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
    fetchFromApi(page);
  }, [page]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs2={["Operations", "Rimac Cases"]}
    >
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
              <MenuItem value="Salesforce">By Salesforce</MenuItem>
            </Select>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              sx={{
                borderColor: "#E57373",
                color: "#E57373",
                "&:hover": {
                  borderColor: "#E57373",
                  backgroundColor: "#FFEBEE",
                },
              }}
            >
              FILTER
            </Button>
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
                  CREATION DATE
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
                cases.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => {
                      navigate(
                        `/operations/dispatch?address=${row.accidentAddress}&casenumber=${row.code}`
                      );
                    }}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#F5F5F5",
                      },
                    }}
                  >
                    <TableCell>
                      {row.isNew && (
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
                          NEW
                        </Box>
                      )}{" "}
                    </TableCell>
                    <TableCell>{row.creationDate}</TableCell>
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
                            row.state === "SECURED CONTACT"
                              ? "#FFF3E0"
                              : "#E8F5E9",
                          color:
                            row.state === "SECURED CONTACT"
                              ? "#F57C00"
                              : "#388E3C",
                          borderRadius: "12px",
                          textAlign: "center",
                          padding: "4px 8px",
                          display: "inline-block",
                        }}
                      >
                        {row.state}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {/* <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("Info clicked");
                        }}
                      >
                        <InfoOutlinedIcon />
                      </IconButton> */}
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/operations/rimac/case/report/${row.id}`);
                        }}
                      >
                        <VisibilityOutlinedIcon />
                      </IconButton>
                      {/* <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("Edit clicked");
                        }}
                      >
                        <EditOutlinedIcon />
                      </IconButton> */}
                    </TableCell>
                  </TableRow>
                ))
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
