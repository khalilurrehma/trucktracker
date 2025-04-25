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
  IconButton,
  Tooltip,
  CircularProgress,
  Box,
} from "@mui/material";
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
// import { toast } from "sonner";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from "../common/components/LocalizationProvider";
import SettingsMenu from "../settings/components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import PublishIcon from "@mui/icons-material/Publish";
import LinkIcon from "@mui/icons-material/Link";
import { useAppContext } from "../AppContext";
import LoadingButton from "@mui/lab/LoadingButton";

const NewGroupsPage = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { traccarUser } = useAppContext();
  const classes = useReportStyles();
  const [loading, setLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState({});
  const [data, setData] = useState([]);
  const initialColumns = ["name", "created_by", "actions"];
  const [selectedColumns, setSelectedColumns] = useState(initialColumns);
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = React.useState(10);
  const [open, setOpen] = React.useState(false);
  const userId = useSelector((state) => state.session.user.id);

  const columnLabels = {
    name: `Name`,
    created_by: `Created_by`,
    actions: `Actions`,
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

  const filteredData = data.filter((item) => {
    const isSearchMatch = isCellDataMatchingSearch(
      item,
      selectedColumns,
      searchInput
    );

    return isSearchMatch;
  });

  function isCellDataMatchingSearch(item, selectedColumns, searchInput) {
    return selectedColumns.some((column) => {
      const cellData =
        column === "begin" || column === "end"
          ? formatTimestamp(item[column])
          : addUnits(column, item);

      return (
        !searchInput ||
        (cellData &&
          cellData.toString().toLowerCase().includes(searchInput.toLowerCase()))
      );
    });
  }

  const slicedFilteredData = filteredData.slice(startIndex, endIndex);

  const excelData = [];
  excelData.push(selectedColumns.map((column) => columnLabels[column]));

  if (!loading) {
    filteredData.forEach((item) => {
      const rowData = selectedColumns.map((column) => {
        return addUnits(column, item);
      });
      excelData.push(rowData);
    });
  }

  const handleChange = (event) => {
    const {
      target: { value },
    } = event;

    setSelectedColumns(value);
  };

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
  };

  const handleDelete = async (id) => {
    try {
      setRowLoading((prev) => ({ ...prev, [id]: true }));
      const response = await axios.delete(`${url}/new-groups/${id}`);
      if (response.status === 200) {
        toast.success(response.data.message);
        setData((prevData) => prevData.filter((item) => item.id !== id));
      } else {
        console.error(
          `Failed to delete group with ID ${id}:`,
          response.data.error
        );
      }
    } catch (error) {
      console.error(`Error deleting group with ID ${id}:`, error);
    } finally {
      setRowLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  useEffect(() => {
    fetchDataFromAPI();
  }, [userId]);
  const fetchDataFromAPI = async () => {
    try {
      setLoading(true);
      const apiUrl = `${url}/new-groups`;
      const [newGroupsResponse, permissionGroupsResponse] = await Promise.all([
        axios.get(apiUrl),
        fetch("/api/groups"),
      ]);

      if (newGroupsResponse.status === 200 && permissionGroupsResponse.ok) {
        const newGroups = newGroupsResponse.data.data;
        const permissionGroups = await permissionGroupsResponse.json();
        const matchedGroups = findMatchingGroups(newGroups, permissionGroups);
        // console.log("matched groups :", matchedGroups);
        // setData(matchedGroups);
        setData(userId === 1 ? newGroups : matchedGroups);
      } else {
        throw new Error("Failed to fetch data from one of the APIs");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const findMatchingGroups = (newGroups, permissionGroups) => {
    return newGroups.filter((newGroup) => {
      return permissionGroups.some(
        (permissionGroup) => permissionGroup.id === newGroup.traccarId
      );
    });
  };

  function handleClickFetchData() {
    const fetchReports = fetchDataFromAPI();

    Promise.all([fetchReports])
      .then((results) => {
        // const [groupsResult, dataResult, apiDataResult] = results;
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput]);

  const PrintComponent = React.forwardRef((props, ref) => (
    <>
      <Table ref={ref}>
        <TableHead>
          <TableRow>
            {selectedColumns.map((column) => (
              <TableCell
                key={column}
                className={column === "actions" ? "text-end" : ""}
              >
                {columnLabels[column]}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading ? (
            filteredData.slice(startIndex, endIndex).map((item) => {
              const canPerformActions = () => {
                const userRole = traccarUser?.superAdmin
                  ? "superAdmin"
                  : traccarUser?.administrator &&
                    !traccarUser?.attributes?.non_admin
                  ? "admin"
                  : traccarUser?.administrator &&
                    traccarUser?.attributes?.non_admin === true
                  ? "supervisor"
                  : null;

                const createdRole = item.created_role || "supervisor";
                console.log(userRole);

                if (userRole === "superAdmin") {
                  return true;
                } else if (userRole === "admin") {
                  return createdRole !== "superAdmin";
                } else if (userRole === "supervisor") {
                  return createdRole === "supervisor";
                }
                return false;
              };
              return (
                <TableRow key={item.id}>
                  {selectedColumns.map((column) => {
                    return (
                      <TableCell
                        key={column}
                        className={column === "actions" ? "text-end" : ""}
                      >
                        {column === "groupId" && item[column] === 0 ? (
                          "Not Defined"
                        ) : column === "actions" ? (
                          canPerformActions() ? (
                            <>
                              <Tooltip title={t("sharedConnections")}>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    navigate(
                                      `/settings/group/${item.traccarId}/connections`
                                    )
                                  }
                                >
                                  <LinkIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t("deviceCommand")}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    navigate(
                                      `/settings/group/${item.traccarId}/command`
                                    );
                                  }}
                                >
                                  <PublishIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t("sharedEdit")}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    navigate(`/settings/new-group/${item.id}`);
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
                            </>
                          ) : (
                            <Tooltip title="You do not have permission to perform actions">
                              <span>
                                <IconButton size="small" disabled>
                                  <BlockIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )
                        ) : (
                          addUnits(column, item)
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
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
      breadcrumbs={["settingsTitle", "settingsGroups"]}
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
          }}
        >
          <Box
            sx={{
              display: "flex",
              //   flexWrap: "wrap",
              gap: 2,
              padding: 2,
            }}
          >
            <FormControl fullWidth>
              <InputLabel id="pagination-select-label">Rows</InputLabel>
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

            <FormControl fullWidth>
              <InputLabel id="columns-select-label">Columns</InputLabel>
              <Select
                labelId="columns-select-label"
                id="columns-select"
                multiple
                value={selectedColumns}
                onChange={handleChange}
                input={<OutlinedInput label="Columns" />}
              >
                {initialColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {columnLabels[column]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              id="outlined-basic"
              label={t("sharedSearch")}
              variant="outlined"
              fullWidth
              value={searchInput}
              onChange={handleSearchChange}
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

      <CollectionFab editPath="/settings/new-group" />
    </PageLayout>
  );
};

export default NewGroupsPage;

{
  /* <div className="box-search-4">
                <CSVLink
                  data={excelData}
                  filename="report.csv"
                  style={{
                    width: "-webkit-fill-available",
                  }}
                >
                  <Button
                    variant="outlined"
                    sx={{
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    Download Excel
                  </Button>
                </CSVLink>
              </div>
              <div className="box-search-4">
                <ReactToPrint
                  style={{
                    width: "100%",
                  }}
                  trigger={() => (
                    <Button
                      variant="outlined"
                      sx={{
                        width: "100%",
                      }}
                    >
                      Print
                    </Button>
                  )}
                  content={() => printComponentRef}
                  documentTitle="New Document"
                  pageStyle="print"
                />
              </div> */
}
