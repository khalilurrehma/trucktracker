import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  TablePagination,
  Box,
  IconButton,
  CircularProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import SettingsMenu from "./components/SettingsMenu";
import PageLayout from "../common/components/PageLayout";
import BlockIcon from "@mui/icons-material/Block";
import AddLinkIcon from "@mui/icons-material/AddLink";
import LaunchIcon from "@mui/icons-material/Launch";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../AppContext";

const CompanyDefaultCalcs = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const navigate = useNavigate();
  const { traccarUser } = useAppContext();
  const [calcs, setCalcs] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    if (traccarUser) {
      fetchFromApi();
    }
  }, [traccarUser]);

  const fetchFromApi = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${url}/calcs/company/custom/${traccarUser?.id}`
      );

      if (data.status) {
        setCalcs(data.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCalculators = calcs?.filter((calc) =>
    calc.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeviceAssignPage = (calcId) => {
    navigate(
      `/settings/company/custom/assign-devices/${calcId}/${traccarUser?.id}`
    );
  };
  const handleCalculatorPage = (calc) => {
    navigate(`/reports/custom/devices/calc/${calc.id}/${calc.name}`);
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Custom Calculators"]}
    >
      <ToastContainer />
      <Box sx={{ padding: 2 }}>
        <TextField
          label="Search Calculator"
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ marginBottom: 2, width: "20%" }}
        />
        {traccarUser && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Reports</TableCell>
                  <TableCell>Assign</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                <TableBody>
                  {filteredCalculators
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((calc, index) => {
                      return (
                        <TableRow key={calc.id}>
                          <TableCell>{calc.id}</TableCell>
                          <TableCell>{calc.name}</TableCell>
                          <TableCell>{"Custom"}</TableCell>
                          <TableCell>
                            <Tooltip title="Click to view device reports">
                              <span>
                                <IconButton size="small">
                                  <Box
                                    onClick={() => {
                                      handleCalculatorPage(calc);
                                    }}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <Typography color="black">View</Typography>
                                    <LaunchIcon fontSize="small" />
                                  </Box>
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Click to assign devices">
                              <span>
                                <IconButton size="small">
                                  <Box
                                    onClick={() => {
                                      handleDeviceAssignPage(calc.id);
                                    }}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <Typography color="black">
                                      Device
                                    </Typography>
                                    <AddLinkIcon fontSize="small" />
                                  </Box>
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="You do not have permission to perform actions">
                              <span>
                                <IconButton size="small" disabled>
                                  <BlockIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              )}
            </Table>
          </TableContainer>
        )}

        <TablePagination
          rowsPerPageOptions={[15, 25, 35]}
          component="div"
          count={filteredCalculators.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Box>
    </PageLayout>
  );
};

export default CompanyDefaultCalcs;
