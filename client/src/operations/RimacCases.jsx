import React from "react";
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
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Select value="Salesforce" size="small" sx={{ minWidth: "120px" }}>
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
                  DESTINATION DISTRICT
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
              {cases.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.creationDate}</TableCell>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.salesforce}</TableCell>
                  <TableCell>{row.plate}</TableCell>
                  <TableCell>{row.districtOrigin}</TableCell>
                  <TableCell>{row.destinationDistrict}</TableCell>
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
                      onClick={() => navigate("/operations/rimac/case/report")}
                    >
                      <VisibilityOutlinedIcon />
                    </IconButton>
                    <IconButton>
                      <EditOutlinedIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={8206}
            page={1}
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
