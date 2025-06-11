import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../../AppContext";

const SuggestedServicesModal = ({
  open,
  onClose,
  caseId,
  caseName,
  services,
}) => {
  const { url } = useAppContext();

  const [loading, setLoading] = useState({});

  const handleAction = async (serviceId, action) => {
    setLoading((prev) => ({ ...prev, [serviceId]: true }));
    try {
      const { data } = await axios.patch(
        `${url}/dispatch/service-approvals/${serviceId}?action=${action}`
      );
      if (data.status) {
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(`Failed to ${action} service: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [serviceId]: false }));
    }
  };

  return (
    <>
      <ToastContainer />
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Pending Suggested Services for Case: {caseName} (ID: {caseId})
        </DialogTitle>
        <DialogContent>
          {services.length === 0 ? (
            <Typography>No pending services found.</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Service Name</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      {service.suggested_services.join(", ") || "N/A"}
                    </TableCell>
                    <TableCell>{service.driver_name || "N/A"}</TableCell>
                    <TableCell>{service.status || "Pending"}</TableCell>
                    <TableCell>
                      <IconButton
                        color="success"
                        onClick={() => handleAction(service.id, "approved")}
                        disabled={loading[service.id]}
                      >
                        {loading[service.id] ? (
                          <CircularProgress size={24} />
                        ) : (
                          <CheckCircleIcon />
                        )}
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleAction(service.id, "rejected")}
                        disabled={loading[service.id]}
                      >
                        {loading[service.id] ? (
                          <CircularProgress size={24} />
                        ) : (
                          <CancelIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SuggestedServicesModal;
