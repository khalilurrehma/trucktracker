// src/operations/wizard/Step7Finalize.jsx
import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";
import useSettingsStyles from "@/settings/common/useSettingsStyles";

import { useWizard } from "./WizardContext";

import { createOperation } from "@/apis/operationApi";
import { createZone } from "@/apis/zoneApi";
import { createDeviceAssignment } from "@/apis/deviceAssignmentApi";

export default function Step7Finalize({ goPrev }) {
  const classes = useSettingsStyles();
  const {
    operation,
    queueZone,
    loadPadZone,
    dumpZone,
    zoneArea,
    assignedDevices,
  } = useWizard();

  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const handleSubmitAll = async () => {
    if (!operation) {
      return Swal.fire("Missing data", "Operation data not found.", "error");
    }
    if (!queueZone || !loadPadZone || !dumpZone || !zoneArea) {
      return Swal.fire("Missing data", "Some zones are missing.", "error");
    }

    setSubmitting(true);

    try {
      // 1️⃣ Create Operation
      const createdOp = await createOperation(operation);
      const operationId = createdOp.id || createdOp.operation_id;

      if (!operationId) {
        throw new Error("Operation ID not returned from API.");
      }

      // 2️⃣ Create all zones (attach operationId)
      const zones = [queueZone, loadPadZone, dumpZone, zoneArea];

      for (const z of zones) {
        await createZone({
          ...z,
          operationId,
        });
      }

      // 3️⃣ Assign devices
      for (const deviceId of assignedDevices) {
        await createDeviceAssignment({
          device_id: deviceId,
          operation_id: operationId,
          zone_id: operationId, // adjust if you want a specific zone
        });
      }

      Swal.fire({
        icon: "success",
        title: "All done",
        text: "Operation, zones, and device assignments created successfully.",
      }).then(() => {
        navigate("/operations/geofence/list");
      });
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || error.message || "Failed to finalize.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Finalize (Step 7/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Finalize Wizard</Typography>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
              <button
                onClick={() => goPrev("finalize")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  cursor: "pointer",
                }}
                disabled={submitting}
              >
                ← Back
              </button>
            </div>

            <Typography variant="h6" sx={{ mb: 2 }}>
              Review & Submit
            </Typography>

            <ul>
              <li>Operation: {operation?.name || "(no name)"}</li>
              <li>QUEUE_AREA: {queueZone?.name || "not set"}</li>
              <li>LOAD_PAD: {loadPadZone?.name || "not set"}</li>
              <li>DUMP_AREA: {dumpZone?.name || "not set"}</li>
              <li>ZONE_AREA: {zoneArea?.name || "not set"}</li>
              <li>Devices assigned: {assignedDevices.length}</li>
            </ul>

            <button
              onClick={handleSubmitAll}
              disabled={submitting}
              style={{
                marginTop: 30,
                padding: "10px 20px",
                background: submitting ? "#999" : "#2e7d32",
                color: "white",
                borderRadius: 6,
                border: "none",
                cursor: submitting ? "default" : "pointer",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {submitting ? "Submitting..." : "Create Everything"}
            </button>
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
}
