import React, { useEffect, useState } from "react";
import SettingsMenu from "./components/SettingsMenu";
import PageLayout from "../common/components/PageLayout";
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
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Functions as FunctionsIcon,
} from "@mui/icons-material";
import AddLinkIcon from "@mui/icons-material/AddLink";
import LaunchIcon from "@mui/icons-material/Launch";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../AppContext";
import CollectionFab from "./components/CollectionFab";
import ConfirmDialog from "../common/components/ConfirmDialog";

const CustomCalcsPage = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const { traccarUser } = useAppContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  let type = searchParams.get("type");
  const [calcs, setCalcs] = useState([]);
  const [selectedCalc, setSelectedCalc] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    if (type) {
      fetchFromApi(type);
    }
  }, [type]);

  const fetchFromApi = async (t) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${url}/calcs/by/type?t=${t}`);

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

  const handleCalculatorPage = (id, calcName) => {
    if (id && calcName) {
      navigate(`/settings/view/calculator/${id}/${calcName}`);
    } else {
      toast.error("Invalid Calculator ID or Name");
    }
  };

  const handleDelete = async () => {
    try {
      const { data } = await axios.delete(`${url}/calcs/${selectedCalc.id}`);
      if (data.status) {
        toast.success(data.message);
        setCalcs((prevCalcs) =>
          prevCalcs.filter((_, i) => i !== selectedCalc.index)
        );
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error deleting calculator:", error);
    } finally {
      setOpenDialog(false);
    }
  };

  const handleDeviceAssignPage = (calcId) => {
    navigate(`/settings/admin/custom/assign-devices/${calcId}?auth=superAdmin`);
  };
  const handleCalculatorReportPage = (calc) => {
    navigate(`/reports/custom/devices/calc/${calc.id}/${calc.name}`);
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Admin Custom Calculators"]}
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
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                {/* <TableCell>Reports</TableCell> */}
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
                        {/* <TableCell>
                          <Tooltip title="Click to view device reports">
                            <span>
                              <IconButton size="small">
                                <Box
                                  onClick={() => {
                                    handleCalculatorReportPage(calc);
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
                        </TableCell> */}
                        <TableCell>
                          <Tooltip title="Click to assign devices">
                            <span>
                              <IconButton size="small">
                                <Box
                                  onClick={() => {
                                    handleDeviceAssignPage(calc.calc_id);
                                  }}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <Typography color="black">Device</Typography>
                                  <AddLinkIcon fontSize="small" />
                                </Box>
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <FunctionsIcon
                              fontSize="small"
                              onClick={() =>
                                handleCalculatorPage(calc.id, calc.name)
                              }
                            />
                          </IconButton>
                          <IconButton>
                            <EditIcon
                              // color="primary"
                              onClick={() =>
                                navigate(`/settings/calculator/${calc.id}`)
                              }
                            />
                          </IconButton>
                          <IconButton>
                            <DeleteIcon
                              color="black"
                              onClick={() => {
                                setSelectedCalc({ id: calc.id, index });
                                setOpenDialog(true);
                                // handleDelete(calc, index);
                              }}
                            />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            )}

            <ConfirmDialog
              open={openDialog}
              handleClose={() => setOpenDialog(false)}
              handleConfirm={handleDelete}
              title="Confirm Deletion"
              description="Are you sure you want to delete this item?"
            />
          </Table>
        </TableContainer>

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

      <CollectionFab editPath={"/settings/calculator?t=custom"} />
    </PageLayout>
  );
};

export default CustomCalcsPage;
