import React, { useEffect, useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  TableContainer,
  TablePagination,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import { fetchAllDriversWithAssociatedVehicles } from "../apis/api";
import TableShimmer from "../common/components/TableShimmer";
import { useTranslation } from "../common/components/LocalizationProvider";
import { unassignDriverFromVehicle } from "../apis/api";

const DriversAssociatedTable = () => {
  const t = useTranslation();

  const [page, setPage] = useState(0); // TablePagination is 0-based
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const fetchData = async (
    pageNum = page,
    limit = rowsPerPage,
    searchText = ""
  ) => {
    setLoading(true);
    try {
      const response = await fetchAllDriversWithAssociatedVehicles(
        pageNum + 1,
        limit,
        searchText
      );
      setData(Array.isArray(response.message) ? response.message : []);
      setTotalCount(response.total || 0);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, rowsPerPage);
  }, [page, rowsPerPage]);

  const handleUnassign = async (driverId, deviceId) => {
    if (!window.confirm("Are you sure you want to unassign this driver?"))
      return;
    try {
      const res = await unassignDriverFromVehicle(driverId, deviceId);
      setSnackbar({
        open: true,
        message: res.message,
        severity: "success",
      });
      fetchData(page, rowsPerPage, search);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to unassign driver",
        severity: "error",
      });
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "driversAssociatedVehicles"]}
    >
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          gap: "16px",
          padding: "10px",
          marginTop: "15px",
        }}
      >
        <TextField
          label={t("sharedSearch")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
        />
        <Button
          variant="contained"
          onClick={() => fetchData(page, rowsPerPage, search)}
        >
          Search
        </Button>
      </div>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>*</TableCell>
              <TableCell>{t("reportDriverID")}</TableCell>
              <TableCell>{t("sharedDriverName")}</TableCell>
              <TableCell>{t("reportDeviceID")}</TableCell>
              <TableCell>{t("reportDeviceName")}</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableShimmer columns={6} />
            ) : data.length > 0 ? (
              data
                .filter(
                  (item) =>
                    item.driver_id?.toString().includes(search) ||
                    item.driver_name
                      ?.toLowerCase()
                      .includes(search.toLowerCase()) ||
                    item.device_name
                      ?.toLowerCase()
                      .includes(search.toLowerCase())
                )
                .map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>{item.driver_id}</TableCell>
                    <TableCell>{item.driver_name}</TableCell>
                    <TableCell>{item.device_id ?? "—"}</TableCell>
                    <TableCell>{item.device_name ?? "—"}</TableCell>
                    <TableCell>
                      {item.device_id ? (
                        <Button
                          color="error"
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            handleUnassign(item.driver_id, item.device_id)
                          }
                        >
                          Unassign
                        </Button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      <CollectionFab editPath="/settings/new-driver-association" />

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
};

export default DriversAssociatedTable;
