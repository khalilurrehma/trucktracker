import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Modal,
  Box,
  TextField,
  FormControl,
  Autocomplete,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAppContext } from "../AppContext";

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
    subserviceType: [],
    price: "",
  });
  const [subserviceTypes, setSubserviceTypes] = useState([]);

  const fetchSubserviceTypes = async () => {
    try {
      const response = await axios.get(
        `${url}/service-type/subservices/user/${userId}`
      );
      const result = response.data;
      if (result.status) {
        setSubserviceTypes(result.message);
      } else {
        console.error("Failed to fetch subservice types:", result.message);
      }
    } catch (error) {
      console.error("Error fetching subservice types:", error);
    }
  };

  useEffect(() => {
    fetchSubserviceTypes();
  }, [userId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${url}/dispatch/subservices/locations?page=${
            page + 1
          }&userId=${userId}`
        );
        const result = response.data;

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

  const handleOpen = (locationId, subserviceType, price) => {
    const selectedSubservices = subserviceType
      ? subserviceType.split(",").map((name) => {
          const found = subserviceTypes.find(
            (type) => type.name === name.trim()
          );
          return found || { id: null, name: name.trim() };
        })
      : [];
    const selectedPrice = price ? price.split(",")[0] : "";
    setFormData({
      locationId,
      subserviceType: selectedSubservices,
      price: selectedPrice,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({ locationId: "", subserviceType: [], price: "" });
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post(`${url}/dispatch/subservice-prices`, {
        userId,
        ...formData,
        subserviceType: formData.subserviceType.map((type) => type.id),
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
                    <TableCell>
                      {row.subservice_type
                        ? row.subservice_type
                            .split(",")
                            .map((type, index) => (
                              <Chip
                                key={index}
                                label={type.trim()}
                                size="small"
                                sx={{ marginRight: 0.5, marginBottom: 0.5 }}
                              />
                            ))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {row.price
                        ? row.price
                            .split(",")
                            .map((price, index) => (
                              <Chip
                                key={index}
                                label={`$${price.trim()}`}
                                size="small"
                                sx={{ marginRight: 0.5, marginBottom: 0.5 }}
                              />
                            ))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() =>
                          handleOpen(row.id, row.subservice_type, row.price)
                        }
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
            <h2>Add/Edit Subservice Price</h2>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <Autocomplete
                multiple
                id="subservice-type"
                options={subserviceTypes}
                getOptionLabel={(option) => option.name}
                value={formData.subserviceType}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, subserviceType: newValue });
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Subservice Type" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option.name} {...getTagProps({ index })} />
                  ))
                }
              />
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
