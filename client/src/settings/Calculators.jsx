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
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Functions as FunctionsIcon,
} from "@mui/icons-material";
import SettingsMenu from "./components/SettingsMenu";
import PageLayout from "../common/components/PageLayout";
import BlockIcon from "@mui/icons-material/Block";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../AppContext";
import CollectionFab from "./components/CollectionFab";
import ConfirmDialog from "../common/components/ConfirmDialog";

const Calculators = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const navigate = useNavigate();
  const { traccarUser } = useAppContext();
  const [calcs, setCalcs] = useState([]);
  const [selectedCalc, setSelectedCalc] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    if (traccarUser) {
      fetchFromApi();
    }
  }, [traccarUser]);

  const fetchFromApi = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${url}/calcs`);

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
    // switch (calcName) {
    //   case "Recarga Combustible":
    //     navigate(`/settings/view/calculator/${id}/Recarga Combustible`);
    //     break;
    //   case "Consumo Combustible dia":
    //     navigate(`/settings/view/calculator/${id}/Consumo Combustible dia`);
    //     break;
    //   case "Seguridad Dispositivos":
    //     navigate(`/settings/view/calculator/${id}/Seguridad Dispositivos`);
    //     break;
    //   case "Paradas":
    //     navigate(`/settings/view/calculator/${id}/Paradas`);
    //     break;
    //   case "Vehiculos":
    //     navigate(`/settings/view/calculator/${id}/Vehiculos`);
    //     break;
    //   default:
    //     toast.error("Unknown calculator");
    // }
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

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "Calculators"]}
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
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCalculators
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((calc, index) => {
                      let calc_type = JSON.parse(calc?.calc_type);

                      return (
                        <TableRow key={calc.id}>
                          <TableCell>{calc.calc_id}</TableCell>
                          <TableCell>{calc.name}</TableCell>
                          <TableCell>
                            {calc_type.type === "default"
                              ? "Default"
                              : "Custom"}
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
                    })
                )}
              </TableBody>

              <ConfirmDialog
                open={openDialog}
                handleClose={() => setOpenDialog(false)}
                handleConfirm={handleDelete}
                title="Confirm Deletion"
                description="Are you sure you want to delete this item?"
              />
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

      <CollectionFab editPath={"/settings/calculator"} />
    </PageLayout>
  );
};
export default Calculators;
