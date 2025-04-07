import React, { useEffect, useRef, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import ReportsMenu from "../reports/components/ReportsMenu";
import { useParams } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TablePagination,
  Button,
} from "@mui/material";
import axios from "axios";
import { useAppContext } from "../AppContext";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

const CustomCalcReports = () => {
  const url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;
  const { calcId, calcName } = useParams();
  const printRef = useRef(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (selectedDate) {
      const beginTimestamp = Math.floor(
        new Date(selectedDate).setHours(0, 0, 0, 0) / 1000
      );
      const endTimestamp = Math.floor(
        new Date(selectedDate).setHours(23, 59, 59, 999) / 1000
      );
      console.log(beginTimestamp);
      console.log(endTimestamp);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (calcId) {
      fetchFromApi();
    }
  }, [calcId]);

  const fetchFromApi = async () => {
    try {
      const { data } = await axios.get(
        `${url}/custom/calc/device/report/${calcId}`
      );
      setData(data.message.result);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data.length > 0) {
      setColumns(Object.keys(data[0]));
    }
  }, [data]);

  useEffect(() => {
    if (columns.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(columns);
    }
  }, [columns]);

  const filteredData = data?.filter(
    (row) =>
      !searchQuery ||
      row["device.name"]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "report.xlsx");
  };

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
  };

  return (
    <PageLayout
      menu={<ReportsMenu />}
      breadcrumbs2={["reportTitle", `Custom - ${calcName}`]}
    >
      <div
        style={{
          display: "flex",
          gap: "20px",
          padding: "30px",
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Select Date"
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            disableFuture
            maxDate={new Date(new Date().setDate(new Date().getDate() - 1))}
            renderInput={(params) => (
              <TextField {...params} size="small" sx={{ width: "30%" }} />
            )}
          />
        </LocalizationProvider>

        <TextField
          label="Search Device"
          variant="outlined"
          size="small"
          sx={{ width: "30%" }}
          //   value={searchQuery}
          //   onChange={(e) => setSearchQuery(e.target.value)}
        />

        <Button
          variant="outlined"
          //   onClick={handleExportExcel}
          sx={{ width: "20%" }}
        >
          Download Excel
        </Button>
        <Button
          variant="outlined"
          // onClick={handlePrint}
        >
          Print
        </Button>
        <Button
          variant="contained"
          //   onClick={() => fetchCalculatorReport(reportId, traccarUser.id)}
          sx={{ width: "15%" }}
          // onClick={traccarDeviceIds}
        >
          Fetch Data
        </Button>
      </div>
      <TableContainer sx={{ mt: 3, p: 2 }}>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : data.length === 0 ? (
          <Typography>No reports found</Typography>
        ) : (
          <>
            <div ref={printRef}>
              <Table>
                <TableHead>
                  <TableRow>
                    {selectedColumns.map((col) => (
                      <TableCell key={col}>{col}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => (
                      <TableRow key={index}>
                        {selectedColumns.map((col) => (
                          <TableCell key={col}>
                            {row[col] === undefined || row[col]?.length === 0
                              ? "N/A"
                              : typeof row[col] === "object" &&
                                row[col] !== null
                              ? JSON.stringify(row[col])
                              : row[col]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </>
        )}
      </TableContainer>
    </PageLayout>
  );
};

export default CustomCalcReports;
