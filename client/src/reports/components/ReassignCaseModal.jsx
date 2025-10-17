import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import { getUnassignedDrivers, reassignCase } from "../../apis/api";

const ReassignCaseModal = ({ open, onClose, caseDetails, onReassign }) => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDrivers();
    }
  }, [open]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await getUnassignedDrivers();
      if (res.status && Array.isArray(res.data)) {
        setDrivers(res.data);
      } else {
        setDrivers([]);
      }
    } catch (error) {
      console.error("Error fetching unassigned drivers:", error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDriver) return;

    try {
      const driver = drivers.find((d) => d.driver_id === selectedDriver);

      // ✅ use API helper
      const result = await reassignCase(
        caseDetails.id,
        driver.driver_id,
        driver.device_id
      );

      if (onReassign) {
        onReassign(caseDetails.id, driver.driver_id, result?.newCaseId);
      }

      onClose();
    } catch (err) {
      console.error("Error reassigning case:", err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reassign Case</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Case: <strong>{caseDetails?.name}</strong>
        </Typography>

        {loading ? (
          <CircularProgress size={28} />
        ) : (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="driver-select-label">Select New Advisor</InputLabel>
            <Select
              labelId="driver-select-label"
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              {drivers.length === 0 ? (
                <MenuItem disabled>No available advisors</MenuItem>
              ) : (
                drivers.map((driver) => (
                  <MenuItem key={driver.driver_id} value={driver.driver_id}>
                    {driver.driver_name || `Driver #${driver.driver_id}`}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedDriver}
        >
          Reassign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReassignCaseModal;
