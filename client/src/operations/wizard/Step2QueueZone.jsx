// src/operations/wizard/Step2QueueZone.jsx
import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Swal from "sweetalert2";

import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";
import useSettingsStyles from "@/settings/common/useSettingsStyles";
import GeofenceZoneEditor from "@/operations/components/GeofenceZoneEditor";
import { useWizard } from "./WizardContext";
import CircleInputs from "@/operations/components/CircleInputs";
const META_FIELDS = {
  QUEUE: [
    { key: "ideal_queue_duration_m", label: "Ideal Queue Duration (min)" },
    { key: "queue_max_vehicles_count", label: "Max Vehicles Count" },
  ],
  LOADING: [{ key: "load_pad_max_duration_min", label: "Load Pad Max Duration (min)" }],
  DUMP: [{ key: "dump_area_max_duration_min", label: "Dump Area Max Duration (min)" }],
  ZONE_AREA: [
    { key: "zone_bank_swell_factor", label: "Bank Swell Factor" },
    { key: "zone_bank_volume_m3", label: "Bank Volume (m³)" },
    { key: "zone_max_speed_kmh", label: "Max Speed (km/h)" },
  ],
};

const zoneTypeMap = {
  QUEUE: "QUEUE_AREA",
  LOADING: "LOAD_PAD",
  DUMP: "DUMP_AREA",
  ZONE_AREA: "ZONE_AREA",
};

const DEFAULT_METADATA = {
  zone_type: "QUEUE",
  ideal_queue_duration_m: "",
  queue_max_vehicles_count: "",
};

const DEFAULT_ZONE = {
  name: "",
  enabled: true,
  zoneType: "QUEUE",
  capacity: "",
  geofence: null,
  metadata: DEFAULT_METADATA,
};

export default function Step2QueueZone({ goNext, goPrev }) {
  const classes = useSettingsStyles();
  const {
    operation,
    queueZone,
    zoneArea,
    loadPadZone,
    dumpZone,
    setQueueZone
  } = useWizard();

  const [zone, setZone] = useState(() => ({
    ...DEFAULT_ZONE,
    metadata: { ...DEFAULT_METADATA },
  }));
  const [circle, setCircle] = useState({
    lat: "",
    lng: "",
    radius: 0,
  });

  useEffect(() => {
    if (!operation) {
      Swal.fire("Missing operation", "Please complete Step 1 first.", "warning");
    }
  }, [operation]);

  // Rehydrate when navigating back
  useEffect(() => {
    if (queueZone) {
      setZone({
        ...DEFAULT_ZONE,
        ...queueZone,
        // Normalize backend value back to UI enum so META_FIELDS works
        zoneType: queueZone.zoneType === "QUEUE_AREA" ? "QUEUE" : queueZone.zoneType,
        metadata: { ...DEFAULT_METADATA, ...(queueZone.metadata || {}) },
      });
      if (queueZone.circle) setCircle(queueZone.circle);
    }
  }, [queueZone]);

  const handleTypeChange = (type) => {
    const fields = META_FIELDS[type] || [];
    const newMetadata = { zone_type: type };

    fields.forEach((f) => {
      newMetadata[f.key] = (zone.metadata || {})[f.key] || "";
    });

    setZone((prev) => ({
      ...prev,
      zoneType: type,
      metadata: newMetadata,
    }));
  };

  useEffect(() => {
    // Force QUEUE only when nothing stored
    if (!queueZone) handleTypeChange("QUEUE");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueZone]);

  const handleNext = () => {
    if (!zone.name) {
      return Swal.fire("Validation", "Zone name is required", "warning");
    }
    if (!zone.geofence?.geometry) {
      return Swal.fire("Validation", "Please draw the queue area", "warning");
    }

    const meta = zone.metadata || {};
    const geo = zone.geofence || {};
    const backendZoneType = zoneTypeMap[zone.zoneType];

    const zonePayload = {
      name: zone.name,
      zoneType: backendZoneType,
      geometry: geo.geometry || null,
      area_sqm: geo.area_sqm || null,
      area_ha: geo.area_ha || null,
      enabled: zone.enabled,
      capacity: zone.capacity ? Number(zone.capacity) : null,
      circle,
      metadata: { ...DEFAULT_METADATA, ...meta, zone_type: backendZoneType },

      ideal_queue_duration_m:
        backendZoneType === "QUEUE_AREA"
          ? Number(meta.ideal_queue_duration_m || 0)
          : null,
      max_vehicles_count:
        backendZoneType === "QUEUE_AREA"
          ? Number(meta.queue_max_vehicles_count || 0)
          : null,
    };

    setQueueZone(zonePayload);

    Swal.fire({
      icon: "success",
      title: "QUEUE_AREA",
      text: "QUEUE_AREA data saved successfully.",
      timer: 1000,
      showConfirmButton: false,
    });

    goNext("queue-area");
  };

  const metaFields = META_FIELDS[zone.zoneType] || [];

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "QUEUE_AREA (Step 2/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Create QUEUE_AREA for Operation: {operation?.name || "(no name)"}
            </Typography>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
              <button
                onClick={() => goPrev("queue-area")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
            </div>

            <TextField
              label="QUEUE Name"
              fullWidth
              margin="normal"
              value={zone.name}
              onChange={(e) =>
                setZone((prev) => ({ ...prev, name: e.target.value }))
              }
            />


            <CircleInputs circle={circle} setCircle={setCircle} />
            <div style={{ marginTop: 40 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Draw Queue Area (inside Operation geometry)
              </Typography>
              <GeofenceZoneEditor
                value={zone.geofence}
                circle={circle}
                parentBoundary={operation?.geometry}
                zoneType="QUEUE_AREA"
                otherGeofences={[
                  zoneArea && { geometry: zoneArea.geometry, zoneType: "ZONE_AREA" },
                  loadPadZone && { geometry: loadPadZone.geometry, zoneType: "LOAD_PAD" },
                  dumpZone && { geometry: dumpZone.geometry, zoneType: "DUMP_AREA" },
                ].filter(Boolean)}
                onChange={(geo) =>
                  setZone((prev) => ({
                    ...prev,
                    geofence: geo,
                  }))
                }
              />
            </div>

            {metaFields.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                fullWidth
                type="number"
                margin="normal"
                value={zone.metadata?.[field.key] || ""}
                onChange={(e) =>
                  setZone((prev) => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      [field.key]: e.target.value,
                    },
                  }))
                }
              />
            ))}

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
