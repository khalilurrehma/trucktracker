import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TablePagination,
  CircularProgress,
  Box,
  TextField,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import axios from "axios";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";

const columns = [
  { id: "device_name", label: "Device Name" },
  { id: "backup_date", label: "Backup Date" },
  { id: "file_name", label: "File Name" },
  { id: "file_url", label: "Download" },
];

const SnapshotsPage = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const userId = useSelector((state) => state.session.user.id);

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async (page, pageSize, search = "") => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${url}/devices/snapshots/${userId}?page=${
          page + 1
        }&limit=${pageSize}&search=${search}`
      );
      setRows(data.snapshots);
      setRowCount(data.total);
    } catch (err) {
      setRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, pageSize, search);
    // eslint-disable-next-line
  }, [page, pageSize, userId, search]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Snapshots"]}
    >
      <Box sx={{ p: 2 }}>
        <TextField
          sx={{ width: "30%", mb: 2 }}
          placeholder="Search device or file name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    No data found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow hover key={row.id}>
                    <TableCell>{row.device_name}</TableCell>
                    <TableCell>
                      {row.backup_date
                        ? dayjs(row.backup_date).format("dddd, YYYY-MM-DD")
                        : ""}
                    </TableCell>
                    <TableCell>{row.file_name}</TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        href={row.file_url}
                        target="_blank"
                        rel="noopener"
                        size="small"
                        disabled={!row.file_url}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={rowCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Box>
    </PageLayout>
  );
};

export default SnapshotsPage;
