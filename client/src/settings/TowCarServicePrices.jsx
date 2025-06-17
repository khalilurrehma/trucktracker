import { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Chip,
  Modal,
  Box,
  TextField,
  Grid,
  Typography,
  IconButton,
  FormControl,
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import EditIcon from "@mui/icons-material/Edit";
import { useAppContext } from "../AppContext";

const TowcarServicePrices = () => {
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
    providers: [{ provider: "", price: "", providerId: "" }],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${url}/dispatch/towcarservice/locations?page=${
            page + 1
          }&userId=${userId}`
        );
        const result = response.data;
        if (result.success) {
          setData(result.data);
          setTotal(result.total);
        }
      } catch (error) {
        console.error("Error fetching towcar service data:", error);
      }
    };
    fetchData();
  }, [page, userId]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleOpen = (locationId, providers = []) => {
    setFormData({
      locationId,
      providers: providers.length
        ? providers
        : [{ provider: "", price: "", providerId: "" }],
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      locationId: "",
      providers: [{ provider: "", price: "", providerId: "" }],
    });
  };

  const handleAddProvider = () => {
    setFormData({
      ...formData,
      providers: [
        ...formData.providers,
        { provider: "", price: "", providerId: "" },
      ],
    });
  };

  const handleRemoveProvider = (index) => {
    const updatedProviders = formData.providers.filter((_, i) => i !== index);
    setFormData({ ...formData, providers: updatedProviders });
  };

  const handleChangeProvider = (e, index) => {
    const updatedProviders = [...formData.providers];
    updatedProviders[index][e.target.name] = e.target.value;
    setFormData({ ...formData, providers: updatedProviders });
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post(`${url}/dispatch/towcarservice/price`, {
        userId,
        ...formData,
      });

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
        const updatedResponse = await axios.get(
          `${url}/dispatch/towcarservice/locations?page=${
            page + 1
          }&userId=${userId}`
        );
        const updatedResult = updatedResponse.data;
        if (updatedResult.success) {
          setData(updatedResult.data);
        }
        handleClose();
      } else {
        console.error("Failed to save price:", result.message);
      }
    } catch (error) {
      console.error("Error saving price:", error);
    }
  };

  const handleEditSubmit = async () => {
    try {
      const response = await axios.put(`${url}/dispatch/towcarservice/price`, {
        userId,
        locationId: formData.locationId,
        providers: formData.providers,
      });

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
        const updatedResponse = await axios.get(
          `${url}/dispatch/towcarservice/locations?page=${
            page + 1
          }&userId=${userId}`
        );
        const updatedResult = updatedResponse.data;
        if (updatedResult.success) {
          setData(updatedResult.data);
        }
        handleClose();
      } else {
        console.error("Failed to update price:", result.message);
      }
    } catch (error) {
      console.error("Error updating price:", error);
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
                  <TableCell>Provider</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Action</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              let parsedProviders = row.providers
                ? JSON.parse(row.providers)
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
                        {parsedProviders
                          .map((p) => (p.provider ? `${p.provider}` : ""))
                          .join(", ")}
                      </TableCell>
                      <TableCell>
                        {parsedProviders
                          .map((p) => (p.price ? `$${p.price}` : ""))
                          .join(", ")}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleOpen(row.id, parsedProviders)}
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
              p: 3,
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              Add/Edit Tow Car Service Price
            </Typography>

            <Grid container spacing={2}>
              {formData.providers.map((providerData, index) => (
                <Grid item xs={12} key={index}>
                  <TextField
                    label="Provider"
                    name="provider"
                    value={providerData.provider}
                    onChange={(e) => handleChangeProvider(e, index)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Price"
                    name="price"
                    value={providerData.price}
                    onChange={(e) => handleChangeProvider(e, index)}
                    fullWidth
                    sx={{ mb: 2 }}
                    type="number"
                  />
                  {formData.providers.length > 1 && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleRemoveProvider(index)}
                    >
                      Remove
                    </Button>
                  )}
                </Grid>
              ))}
            </Grid>

            <Button
              variant="outlined"
              color="secondary"
              sx={{ mt: 2 }}
              onClick={handleAddProvider}
            >
              Add More
            </Button>

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={
                    formData.providers[0].providerId
                      ? handleEditSubmit
                      : handleSubmit
                  }
                >
                  {formData.providers[0].providerId ? "Update" : "Save"}
                </Button>
              </Grid>

              <Grid item xs={6}>
                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Modal>
      )}
    </div>
  );
};

export default TowcarServicePrices;
