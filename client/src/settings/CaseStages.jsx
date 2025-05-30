import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAppContext } from "../AppContext";
import axios from "axios";

import {
  Container,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  CircularProgress,
  Paper,
  Snackbar,
  Alert,
  Box,
} from "@mui/material";

const CaseStages = () => {
  const { url } = useAppContext();
  const userId = useSelector((state) => state.session.user.id);
  const isSuperAdmin = userId === 1;

  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const fetchFromApi = async () => {
    try {
      setLoading(true);
      const res = isSuperAdmin
        ? await axios.get(`${url}/dispatch/process/template`)
        : await axios.get(`${url}/dispatch/process/template/admin/${userId}`);
      setStages(res.data.message || []);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to fetch case stages",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (index, value) => {
    const updated = [...stages];
    updated[index].time_sec = value;
    setStages(updated);
  };

  const saveOverride = async (stageKey, timeSec) => {
    try {
      await axios.post(`${url}/dispatch/process/template/override`, {
        adminId: userId,
        stage_key: stageKey,
        custom_time_sec: Number(timeSec),
      });
      setSnackbar({
        open: true,
        message: "Saved successfully!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to save", severity: "error" });
    }
  };

  useEffect(() => {
    fetchFromApi();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {loading ? (
        <CircularProgress />
      ) : (
        <Box>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Stage</strong>
                </TableCell>
                <TableCell>
                  <strong>Time (sec)</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stages.map((stage, i) => (
                <TableRow key={stage.stage_key}>
                  <TableCell>{stage.label}</TableCell>
                  <TableCell>
                    {isSuperAdmin ? (
                      stage.time_sec
                    ) : (
                      <TextField
                        type="number"
                        variant="outlined"
                        size="small"
                        value={stage.time_sec}
                        onChange={(e) => handleTimeChange(i, e.target.value)}
                        onBlur={() =>
                          saveOverride(stage.stage_key, stage.time_sec)
                        }
                        sx={{ width: 100 }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default CaseStages;
