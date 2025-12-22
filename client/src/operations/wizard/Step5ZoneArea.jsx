// src/operations/wizard/Step5ZoneArea.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    { key: "ideal_queue_duration_m", label: "Maximun vehicles count inside QUEUE_AREA, set alert if number is higher" },
    { key: "queue_max_vehicles_count", label: "Vehicle ideal time inside QUEUE_AREA, number should be lower, if number is over set alert" },
  ],
  LOADING: [{ key: "load_pad_max_duration_min", label: "Vehicle maximun time inside LOAD_PAD / to activate an alert" }],
  DUMP: [{ key: "dump_area_max_duration_min", label: "Vehicle maximun time inside DUMP_AREA / to activate an alert" }],
  ZONE_AREA: [
    { key: "zone_bank_swell_factor", label: "Zone material swell factor %" },
    { key: "zone_bank_volume_m3", label: "Zone total material to move in bank m3" },
    { key: "zone_max_speed_kmh", label: "Vehices max speed in km/h in case this value exist, it replace op_max_speed_km/h" },
  ],
};

const zoneTypeMap = {
  QUEUE: "QUEUE_AREA",
  LOADING: "LOAD_PAD",
  DUMP: "DUMP_AREA",
  ZONE_AREA: "ZONE_AREA",
};

const DEFAULT_METADATA = {
  zone_type: "ZONE_AREA",
  zone_bank_swell_factor: "",
  zone_bank_volume_m3: "",
  zone_max_speed_kmh: "",
};

const DEFAULT_ZONE = {
  name: "",
  enabled: true,
  zoneType: "ZONE_AREA",
  capacity: "",
  geofence: null,
  metadata: DEFAULT_METADATA,
};

export default function Step5ZoneArea({ goNext, goPrev }) {
  const classes = useSettingsStyles();
  const {
    operation,
    queueZone,
    loadPadZone,
    dumpZone,
    zoneArea,
    setZoneArea
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

  // Rehydrate when navigating back
  useEffect(() => {
    if (zoneArea) {
      setZone({
        ...DEFAULT_ZONE,
        ...zoneArea,
        metadata: { ...DEFAULT_METADATA, ...(zoneArea.metadata || {}) },
      });
      if (zoneArea.circle) setCircle(zoneArea.circle);
    }
  }, [zoneArea]);

  useEffect(() => {
    if (!operation) {
      Swal.fire("Missing operation", "Please complete Step 1 first.", "warning");
    }
  }, [operation]);

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
    // Force ZONE_AREA only when nothing stored
    if (!zoneArea) handleTypeChange("ZONE_AREA");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneArea]);

  const handleNext = () => {
    if (!zone.name) {
      return Swal.fire("Validation", "Zone name is required", "warning");
    }
    if (!zone.geofence?.geometry) {
      return Swal.fire("Validation", "Please draw the zone area", "warning");
    }

    const meta = zone.metadata || {};
    const geo = zone.geofence || {};
    const backendZoneType = zoneTypeMap[zone.zoneType];

    const zonePayload = {
      name: zone.name,
      zoneType: backendZoneType,
      geofence: geo,
      geometry: geo.geometry || null,
      area_sqm: geo.area_sqm || null,
      area_ha: geo.area_ha || null,
      enabled: zone.enabled,
      capacity: zone.capacity ? Number(zone.capacity) : null,
      circle,
      metadata: { ...DEFAULT_METADATA, ...meta, zone_type: backendZoneType },

      zone_max_speed_kmh:
        backendZoneType === "ZONE_AREA"
          ? Number(meta.zone_max_speed_kmh || 0)
          : null,
      zone_bank_volume_m3:
        backendZoneType === "ZONE_AREA"
          ? Number(meta.zone_bank_volume_m3 || 0)
          : null,
      zone_bank_swell_factor:
        backendZoneType === "ZONE_AREA"
          ? Number(meta.zone_bank_swell_factor || 0)
          : null,
    };

    setZoneArea(zonePayload);

    Swal.fire({
      icon: "success",
      title: "ZONE_AREA",
      text: "ZONE_AREA data saved successfully.",
      timer: 1000,
      showConfirmButton: false,
    });

    goNext("zone-area");
  };

  const metaFields = META_FIELDS[zone.zoneType] || [];
  const otherGeofences = useMemo(
    () =>
      [
        queueZone && {
          geometry: queueZone.geometry || queueZone.geofence?.geometry,
          zoneType: queueZone.zoneType || "QUEUE_AREA",
        },
        loadPadZone && {
          geometry: loadPadZone.geometry || loadPadZone.geofence?.geometry,
          zoneType: loadPadZone.zoneType || "LOAD_PAD",
        },
        dumpZone && {
          geometry: dumpZone.geometry || dumpZone.geofence?.geometry,
          zoneType: dumpZone.zoneType || "DUMP_AREA",
        },
        zoneArea && {
          geometry: zoneArea.geometry || zoneArea.geofence?.geometry,
          zoneType: zoneArea.zoneType || "ZONE_AREA",
        },
      ].filter((item) => item?.geometry && item.zoneType !== "ZONE_AREA"),
    [queueZone, loadPadZone, dumpZone, zoneArea]
  );
  const handleGeofenceChange = useCallback((geo) => {
    setZone((prev) => ({
      ...prev,
      geofence: geo,
    }));
  }, [setZone]);

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "ZONE_AREA (Step 5/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Create ZONE_AREA for Operation: {operation?.name || "(no name)"}
            </Typography>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
              <button
                onClick={() => goPrev("zone-area")}
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
              label="Zone Area Name"
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
                Draw Zone Area (inside Operation geometry)
              </Typography>

              <GeofenceZoneEditor
                value={zone.geofence}
                circle={circle}
                zoneType="ZONE_AREA"
                parentBoundary={operation?.geometry}
                otherGeofences={otherGeofences}
                onChange={handleGeofenceChange}
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
