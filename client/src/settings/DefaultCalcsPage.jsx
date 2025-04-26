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
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Functions as FunctionsIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../AppContext";
import CollectionFab from "./components/CollectionFab";
import ConfirmDialog from "../common/components/ConfirmDialog";
import { useTranslation } from "../common/components/LocalizationProvider";
const DefaultCalcsPage = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const navigate = useNavigate();
  const t = useTranslation();
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

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Admin Default Calculators"]}
    >
      <ToastContainer />
      <Box sx={{ padding: 2 }}>
        <TextField
          label={t("sharedSearchCalculators")}
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
                <TableCell>{t("sharedName")}</TableCell>
                <TableCell>{t("sharedType")}</TableCell>
                <TableCell>{t("sharedAction")}</TableCell>
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
                        <TableCell>{"Default"}</TableCell>
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
                              //   color="primary"
                              onClick={() =>
                                navigate(
                                  `/settings/calculator/${calc.id}?type=default`
                                )
                              }
                            />
                          </IconButton>
                          <IconButton>
                            <DeleteIcon
                              color="black"
                              onClick={() => {
                                setSelectedCalc({ id: calc.id, index });
                                setOpenDialog(true);
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

      <CollectionFab editPath={"/settings/calculator?t=default"} />
    </PageLayout>
  );
};

export default DefaultCalcsPage;
