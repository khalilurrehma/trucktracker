import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Button,
  Modal,
  Box,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAppContext } from "../AppContext";
import axios from "axios";

const SubservicePrices = () => {
  const { url } = useAppContext();
  const userId = useSelector((state) => state.session.user.id);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    locationId: "",
    subserviceType: "",
    price: "",
  });

  // Fake subservice types
  const subserviceTypes = ["Service A", "Service B", "Service C", "Service D"];

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${url}/dispatch/subservices/locations?page=${
            page + 1
          }&userId=${userId}`
        );
        const result = response.data;
        console.log(result);

        if (result.success) {
          setData(result.data);
          setTotal(result.total);
        } else {
          console.error("Failed to fetch data:", result.message);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [page, userId]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleOpen = (locationId) => {
    setFormData({ ...formData, locationId });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ locationId: "", subserviceType: "", price: "" });
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post(`${url}/dispatch/subservice-prices`, {
        userId,
        ...formData,
      });
      const result = response.data;
      if (result.success) {
        const updatedResponse = await axios.get(
          `${url}/dispatch/subservices/locations?page=${
            page + 1
          }&userId=${userId}`
        );
        const updatedResult = updatedResponse.data;
        if (updatedResult.success) {
          setData(updatedResult.data);
        }
        handleClose();
      } else {
        console.error("Failed to save subservice:", result.message);
      }
    } catch (error) {
      console.error("Error saving subservice:", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Ring Type</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>District</TableCell>
              {userId !== 1 && (
                <>
                  <TableCell>Subservice Type</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Action</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.ring_type}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>{row.province}</TableCell>
                <TableCell>{row.district}</TableCell>
                {userId !== 1 && (
                  <>
                    <TableCell>{row.subservice_type || "-"}</TableCell>
                    <TableCell>{row.price ? `$${row.price}` : "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpen(row.id)}
                      >
                        Add
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[20]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
        />
      </TableContainer>

      {userId !== 1 && (
        <Modal open={open} onClose={handleClose}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 400,
              bgcolor: "background.paper",
              boxShadow: 24,
              p: 4,
            }}
          >
            <h2>Add Subservice Price</h2>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Subservice Type</InputLabel>
              <Select
                value={formData.subserviceType}
                onChange={(e) =>
                  setFormData({ ...formData, subserviceType: e.target.value })
                }
              >
                {subserviceTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <Button variant="contained" onClick={handleSubmit}>
              Save
            </Button>
            <Button variant="outlined" onClick={handleClose} sx={{ ml: 2 }}>
              Cancel
            </Button>
          </Box>
        </Modal>
      )}
    </div>
  );
};

export default SubservicePrices;
