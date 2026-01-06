// src/operations/editWizard/EditStep7Finalize.jsx
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

import { useEditWizard } from "./EditWizardContext";

import { updateOperation } from "@/apis/operationApi";
import { updateZone } from "@/apis/zoneApi";
import {
  createDeviceAssignment,
  deleteDeviceAssignment,
  getAllDeviceAssignments,
} from "@/apis/deviceAssignmentApi";

export default function EditStep7Finalize({ goPrev }) {
  const classes = useSettingsStyles();
  const {
    operation,
    queueZone,
    loadPadZone,
    dumpZone,
    zoneArea,
    assignedDevices,
  } = useEditWizard();

  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const handleSubmitAll = async () => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Confirm Update?",
      text: "All changes to operation, zones, and devices will be saved.",
      showCancelButton: true,
      confirmButtonText: "Yes, update everything",
    });

    if (!confirm.isConfirmed) return;

    setSaving(true);

    try {
      const opId = operation.id;

      /* --------------------- 1) UPDATE OPERATION --------------------- */
      await updateOperation(opId, {
        name: operation.name,
        priority: operation.priority,
        enabled: operation.enabled,
        geometry: operation.geometry,
        area_sqm: operation.area_sqm,
        area_ha: operation.area_ha,
        day_volume_m3_goal: Number(operation.day_volume_m3_goal) || null,
        op_max_speed_kmh: Number(operation.op_max_speed_kmh) || null,
        op_total_bank_volume_m3:
          Number(operation.op_total_bank_volume_m3) || null,
        op_swell_factor: Number(operation.op_swell_factor) || null,
        user_id: operation.user_id,
      });

      /* --------------------- 2) UPDATE ZONES --------------------- */
      const zones = [queueZone, loadPadZone, dumpZone, zoneArea];

      for (const z of zones) {
        await updateZone(z.id, {
          zoneType: z.zoneType,
          name: z.name,
          enabled: z.enabled,
          geometry: z.geofence.geometry,
          area_sqm: z.geofence.area_sqm,
          area_ha: z.geofence.area_ha,
          ideal_queue_duration_m:
            z.zoneType === "QUEUE_AREA"
              ? Number(z.metadata.ideal_queue_duration_m) || null
              : null,
          max_vehicles_count:
            z.zoneType === "QUEUE_AREA"
              ? Number(z.metadata.max_vehicles_count) || null
              : null,
          load_pad_max_duration_min:
            z.zoneType === "LOAD_PAD"
              ? Number(z.metadata.load_pad_max_duration_min) || null
              : null,
          dump_area_max_duration_min:
            z.zoneType === "DUMP_AREA"
              ? Number(z.metadata.dump_area_max_duration_min) || null
              : null,
          zone_max_speed_kmh:
            z.zoneType === "ZONE_AREA"
              ? Number(z.metadata.zone_max_speed_kmh) || null
              : null,
          zone_bank_volume_m3:
            z.zoneType === "ZONE_AREA"
              ? Number(z.metadata.zone_bank_volume_m3) || null
              : null,
          zone_bank_swell_factor:
            z.zoneType === "ZONE_AREA"
              ? Number(z.metadata.zone_bank_swell_factor) || null
              : null,
        });
      }

      /* --------------------- 3) SYNC DEVICE ASSIGNMENTS --------------------- */
      const allAssignments = await getAllDeviceAssignments();
      const current = allAssignments.filter((a) => a.operation_id === opId);

      // remove old assignments
      for (const a of current) {
        await deleteDeviceAssignment({
          device_id: a.device_id,
          zone_id: a.zone_id,
        });
      }

      // add new
      for (const deviceId of assignedDevices) {
        await createDeviceAssignment({
          device_id: deviceId,
          operation_id: opId,
          zone_id: opId,
        });
      }

      Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "All changes successfully applied.",
      }).then(() => {
        navigate("/operations/geofence/list");
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to apply updates", "error");
    } finally {
      setSaving(false);
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
            <Typography variant="subtitle1">
              Final Review - Operation {operation?.name}
            </Typography>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Summary of Changes
            </Typography>

            <ul style={{ fontSize: 15 }}>
              <li><strong>Operation:</strong> {operation?.name}</li>
              <li><strong>QUEUE_AREA:</strong> {queueZone?.name}</li>
              <li><strong>LOAD_PAD:</strong> {loadPadZone?.name}</li>
              <li><strong>DUMP_AREA:</strong> {dumpZone?.name}</li>
              <li><strong>ZONE_AREA:</strong> {zoneArea?.name}</li>
              <li><strong>Assigned Devices:</strong> {assignedDevices.length}</li>
            </ul>

            {/* Navigation */}
            <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
              <button
                onClick={() => goPrev("finalize")}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  background: "#444",
                  color: "hsl(var(--primary-foreground))",
                  borderRadius: 6,
                  border: "none",
                  cursor: saving ? "default" : "pointer",
                }}
              >
                Back
              </button>

              <button
                onClick={handleSubmitAll}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  background: saving ? "hsl(var(--muted))" : "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  borderRadius: 6,
                  border: "none",
                  cursor: saving ? "default" : "pointer",
                }}
              >
                {saving ? "Updating..." : "Update Everything"}
              </button>
            </div>
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
}

