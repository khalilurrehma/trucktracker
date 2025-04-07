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
// import ReportsMenu from "./components/ReportsMenu";
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

const initialColumns = ["id", "name", "icon", "created_at_nn", "actions"];
const filterValidColumns = ["id", "name", "created_at_nn"];
const Categories = () => {
  const t = useTranslation();
  const classes = useReportStyles();
  const { fetchCategoriesData } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
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
    name: `Name`,
    icon: `Icon`,
    created_at_nn: `Created`,
    actions: `Actions`,
  };

  const url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  const userId = useSelector((state) => state.session.user.id);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchCategoriesData(userId);
  }, [data]);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${url}/categories`);

      if (response.status === 200) {
        const enrichedData = response.data?.map((item) => ({
          ...item,
          created_at_nn: formatDate(item.created_at).formattedDate,
        }));
        setData(enrichedData);
      } else {
        throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      console.error(error);
    } finally {
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
    navigate(`/settings/new-category/${item.id}`);
  };

  const handleDeleteClick = async (item) => {
    const apiUrl = `${url}/category/${item.id}`;
    try {
      const response = await axios.delete(apiUrl);

      if (response.data) {
        toast.error(response.data.message);
        setData((prevData) =>
          prevData?.filter((category) => category.id !== item.id)
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

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // const handleChangeDevices = (event) => {
  //   setDevices(event.target.value);
  // };

  const handleChangePagination = (event) => {
    setPagination(event.target.value);
  };

  const handleClosePagination = () => {
    setOpen(false);
  };

  const handleOpenPagination = () => {
    setOpen(true);
  };

  // const handleDateChange = (date) => {
  //   setDatePicker(date);
  // };

  const startIndex = (currentPage - 1) * pagination;
  const endIndex = startIndex + pagination;

  const filteredColumns = selectedColumns?.filter((column) =>
    filterValidColumns.includes(column)
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Categories"]}
    >
      <ToastContainer />
      <Box>
        <Box>
          <Box>
            <Box sx={{ p: 4 }}>
              <Box display={"flex"} flexDirection={"row"} gap={2}>
                <FormControl sx={{ minWidth: 75 }}>
                  <InputLabel id="rows-select-label">Rows</InputLabel>
                  <Select
                    labelId="rows-select-label"
                    id="rows-select"
                    open={open}
                    onClose={handleClosePagination}
                    onOpen={handleOpenPagination}
                    value={pagination}
                    label="Rows"
                    onChange={handleChangePagination}
                  >
                    {[25, 50, 100, 500].map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ flex: 1, minWidth: 150 }}>
                  <InputLabel id="columns-select-label">Columns</InputLabel>
                  <Select
                    labelId="columns-select-label"
                    id="columns-select"
                    multiple
                    value={selectedColumns}
                    onChange={handleChange}
                    input={<OutlinedInput label="Columns" />}
                    MenuProps={MenuProps}
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
                  label="Sort Column"
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
                  label="Sort Type"
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
                  loadingIndicator="Loading…"
                  variant="outlined"
                  sx={{ height: 40, width: "100%" }}
                >
                  Fetch Data
                </LoadingButton>
              </Box>
            </Box>
          </Box>
          <div>
            <Table ref={(el) => (printComponentRef = el)}>
              <TableHead>
                <TableRow>
                  {selectedColumns.map((column) => (
                    <TableCell key={column}>{columnLabels[column]}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading ? (
                  slicedFilteredData.map((item) => (
                    <TableRow key={item.id}>
                      {selectedColumns.map((column) => (
                        <TableCell key={column}>
                          {column === "actions" ? (
                            <>
                              <div className="">
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
                              </div>
                            </>
                          ) : column === "icon" ? (
                            <>
                              <div>
                                <i
                                  className={`fas ${item[column]}`}
                                  style={{
                                    fontSize: "20px",
                                    paddingLeft: "5px",
                                  }}
                                ></i>
                              </div>
                            </>
                          ) : (
                            addUnits(column, item)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableShimmer columns={selectedColumns.length} />
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
                <b>
                  {currentPage === 1 ? 1 : (currentPage - 1) * pagination + 1}
                </b>{" "}
                to{" "}
                <b>
                  {Math.min(currentPage * pagination, filteredData.length)}{" "}
                </b>{" "}
                of <b>{filteredData.length}</b> Data.
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
          </div>
        </Box>
      </Box>
      <CollectionFab editPath="/settings/new-category" />
    </PageLayout>
  );
};

export default Categories;
