import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TableSortLabel,
  TextField,
  Button,
  Tooltip,
  IconButton,
  CircularProgress,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TableShimmer from "../common/components/TableShimmer";
import { useTranslation } from "../common/components/LocalizationProvider";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

const ServiceTypesSubServices = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const userId = useSelector((state) => state.session.user.id);
  const [subServices, setSubServices] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rowLoading, setRowLoading] = useState({});
  const [sortOrder, setSortOrder] = useState("desc");
  const t = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFromApi();
  }, [userId]);

  const fetchFromApi = async () => {
    setLoading(true);
    try {
      const { data } =
        userId === 1
          ? await axios.get(`${url}/service-type/subservices`)
          : await axios.get(`${url}/service-type/subservices/user/${userId}`);

      if (data.status) {
        setSubServices(data.message);
      }
    } catch (error) {
      console.error("Error fetching sub services:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filteredData = subServices?.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredItems(filteredData);
  }, [search, subServices]);

  const handleSort = () => {
    const sortedData = [...filteredItems].sort((a, b) => {
      return sortOrder === "asc"
        ? new Date(a.created_at) - new Date(b.created_at)
        : new Date(b.created_at) - new Date(a.created_at);
    });
    setFilteredItems(sortedData);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleDelete = async (id) => {
    try {
      setRowLoading((prev) => ({ ...prev, [id]: true }));
      const response = await axios.delete(
        `${url}/service-type/subservice/${id}`
      );
      if (response.status === 200) {
        toast.success(response.data.message);
        fetchFromApi();
      } else {
        console.error(
          `Failed to delete sub service with ID ${id}:`,
          response.data.error
        );
      }
    } catch (error) {
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      }
      console.error(`Error deleting sub service with ID ${id}:`, error);
    } finally {
      setRowLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <Box>
      <ToastContainer />
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <TextField
            label={t("sharedSearch")}
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outlined" color="primary" onClick={fetchFromApi}>
            {loading ? t("sharedFetching") : t("sharedFetchData")}
          </Button>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Id</TableCell>
              <TableCell>{t("sharedName")}</TableCell>
              <TableCell>{t("settingsVehicleServiceType")}</TableCell>
              <TableCell>
                <TableSortLabel
                  active
                  direction={sortOrder}
                  onClick={handleSort}
                >
                  {t("sharedCreated")}
                </TableSortLabel>
              </TableCell>
              <TableCell>{t("sharedAction")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading ? (
              filteredItems
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.service_type_name}</TableCell>
                    <TableCell>
                      {dayjs(item.created_at).format("YYYY-MM-DD HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t("sharedEdit")}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigate(
                              `/settings/services-types/subservices/edit/${item.id}`
                            );
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {rowLoading[item.id] ? (
                        <CircularProgress
                          color="primary"
                          size="1.2rem"
                          variant="indeterminate"
                        />
                      ) : (
                        <Tooltip title={t("sharedRemove")}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              handleDelete(item.id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
            ) : (
              <TableShimmer columns={5} />
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={filteredItems.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) =>
            setRowsPerPage(parseInt(e.target.value, 10))
          }
        />
      </div>

      <CollectionFab editPath={"/settings/services-types/subservices/add"} />
    </Box>
  );
};

export default ServiceTypesSubServices;
