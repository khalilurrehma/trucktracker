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
  Box,
} from "@mui/material";
// import { CSVLink } from "react-csv";
// import ReactToPrint from "react-to-print";
import LoadingButton from "@mui/lab/LoadingButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import PageLayout from "../common/components/PageLayout";
import useReportStyles from "../reports/common/useReportStyles";
import TableShimmer from "../common/components/TableShimmer";
import {
  formatDDMY,
  formatDate,
  addUnits,
  MenuProps,
} from "../common/util/formatter";
import CollectionFab from "../settings/components/CollectionFab";
import { useSelector } from "react-redux";
import { useAppContext } from "../AppContext";
import SettingsMenu from "../settings/components/SettingsMenu";
import { filterData } from "../common/util/filter";
import CustomAutocomplete from "../resources/common/components/CustomAutocomplete";
import { useTranslation } from "../common/components/LocalizationProvider";

const initialColumns = [
  "id",
  "name",
  "icon",
  "category_name",
  // "device_types",
  // "devices_ids",
  "calcs_ids",
  "actions",
];

const filterValidColumns = [
  "id",
  "name",
  "category_name",
  // "devices_ids",
  "calcs_ids",
];

const ReportsPage = () => {
  const t = useTranslation();
  const classes = useReportStyles();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const { fetchReportsData, traccarUser } = useAppContext();
  const [selectedColumns, setSelectedColumns] = useState(initialColumns);
  const [pagination, setPagination] = React.useState(25);
  const [open, setOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  let printComponentRef = React.useRef();
  const navigate = useNavigate();

  const [sortDirection, setSortDirection] = useState(null);
  const [sortColumn, setSortColumn] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const columnLabels = {
    id: `ID`,
    name: t("reportsName"),
    icon: t("sharedIcon"),
    category_name: t("deviceCategory"),
    // device_types: `Device Type Name`,
    // devices_ids: `Device ID`,
    calcs_ids: `Calc ID`,
    actions: t("sharedAction"),
  };

  const url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  const userId = useSelector((state) => state.session.user.id);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchReportsData(userId);
    // console.log("Data  : ", data);
  }, [data]);

  const fetchData = async () => {
    try {
      const response = traccarUser?.superAdmin
        ? await axios.get(`${url}/reports`)
        : await axios.get(`${url}/reports/createdby/${userId}`);
      if (response.status === 200) {
        setData(response.data.data);

        setLoading(false);
      } else {
        throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  function handleClickFetchData() {
    setLoading(true);
    const dataPromises = fetchData();
    Promise.all([dataPromises])
      .then((results) => {
        setLoading(false);
      })
      .catch((error) => {
        console.error("An error occurred:", error);
        setLoading(false);
      });
  }

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleEditClick = (item) => {
    navigate(`/settings/new-report/${item.id}`);
  };

  const handleDeleteClick = async (item) => {
    const apiUrl = `${url}/report/${item.id}`;
    try {
      const response = await axios.delete(apiUrl);

      if (response.data) {
        toast.success(response.data.message);
        setData((prevData) =>
          prevData.filter((category) => category.id !== item.id)
        );
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(err.response.data.error);
      }
      console.error("API Request Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    setSelectedColumns(event.target.value);
  };

  const handleChangePagination = (event) => {
    setPagination(event.target.value);
  };

  const handleClosePagination = () => {
    setOpen(false);
  };

  const handleOpenPagination = () => {
    setOpen(true);
  };

  const startIndex = (currentPage - 1) * pagination;
  const endIndex = startIndex + pagination;

  const filteredColumns = selectedColumns?.filter((column) =>
    filterValidColumns?.includes(column)
  );

  const filteredData = filterData(
    data,
    searchQuery,
    sortColumn,
    sortDirection,
    selectedColumns
  );

  const slicedFilteredData = filteredData?.slice(startIndex, endIndex);

  const excelData = [selectedColumns?.map((column) => columnLabels[column])];

  if (!loading) {
    filteredData?.forEach((item) => {
      const rowData = selectedColumns?.map((column) =>
        column === "begin" || column === "end"
          ? formatDDMY(item[column])
          : addUnits(column, item)
      );
      excelData.push(rowData);
    });
  }

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Reports"]}
    >
      <ToastContainer />
      <Box>
        <Box>
          <Box style={{ padding: "35px" }}>
            <Box>
              <Box display={"flex"} flexDirection={"row"} gap={2}>
                <FormControl sx={{ mr: 1, minWidth: "75px" }}>
                  <InputLabel id="demo-controlled-open-select-label">
                    {t("sharedRows")}
                  </InputLabel>
                  <Select
                    labelId="demo-controlled-open-select-label"
                    id="demo-controlled-open-select"
                    open={open}
                    onClose={handleClosePagination}
                    onOpen={handleOpenPagination}
                    value={pagination}
                    label={t("sharedRows")}
                    onChange={handleChangePagination}
                  >
                    {[25, 50, 100, 500]?.map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ width: "30%" }}>
                  <InputLabel id="demo-multiple-name-label">{t("sharedColumns")}</InputLabel>
                  <Select
                    labelId="demo-multiple-name-label"
                    id="demo-multiple-name"
                    multiple
                    value={selectedColumns}
                    onChange={handleChange}
                    input={<OutlinedInput label="Name" />}
                    MenuProps={MenuProps}
                  >
                    {initialColumns?.map((column) => (
                      <MenuItem key={column} value={column}>
                        {columnLabels[column]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {/* <Box className="box-search-5">
                  <CustomAutocomplete
                    options={filteredColumns?.map((column) => ({
                      value: column,
                      label: columnLabels[column] || column,
                    }))}
                    valueField="value"
                    labelField="label"
                    value={sortColumn}
                    label="Sort Column"
                    onChange={(e, v) => setSortColumn(v)}
                  />
                </Box>
                <Box className="box-search-5">
                  <CustomAutocomplete
                    options={[
                      { label: "Accending", value: "asc" },
                      { label: "Dessending", value: "desc" },
                    ]}
                    valueField="value"
                    labelField="label"
                    value={sortDirection}
                    label="Sort Type"
                    onChange={(e, v) => setSortDirection(v)}
                  />
                </Box> */}
                <Box className="box-search-5">
                  <TextField
                    label={t("sharedSearch")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                  />
                </Box>
                <Box className="box-search-5">
                  <LoadingButton
                    size="small"
                    onClick={handleClickFetchData}
                    loading={loading}
                    loadingIndicator="Loading…"
                    variant="outlined"
                    sx={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      padding: "5px 15px",
                      height: "40px",
                      width: "100%",
                    }}
                  >
                    {t("sharedFetchData")}
                  </LoadingButton>
                </Box>
              </Box>
            </Box>
          </Box>
          <Box>
            <Table ref={(el) => (printComponentRef = el)}>
              <TableHead>
                <TableRow>
                  {selectedColumns?.map((column) => (
                    <TableCell key={column}>{columnLabels[column]}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading ? (
                  slicedFilteredData?.map((item) => (
                    <TableRow key={item.id}>
                      {selectedColumns?.map((column) => (
                        <TableCell key={column}>
                          {column === "created_at" ? (
                            formatDate(item[column]).formattedDate
                          ) : column === "actions" ? (
                            <>
                              <Box className="">
                                <span
                                  onClick={() => handleEditClick(item)}
                                  style={{
                                    padding: "0 15px 0 0",
                                    cursor: "pointer",
                                  }}
                                >
                                  <EditIcon />
                                </span>
                                <span
                                  onClick={() => handleDeleteClick(item)}
                                  style={{ cursor: "pointer" }}
                                >
                                  <DeleteIcon />
                                </span>
                              </Box>
                            </>
                          ) : column === "icon" ? (
                            <>
                              <Box>
                                <i
                                  className={`fas ${item[column]}`}
                                  style={{
                                    fontSize: "20px",
                                    paddingLeft: "5px",
                                  }}
                                ></i>
                              </Box>
                            </>
                          ) : (
                            addUnits(column, item)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableShimmer columns={selectedColumns?.length} />
                )}
              </TableBody>
            </Table>
            <Box
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
                Showing ({slicedFilteredData?.length}){" "}
                <b>
                  {currentPage === 1 ? 1 : (currentPage - 1) * pagination + 1}
                </b>{" "}
                to{" "}
                <b>
                  {Math.min(currentPage * pagination, filteredData?.length)}{" "}
                </b>{" "}
                of <b>{filteredData?.length}</b> Data.
              </Typography>
              <Pagination
                count={Math.ceil(filteredData?.length / pagination)}
                page={currentPage}
                onChange={handlePageChange}
                showFirstButton
                showLastButton
                sx={{ mx: "auto" }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
      <CollectionFab editPath="/settings/new-report" />
    </PageLayout>
  );
};

export default ReportsPage;
