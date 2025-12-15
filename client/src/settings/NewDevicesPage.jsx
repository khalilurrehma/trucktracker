import React, { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TextField,
  Typography,
  Pagination,
  Tooltip,
  IconButton,
  CircularProgress,
  Box,
} from "@mui/material";
import Swal from "sweetalert2";
import BlockIcon from "@mui/icons-material/Block";
import PageLayout from "../common/components/PageLayout";
import useReportStyles from "../reports/common/useReportStyles";
import TableShimmer from "../common/components/TableShimmer";
import {
  formatDDMY as formatTimestamp,
  addUnits,
  MenuProps,
} from "../common/util/formatter";
import axios from "axios";
// import { CSVLink } from "react-csv";
// import ReactToPrint from "react-to-print";
import { toast, ToastContainer } from "react-toastify";
import { useTranslation } from "../common/components/LocalizationProvider";
import SettingsMenu from "../settings/components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Speed as SpeedIcon,
} from "@mui/icons-material";
import { useAppContext } from "../AppContext";
import LoadingButton from "@mui/lab/LoadingButton";
import { useEffectAsync } from "../reactHelper";
import { filterData } from "../common/util/filter";
import CustomAutocomplete from "../resources/common/components/CustomAutocomplete";
import { useAdministrator, useSuperVisor } from "../common/util/permissions";
import AddLinkIcon from "@mui/icons-material/AddLink";
// import {} from "lodash"

const NewDevicesPage = () => {
  const t = useTranslation();
  const { traccarUser } = useAppContext();
  const admin = useAdministrator();
  const superVisor = useSuperVisor();
  const navigate = useNavigate();
  const classes = useReportStyles();
  const [loading, setLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState({});
  const [data, setData] = useState([]);
  const [pagination, setPagination] = React.useState(10);
  const [open, setOpen] = React.useState(false);

  let initialColumns = [
    "name",
    traccarUser?.superAdmin ? "uniqueId" : null,
    "groupName",
    "phone",
    "model",
    "contact",
    traccarUser?.administrator && traccarUser?.attributes?.non_admin
      ? null
      : "created_by",
    traccarUser?.administrator && traccarUser?.attributes?.non_admin
      ? null
      : "assignCalc",
    traccarUser?.administrator && traccarUser?.attributes?.non_admin
      ? null
      : "actions",
  ].filter(Boolean);

  const filterValidColumns = [
    "name",
    "uniqueId",
    "groupName",
    "phone",
    "model",
    "contact",
    "assignCalc",
  ];
  const [selectedColumns, setSelectedColumns] = useState(initialColumns);
  let printComponentRef = React.useRef();

  const [sortDirection, setSortDirection] = useState(null);
  const [sortColumn, setSortColumn] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const columnLabels = {
    name: t("sharedName"),
    uniqueId: t("deviceIdentifier"),
    groupName: t("groupName"),
    phone: t("sharedPhone"),
    model: t("deviceModel"),
    contact: t("deviceContact"),
    created_by: `Created_by`,
    assignCalc: t("deviceAssignCalculator"),
    actions: t("sharedAction"),
  };

  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const handleChangePagination = (event) => {
    setPagination(event.target.value);
  };

  const handleClosePagination = () => {
    setOpen(false);
  };

  const handleOpenPagination = () => {
    setOpen(true);
  };

  const [currentPage, setCurrentPage] = useState(1);

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const startIndex = (currentPage - 1) * pagination;
  const endIndex = startIndex + pagination;

  const filteredColumns = selectedColumns.filter((column) =>
    filterValidColumns.includes(column)
  );

  const filteredData = filterData(
    data,
    searchQuery,
    sortColumn,
    sortDirection,
    selectedColumns
  );

  const slicedFilteredData = filteredData.slice(startIndex, endIndex);

  const excelData = [];
  excelData.push(selectedColumns.map((column) => columnLabels[column]));

  const handleChange = (event) => {
    const {
      target: { value },
    } = event;

    setSelectedColumns(value);
  };

  const userId = useSelector((state) => state.session.user.id);

  useEffect(() => {
    fetchDataFromAPI();
  }, [userId]);

  const fetchDataFromAPI = async () => {
    try {
      setLoading(true);
      const apiUrl = `${url}/new-devices`;

      const [newDevicesResponse, permissionDevicesResponse] = await Promise.all(
        [axios.get(apiUrl), fetch("/api/devices")]
      );

      if (newDevicesResponse.status === 200 && permissionDevicesResponse.ok) {
        const newDevices = newDevicesResponse.data.data;

        const permissionDevices = await permissionDevicesResponse.json();

        const matchedDevices = findMatchingDevices(
          newDevices,
          permissionDevices
        );
        setData(userId === 1 ? newDevices : matchedDevices);
      } else {
        throw new Error("Failed to fetch data from one of the APIs");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const findMatchingDevices = (newDevices, permissionDevices) => {
    return newDevices.filter((newDevice) => {
      return permissionDevices.some(
        (permissionDevice) => permissionDevice.id === newDevice.traccarId
      );
    });
  };

  const handleDelete = async (id) => {
    try {
      setRowLoading((prev) => ({ ...prev, [id]: true }));
      const response = await axios.delete(`${url}/new-devices/${id}`);
      if (response.status === 200) {
        toast.success(response.data.message);
        setData((prevData) => prevData.filter((item) => item.id !== id));
      } else {
        console.error(
          `Failed to delete device with ID ${id}:`,
          response.data.error
        );
      }
    } catch (error) {
      if (error.response.data.error) {
        toast.error(error.response.data.error);
      }
      console.error(`Error deleting device with ID ${id}:`, error);
    } finally {
      setRowLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  function handleClickFetchData() {
    const fetchReports = fetchDataFromAPI();

    Promise.all([fetchReports])
      .then((results) => {
        // const [devicesResult, dataResult, apiDataResult] = results;
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  }

  const handleCalculatorAssignPage = (deviceId, id) => {
    userId === 1
      ? navigate(`/settings/assign/custom-calc/${deviceId}?auth=superAdmin`)
      : navigate(
        `/settings/assign/custom-calc/${deviceId}?auth=admin&id=${id}`
      );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const PrintComponent = React.forwardRef((props, ref) => (
    <>
      <Table ref={ref}>
        <TableHead>
          <TableRow>
            {selectedColumns.map((column) => {
              return (
                <TableCell
                  key={column}
                  className={column === "actions" ? "text-end" : ""}
                >
                  {columnLabels[column]}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading ? (
            filteredData.slice(startIndex, endIndex).map((item) => (
              <TableRow key={item.id}>
                {selectedColumns.map((column) => {
                  return (
                    <TableCell
                      key={column}
                      className={column === "actions" ? "text-end" : ""}
                    >
                      {column === "phone" &&
                        (item[column] === 0 || item[column] === null) ? (
                        ""
                      ) : column === "model" &&
                        (item[column] === 0 || item[column] === null) ? (
                        ""
                      ) : column === "contact" &&
                        (item[column] === 0 || item[column] === null) ? (
                        ""
                      ) : column === "actions" ? (
                        <>
                          {(traccarUser?.superAdmin &&
                            item.created_role === "superAdmin") ||
                            (traccarUser?.superAdmin &&
                              item.created_role === "admin") ||
                            (!traccarUser?.superAdmin &&
                              admin &&
                              item.created_role === "admin") ? (
                            <>
                              <Tooltip title={"view telemetry"}>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    navigate(
                                      `/settings/device/${item.flespiId}/telemetry`
                                    )
                                  }
                                >
                                  <SpeedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t("sharedConnections")}>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    navigate(
                                      `/settings/device/${item.traccarId}/connections`
                                    )
                                  }
                                >
                                  <LinkIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t("sharedEdit")}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    navigate(`/settings/new-device/${item.id}`);
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
                                      Swal.fire({
                                        title: "¿Eliminar?",
                                        text: "Esta acción no se puede deshacer.",
                                        icon: "warning",
                                        showCancelButton: true,
                                        confirmButtonColor: "#d33",
                                        cancelButtonColor: "#3085d6",
                                        confirmButtonText: "Sí, eliminar",
                                        cancelButtonText: "Cancelar",
                                      }).then((result) => {
                                        if (result.isConfirmed) {
                                          handleDelete(item.id);
                                          Swal.fire({
                                            icon: "success",
                                            title: "Eliminado",
                                            text: "Se eliminó correctamente.",
                                            timer: 1200,
                                            showConfirmButton: false,
                                          });
                                        }
                                      });
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                              )}
                            </>
                          ) : (
                            <Tooltip title="You do not have permission to perform actions">
                              <span>
                                <IconButton size="small" disabled>
                                  <BlockIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </>
                      ) : column === "assignCalc" ? (
                        <Tooltip title="Click to assign devices">
                          <span>
                            <IconButton size="small">
                              <Box
                                onClick={() => {
                                  handleCalculatorAssignPage(
                                    item.flespiId,
                                    userId
                                  );
                                }}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <AddLinkIcon fontSize="small" />
                              </Box>
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        addUnits(column, item)
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <>
              <TableShimmer columns={selectedColumns.length} />
            </>
          )}
        </TableBody>
      </Table>

      <div
        style={{
          display: "flex",
          margin: "16px",
          position: "relative",
          marginBottom: "50px",
        }}
      >
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{ position: "absolute" }}
        >
          Showing ({slicedFilteredData.length}){" "}
          <b>{currentPage === 1 ? 1 : (currentPage - 1) * pagination + 1}</b> to{" "}
          <b>{Math.min(currentPage * pagination, filteredData.length)} </b> of{" "}
          <b>{filteredData.length}</b> Data.
        </Typography>
        <Pagination
          count={Math.ceil(filteredData.length / pagination)}
          page={currentPage}
          onChange={handlePageChange}
          showFirstButton
          showLastButton
          sx={{ mx: "auto" }}
        />
      </div>
    </>
  ));
  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "deviceTitle"]}
    >
      <ToastContainer />
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            padding: "35px",
            position: "sticky",
            left: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 2,
              padding: 2,
            }}
          >
            <FormControl sx={{ mr: 1, minWidth: "75px" }}>
              <InputLabel id="pagination-select-label">
                {t("sharedRows")}
              </InputLabel>
              <Select
                labelId="pagination-select-label"
                id="pagination-select"
                open={open}
                onClose={handleClosePagination}
                onOpen={handleOpenPagination}
                value={pagination}
                onChange={handleChangePagination}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={500}>500</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ width: "100%" }}>
              <InputLabel id="columns-select-label">
                {t("sharedColumns")}
              </InputLabel>
              <Select
                labelId="columns-select-label"
                id="columns-select"
                multiple
                value={selectedColumns}
                onChange={handleChange}
                input={<OutlinedInput label={t("sharedColumns")} />}
              >
                {initialColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {columnLabels[column]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <CustomAutocomplete
              options={filteredColumns.map((column) => ({
                value: column,
                label: columnLabels[column] || column,
              }))}
              valueField="value"
              labelField="label"
              value={sortColumn}
              label={t("sharedSortColumns")}
              onChange={(e, v) => setSortColumn(v)}
            />

            <CustomAutocomplete
              options={[
                { label: "Ascending", value: "asc" },
                { label: "Descending", value: "desc" },
              ]}
              valueField="value"
              labelField="label"
              value={sortDirection}
              label={t("sharedSortType")}
              onChange={(e, v) => setSortDirection(v)}
            />

            <TextField
              label={t("sharedSearch")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
            />

            <LoadingButton
              size="small"
              onClick={handleClickFetchData}
              loading={loading}
              loadingIndicator={t("sharedLoading")}
              variant="outlined"
              sx={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                padding: "5px 15px",
                height: "40px",
                width: "100%",
              }}
            >
              <span>{t("sharedFetchData")}</span>
            </LoadingButton>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          <PrintComponent ref={(el) => (printComponentRef = el)} />
        </Box>
      </Box>
      {traccarUser?.administrator && traccarUser?.attributes?.non_admin ? (
        <></>
      ) : (
        <CollectionFab editPath="/settings/new-device" />
      )}
    </PageLayout>
  );
};

export default NewDevicesPage;
