import React, { useState, useEffect } from "react";
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
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useAppContext } from "../AppContext";
import { toast, ToastContainer } from "react-toastify";

const SubservicePrices = () => {
  const { url } = useAppContext();
  // const userId = useSelector((state) => state.session.user.id);
  const userId = 180;
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    locationId: "",
    subservices: [{ subserviceType: null, price: "" }],
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

  const handleOpen = (locationId, subservices = []) => {
    const parsedSubservices = subservices.map((item) => ({
      subserviceType:
        subserviceTypes.find((s) => s.name === item.subserviceType) || null,
      price: item.price || "",
    }));
    setFormData({
      locationId,
      subservices:
        parsedSubservices.length > 0
          ? parsedSubservices
          : [{ subserviceType: null, price: "" }],
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // setFormData({ locationId: "", subserviceType: [], price: "" });
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        userId,
        locationId: formData.locationId,
        subservices: formData.subservices.map((entry) => ({
          subserviceType: entry?.subserviceType?.id,
          price: entry?.price,
        })),
      };

      const response = await axios.post(
        `${url}/dispatch/subservice-prices`,
        payload
      );
      const result = response.data;

      if (result.success) {
        toast.success(result.message, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        const updated = await axios.get(
          `${url}/dispatch/subservices/locations?page=${
            page + 1
          }&userId=${userId}`
        );
        if (updated.data.success) {
          setData(updated.data.data);
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
      <ToastContainer />
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
            {data.map((row) => {
              let ParsedSubservices = row.subservices
                ? JSON.parse(row.subservices)
                : [];

              return (
                <TableRow key={row.id}>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.ring_type}</TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell>{row.province}</TableCell>
                  <TableCell>{row.district}</TableCell>
                  {userId !== 1 && (
                    <>
                      <TableCell>
                        {ParsedSubservices.length > 0
                          ? ParsedSubservices.map((item, index) =>
                              item.subserviceType ? (
                                <Chip
                                  key={index}
                                  label={item.subserviceType}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ) : null
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {ParsedSubservices.length > 0
                          ? ParsedSubservices.map((item, index) =>
                              item.price ? (
                                <Chip
                                  key={index}
                                  label={`$${item.price}`}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5 }}
                                />
                              ) : null
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleOpen(row.id, ParsedSubservices)}
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
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
              width: 500,
              bgcolor: "background.paper",
              boxShadow: 24,
              p: 4,
            }}
          >
            <h2>Edit Subservice Prices</h2>
            {formData.subservices.map((entry, index) => (
              <Box
                key={index}
                display="flex"
                gap={1}
                mb={2}
                alignItems="center"
              >
                <Autocomplete
                  sx={{ flex: 2 }}
                  options={subserviceTypes}
                  getOptionLabel={(option) => option.name}
                  value={entry.subserviceType}
                  onChange={(event, newValue) => {
                    const updated = [...formData.subservices];
                    updated[index].subserviceType = newValue;
                    setFormData({ ...formData, subservices: updated });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Subservice Type" />
                  )}
                />
                <TextField
                  sx={{ flex: 1 }}
                  label="Price"
                  type="number"
                  value={entry.price}
                  onChange={(e) => {
                    const updated = [...formData.subservices];
                    updated[index].price = e.target.value;
                    setFormData({ ...formData, subservices: updated });
                  }}
                />
                {formData.subservices.length > 1 && (
                  <Button
                    onClick={() => {
                      const updated = formData.subservices.filter(
                        (_, i) => i !== index
                      );
                      setFormData({ ...formData, subservices: updated });
                    }}
                    color="error"
                  >
                    Remove
                  </Button>
                )}
              </Box>
            ))}
            <Button
              variant="outlined"
              onClick={() =>
                setFormData({
                  ...formData,
                  subservices: [
                    ...formData.subservices,
                    { subserviceType: null, price: "" },
                  ],
                })
              }
              sx={{ mb: 2 }}
            >
              Add More
            </Button>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="contained" onClick={handleSubmit}>
                Save
              </Button>
              <Button variant="outlined" onClick={handleClose}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Modal>
      )}
    </div>
  );
};

export default SubservicePrices;
