import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Box,
} from "@mui/material";
import axios from "axios";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import { useAppContext } from "../AppContext";

const Subprocess = () => {
  const { url } = useAppContext();
  const [caseName, setCaseName] = useState("");

  const handleSearch = async () => {
    try {
      const res = await axios.get(`${url}/dispatch/case/search`, {
        params: { name: caseName },
      });
      const caseId = res.data?.case?.id;
      if (caseId) {
        const trackingRes = await axios.get(
          `${url}/dispatch/case/${caseId}/tracking`
        );
        setTrackingData(trackingRes.data);
      }
    } catch (err) {
      console.error("Error fetching tracking", err);
    }
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs2={["Operations", "Track Subprocesses"]}
    >
      <Box display="flex" gap={2} p={2}>
        <TextField
          label="Enter Case Name"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
          sx={{ width: "40%" }}
        />
        <Button variant="contained" onClick={handleSearch}>
          Search
        </Button>
      </Box>
    </PageLayout>
  );
};

export default Subprocess;
