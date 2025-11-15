import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
  TextField,
  Chip,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Swal from "sweetalert2";

import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";
import useSettingsStyles from "@/settings/common/useSettingsStyles";

import {
  getAllDeviceAssignments,
  createDeviceAssignment,
  deleteDeviceAssignment,
} from "@/apis/deviceAssignmentApi";

export default function AssignDeviceToParent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const classes = useSettingsStyles();

  const parentId = Number(searchParams.get("parent"));
  const user = useSelector((state) => state.session.user);

  const [devices, setDevices] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH DEVICES + ASSIGNMENTS ---------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const assignmentList = await getAllDeviceAssignments();
        setAssignments(assignmentList);

        // Build unique devices list
        const uniqueDevices = [
          ...new Map(
            assignmentList.map((item) => [
              item.device_id,
              {
                id: item.device_id,
                name: item.device_name,
                flespi: item.flespi_device_id,
              },
            ])
          ).values(),
        ];

        setDevices(uniqueDevices);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load devices", "error");
      }
      setLoading(false);
    };

    load();
  }, []);

  /* ---------------- ASSIGN DEVICE ---------------- */
  const handleAssign = async (deviceId) => {
    try {
      const already = assignments.some(
        (a) => a.device_id === deviceId && a.operation_id === parentId
      );

      if (already) {
        return Swal.fire({
          icon: "warning",
          title: "Already Assigned",
          text: "This device is already assigned to this operation.",
        });
      }

      await createDeviceAssignment({
        device_id: deviceId,
        operation_id: parentId,
        zone_id: parentId,
      });

      Swal.fire({
        icon: "success",
        title: "Assigned",
        text: "Device assigned successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      // Add to assignment list locally
      setAssignments((prev) => [
        ...prev,
        {
          device_id: deviceId,
          operation_id: parentId,
        },
      ]);
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Could not assign device", "error");
    }
  };

  /* ---------------- REMOVE / UNASSIGN DEVICE ---------------- */
  const handleRemove = async (deviceId) => {
    try {
      const confirm = await Swal.fire({
        icon: "warning",
        title: "Remove Device?",
        text: "This will unassign the device from this operation.",
        showCancelButton: true,
        confirmButtonText: "Yes, remove",
      });

      if (!confirm.isConfirmed) return;

      await deleteDeviceAssignment({
        device_id: deviceId,
        zone_id: parentId,
      });

      Swal.fire({
        icon: "success",
        title: "Removed",
        text: "Device unassigned successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      // Update state immediately
      setAssignments((prev) =>
        prev.filter(
          (a) =>
            !(
              a.device_id === deviceId &&
              a.operation_id === parentId
            )
        )
      );
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to remove assignment", "error");
    }
  };

  /* ---------------- SEARCH FILTER ---------------- */
  const filteredDevices = devices.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <PageLayout
        menu={<OperationsMenu />}
        breadcrumbs={["Operations", "Assign Device"]}
      >
        <Container maxWidth="xl" className={classes.container}>
          <Typography>Loading devices...</Typography>
        </Container>
      </PageLayout>
    );

  /* ---------------- UI ---------------- */
  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Assign Device"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => navigate(-1)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>

              <Typography variant="subtitle1">
                Assign Device to Operation #{parentId}
              </Typography>
            </div>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            {/* SEARCH BOX */}
            <TextField
              fullWidth
              placeholder="Search device by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ marginBottom: 3 }}
            />

            {/* DEVICE LIST */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredDevices.length === 0 && (
                <Typography>No devices found.</Typography>
              )}

              {filteredDevices.map((dev) => {
                const already = assignments.some(
                  (a) =>
                    a.device_id === dev.id &&
                    a.operation_id === parentId
                );

                return (
                  <div
                    key={dev.id}
                    style={{
                      padding: 16,
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 15 }}>{dev.name}</strong>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        Flespi ID: {dev.flespi}
                      </div>
                    </div>

                    {/* REMOVE button if already assigned */}
                    {already ? (
                      <button
                        onClick={() => handleRemove(dev.id)}
                        style={{
                          background: "#c62828",
                          color: "white",
                          border: "none",
                          padding: "8px 18px",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAssign(dev.id)}
                        style={{
                          background: "#1976d2",
                          color: "white",
                          border: "none",
                          padding: "8px 18px",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
}
