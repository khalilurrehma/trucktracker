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
  Chip,
} from "@mui/material";
import axios from "axios";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../AppContext";

const Subprocess = () => {
  const { url, subproccessEvents } = useAppContext();
  const [caseName, setCaseName] = useState("");
  const [trackingData, setTrackingData] = useState([]);

  const getStatusChip = (status) => {
    switch (status) {
      case "pending":
        return (
          <Chip
            label="Pending"
            sx={{
              backgroundColor: "#FFF3E0",
              color: "#EF6C00",
              fontWeight: 500,
            }}
          />
        );
      case "sent":
        return (
          <Chip
            label="Sent"
            sx={{
              backgroundColor: "#E3F2FD",
              color: "#1565C0",
              fontWeight: 500,
            }}
          />
        );
      case "delayed":
        return (
          <Chip
            label={`Delayed`}
            sx={{
              backgroundColor: "#FFEBEE",
              color: "#C62828",
              fontWeight: 500,
            }}
          />
        );
      case "accepted":
        return (
          <Chip
            label="Accepted"
            sx={{
              backgroundColor: "#E8F5E9",
              color: "#2E7D32",
              fontWeight: 500,
            }}
          />
        );
      case "rejected":
        return (
          <Chip
            label="Rejected"
            sx={{
              backgroundColor: "#FFCDD2",
              color: "#B71C1C",
              fontWeight: 500,
            }}
          />
        );
      case "on the way":
        return (
          <Chip
            label="On the way"
            sx={{
              backgroundColor: "#E1F5FE",
              color: "#0277BD",
              fontWeight: 500,
            }}
          />
        );
      case "confirmed":
        return (
          <Chip
            label="Confirmed"
            sx={{
              backgroundColor: "#F1F8E9",
              color: "#33691E",
              fontWeight: 500,
            }}
          />
        );
      case "approved":
        return (
          <Chip
            label="Approved"
            sx={{
              backgroundColor: "#E8F5E9",
              color: "#1B5E20",
              fontWeight: 500,
            }}
          />
        );
      default:
        return (
          <Chip
            label="Unknown"
            sx={{
              backgroundColor: "#ECEFF1",
              color: "#37474F",
              fontWeight: 500,
            }}
          />
        );
    }
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(
        `${url}/dispatch/case/search?name=${caseName}`
      );
      const caseId = res.data?.case?.id;

      if (caseId) {
        const trackingRes = await axios.get(
          `${url}/dispatch/case/${caseId}/tracking`
        );

        if (trackingRes.data.status) {
          setTrackingData(trackingRes.data.case);
          toast.success(trackingRes.data.message);
        }
      } else {
        toast.error("Case not found.");
      }
    } catch (err) {
      console.error("Error fetching tracking", err);
      toast.error("Error fetching tracking data.");
    }
  };

  console.log(subproccessEvents);

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs2={["Operations", "Track Subprocesses"]}
    >
      <ToastContainer />
      <Box display="flex" gap={2} p={2} justifyContent={"center"}>
        <TextField
          label="Enter Case Name"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
          sx={{ width: "50%" }}
        />
        <Button variant="outlined" onClick={handleSearch}>
          Search
        </Button>
      </Box>

      {trackingData.length > 0 && (
        <Box sx={{ p: 2, mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Stage Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trackingData.map((item) => {
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.stage_name}</TableCell>
                    <TableCell>{getStatusChip(item.status)}</TableCell>
                    <TableCell>
                      {item.start_time
                        ? new Date(item.start_time).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.end_time
                        ? new Date(item.end_time).toLocaleString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </PageLayout>
  );
};

export default Subprocess;
