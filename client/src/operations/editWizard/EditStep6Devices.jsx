// src/operations/editWizard/EditStep6Devices.jsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Swal from "sweetalert2";

import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";
import useSettingsStyles from "@/settings/common/useSettingsStyles";

import { getAllDeviceAssignments } from "@/apis/deviceAssignmentApi";
import { useEditWizard } from "./EditWizardContext";
import { useSearchParams } from "react-router-dom";

export default function EditStep6Devices({ goNext, goPrev }) {
  const classes = useSettingsStyles();
  const { operation, assignedDevices, setAssignedDevices } = useEditWizard();

  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /* ----------------- LOAD ALL DEVICES FROM ASSIGNMENT TABLE ----------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const allAssignments = await getAllDeviceAssignments();

        const uniqueDevices = [
          ...new Map(
            allAssignments.map((item) => [
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
        setLoading(false);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load devices", "error");
      }
    };

    load();
  }, []);

  if (loading) return <p style={{ padding: 20 }}>Loading devices…</p>;

  /* ----------------- FILTER DEVICES ----------------- */
  const filtered = devices.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ----------------- TOGGLE ASSIGNMENT ----------------- */
  const toggleAssign = (deviceId) => {
    if (assignedDevices.includes(deviceId)) {
      // remove
      setAssignedDevices((prev) => prev.filter((id) => id !== deviceId));
    } else {
      // add
      setAssignedDevices((prev) => [...prev, deviceId]);
    }
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Edit Assign Devices (Step 6/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Assign Devices to Operation: {operation?.name}
            </Typography>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            {/* Search */}
            <TextField
              fullWidth
              placeholder="Search device by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ marginBottom: 3 }}
            />

            {/* Devices */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filtered.length === 0 && <Typography>No devices found.</Typography>}

              {filtered.map((dev) => {
                const already = assignedDevices.includes(dev.id);

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

                    <button
                      onClick={() => toggleAssign(dev.id)}
                      style={{
                        background: already ? "#c62828" : "#1976d2",
                        color: "white",
                        border: "none",
                        padding: "8px 18px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {already ? "Remove" : "Assign"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
              <button
                onClick={() => goPrev("devices")}
                style={{
                  padding: "10px 20px",
                  background: "#444",
                  color: "white",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Back
              </button>

              <button
                onClick={() => goNext("devices")}
                style={{
                  padding: "10px 20px",
                  background: "#1976d2",
                  color: "white",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Next
              </button>
            </div>
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
}
