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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../AppContext";

// Static data based on the screenshot
const cases = [
  {
    creationDate: "05/29/2025 1:27 PM",
    code: "24693",
    salesforce: "0025400973",
    plate: "FB527*",
    districtOrigin: "CALLAO",
    destinationDistrict: "-",
    issue: "CRASH IN TRAFFIC",
    mode: "Auctioned",
    state: "SECURED CONTACT",
  },
  {
    creationDate: "05/29/2025 10:35",
    code: "24685",
    salesforce: "0025400921",
    plate: "AKN26*",
    districtOrigin: "STONE BRIDGE",
    destinationDistrict: "-",
    issue: "HIT AND RUN WHILE DRIVING",
    mode: "Auctioned",
    state: "CULMINATION",
  },
  {
    creationDate: "05/29/2025 09:43",
    code: "24682",
    salesforce: "0025400878",
    plate: "BUP91*",
    districtOrigin: "Santiago de Surco",
    destinationDistrict: "-",
    issue: "PROPERTY DAMAGE",
    mode: "Auctioned",
    state: "CULMINATION",
  },
  {
    creationDate: "05/29/2025 09:39",
    code: "24681",
    salesforce: "0025400872",
    plate: "CKR35*",
    districtOrigin: "COMMAS",
    destinationDistrict: "-",
    issue: "CRASH IN TRAFFIC",
    mode: "Auctioned",
    state: "CULMINATION",
  },
  {
    creationDate: "05/29/2025 09:28",
    code: "24677",
    salesforce: "0025400848",
    plate: "CKL68*",
    districtOrigin: "COMMAS",
    destinationDistrict: "-",
    issue: "CRASH IN TRAFFIC",
    mode: "Auctioned",
    state: "CULMINATION",
  },
  {
    creationDate: "05/29/2025 08:16",
    code: "24673",
    salesforce: "0025400697",
    plate: "AXP58*",
    districtOrigin: "THE AUGUSTINE",
    destinationDistrict: "-",
    issue: "CRASH IN TRAFFIC",
    mode: "Auctioned",
    state: "CULMINATION",
  },
  {
    creationDate: "05/29/2025 08:09",
    code: "24672",
    salesforce: "0025400688",
    plate: "BZG44*",
    districtOrigin: "Villa Maria del Triunfo",
    destinationDistrict: "-",
    issue: "CRASH IN TRAFFIC",
    mode: "Auctioned",
    state: "CULMINATION",
  },
  {
    creationDate: "05/29/2025 07:25",
    code: "24663",
    salesforce: "0025400578",
    plate: "ACL06*",
    districtOrigin: "SAN ISIDRO",
    destinationDistrict: "-",
    issue: "CRASH IN TRAFFIC",
    mode: "Auctioned",
    state: "CULMINATION",
  },
];

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

      // Parse report_data and map to table structure
      const mappedCases = data.data.map((item) => {
        const report = JSON.parse(item.report_data);
        return {
          id: item.id,
          creationDate: new Date(item.created_at).toLocaleDateString(),
          code: report.Informe,
          salesforce: report.NomBrok || "N/A",
          plate: report.NroPlaca,
          districtOrigin: report.Dist || "N/A",
          destinationDistrict: report.Dist || "N/A",
          issue: report.DescEnvio,
          mode: report.LMDM === "S" ? "LMDM" : "Standard",
          state: report.EstadoPoliza === "ACTIVA" ? "SECURED CONTACT" : "OTHER",
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
                  <TableRow key={row.id}>
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
                      <IconButton>
                        <InfoOutlinedIcon />
                      </IconButton>
                      <IconButton
                        onClick={() =>
                          navigate(`/operations/rimac/case/report/${row.id}`)
                        }
                      >
                        <VisibilityOutlinedIcon />
                      </IconButton>
                      <IconButton>
                        <EditOutlinedIcon />
                      </IconButton>
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
