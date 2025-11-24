// src/operations/wizard/Step6AssignDevices.jsx
import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
  TextField,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Swal from "sweetalert2";

import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";
import useSettingsStyles from "@/settings/common/useSettingsStyles";

import { getAllDeviceAssignments } from "@/apis/deviceAssignmentApi";
import { useWizard } from "./WizardContext";

export default function Step6AssignDevices({ goNext, goPrev }) {
  const classes = useSettingsStyles();
  const { operation, assignedDevices, setAssignedDevices } = useWizard();

  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const assignmentList = await getAllDeviceAssignments();

        // Use assignment list just to discover devices
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

  const toggleDevice = (deviceId) => {
    setAssignedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleNext = () => {
    // You could enforce at least one device if you want
    // if (assignedDevices.length === 0) { ... }

    Swal.fire({
      icon: "success",
      title: "Assign Devices",
      text: "Device selection data saved successfully.",
      timer: 1000,
      showConfirmButton: false,
    });

    goNext("assign-devices");
  };

  const filteredDevices = devices.filter((d) =>
    d.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <PageLayout
        menu={<OperationsMenu />}
        breadcrumbs={["Operations", "Assign Devices (Step 6/7)"]}
      >
        <Container maxWidth="xl" className={classes.container}>
          <Typography>Loading devices...</Typography>
        </Container>
      </PageLayout>
    );

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Assign Devices (Step 6/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => goPrev("assign-devices")}
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
                Assign Devices to Operation: {operation?.name || "(no name)"}
              </Typography>
            </div>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            <TextField
              fullWidth
              placeholder="Search device by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ marginBottom: 3 }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredDevices.length === 0 && (
                <Typography>No devices found.</Typography>
              )}

              {filteredDevices.map((dev) => {
                const selected = assignedDevices.includes(dev.id);

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
                      onClick={() => toggleDevice(dev.id)}
                      style={{
                        background: selected ? "#c62828" : "#1976d2",
                        color: "white",
                        border: "none",
                        padding: "8px 18px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {selected ? "Remove" : "Assign"}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleNext}
              style={{
                marginTop: 30,
                padding: "10px 20px",
                background: "#1976d2",
                color: "white",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              Next
            </button>
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
}
