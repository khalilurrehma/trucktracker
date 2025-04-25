import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "./components/ReportsMenu";
import { toast, ToastContainer } from "react-toastify";
import {
  fetchControlUsageReports,
  fetchControlUsageReportsByUserId,
} from "../apis/api";
import {
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
} from "@mui/material";
import { useAppContext } from "../AppContext";
import { useSelector } from "react-redux";
import { useTranslation } from "../common/components/LocalizationProvider";

const UsageControlReport = () => {
  const { traccarUser } = useAppContext();
  const t = useTranslation();
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredReports, setFilteredReports] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const userId = useSelector((state) => state.session.user?.id);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [searchQuery, reports]);

  const fetchReports = async () => {
    try {
      const reportsData = traccarUser?.superAdmin
        ? await fetchControlUsageReports()
        : await fetchControlUsageReportsByUserId(userId);

      setReports(reportsData);
    } catch (error) {
      toast.error("Failed to fetch reports");
    }
  };

  const filterReports = () => {
    const filtered = reports.filter((report) =>
      report.device_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredReports(filtered);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs={["reportTitle", "reportNewCase"]}
    >
      <ToastContainer />

      <TextField
        label={t("sharedSearchDevice")}
        variant="outlined"
        value={searchQuery}
        onChange={handleSearchChange}
        margin="normal"
        sx={{ marginLeft: 2, width: "30%" }}
      />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Report ID</TableCell>
              <TableCell>Log Timestamp</TableCell>
              <TableCell>Device Name</TableCell>
              <TableCell>Shift Name</TableCell>
              <TableCell>Commands</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell>Manual Control</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Auth Location</TableCell>
              <TableCell>Complied</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReports
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((report) => (
                <TableRow key={report.report_id}>
                  <TableCell>{report.report_id}</TableCell>
                  <TableCell>
                    {new Date(report.log_timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>{report.device_name}</TableCell>
                  <TableCell>{report.shift_name}</TableCell>
                  <TableCell>{report.commands}</TableCell>
                  <TableCell>{report.driver_name}</TableCell>
                  <TableCell>{report.manual_control ? "YES" : "NO"}</TableCell>
                  <TableCell>{report.action_reason}</TableCell>
                  <TableCell>{report.auth_location}</TableCell>
                  <TableCell>{report.complied}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredReports.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      /> */}
    </PageLayout>
  );
};

export default UsageControlReport;
