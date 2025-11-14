import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
  TextField,
  Switch,
  FormControlLabel,
  MenuItem,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Swal from "sweetalert2";
import { useParams } from "react-router-dom";

import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";
import useSettingsStyles from "@/settings/common/useSettingsStyles";

import GeofenceZoneEditor from "@/operations/components/GeofenceZoneEditor";

import { getOperationById } from "@/apis/operationApi";
import { getZoneById, updateZone } from "@/apis/zoneApi";

/* ---------------------- METADATA FIELDS ---------------------- */
const META_FIELDS = {
  QUEUE_AREA: [
    { key: "ideal_queue_duration_m", label: "Ideal Queue Duration (min)" },
    { key: "max_vehicles_count", label: "Max Vehicles Count" },
  ],
  LOAD_PAD: [
    { key: "load_pad_max_duration_min", label: "Load Pad Max Duration (min)" },
  ],
  DUMP_AREA: [
    { key: "dump_area_max_duration_min", label: "Dump Area Max Duration (min)" },
  ],
  ZONE_AREA: [
    { key: "zone_bank_swell_factor", label: "Bank Swell Factor" },
    { key: "zone_bank_volume_m3", label: "Bank Volume (m³)" },
    { key: "zone_max_speed_kmh", label: "Max Speed (km/h)" },
  ],
};

export default function EditZonePage() {
  const classes = useSettingsStyles();
  const { id } = useParams(); // zoneId

  const [loading, setLoading] = useState(true);
  const [parentOp, setParentOp] = useState(null);
  const [zone, setZone] = useState(null);

  /* ---------------------- LOAD ZONE + OPERATION ---------------------- */
  useEffect(() => {
    const loadData = async () => {
      try {
        const z = await getZoneById(id);
        const op = await getOperationById(z.operationId);

        const parsedOpGeo =
          typeof op.geometry === "string" ? JSON.parse(op.geometry) : op.geometry;

        const parsedZoneGeo =
          typeof z.geometry === "string" ? JSON.parse(z.geometry) : z.geometry;

        setParentOp({
          id: op.id,
          name: op.name,
          geometry: parsedOpGeo,
        });

        setZone({
          id: z.id,
          name: z.name,
          enabled: z.enabled ?? true,
          zoneType: z.zoneType,
          geofence: {
            geometry: parsedZoneGeo,
            area_sqm: z.area_sqm,
            area_ha: z.area_ha,
          },
          metadata: {
            zone_type: z.zoneType,
            ideal_queue_duration_m: z.ideal_queue_duration_m || "",
            max_vehicles_count: z.max_vehicles_count || "",
            load_pad_max_duration_min: z.load_pad_max_duration_min || "",
            dump_area_max_duration_min: z.dump_area_max_duration_min || "",
            zone_max_speed_kmh: z.zone_max_speed_kmh || "",
            zone_bank_volume_m3: z.zone_bank_volume_m3 || "",
            zone_bank_swell_factor: z.zone_bank_swell_factor || "",
          },
        });

        setLoading(false);
      } catch (err) {
        Swal.fire("Error", "Unable to load zone.", "error");
      }
    };

    loadData();
  }, [id]);

  if (loading || !zone) return <p style={{ padding: 20 }}>Loading zone…</p>;

  const metaFields = META_FIELDS[zone.zoneType] || [];

  /* ---------------------- SAVE CHANGES ---------------------- */
  const handleSave = async () => {
    const meta = zone.metadata;
    const geo = zone.geofence;

    const payload = {
      zoneType: zone.zoneType, // REQUIRED

      name: zone.name,
      enabled: zone.enabled,

      geometry: geo.geometry,
      area_sqm: geo.area_sqm,
      area_ha: geo.area_ha,

      /* ---------- QUEUE ---------- */
      ideal_queue_duration_m:
        zone.zoneType === "QUEUE_AREA"
          ? Number(meta.ideal_queue_duration_m)
          : null,

      max_vehicles_count:
        zone.zoneType === "QUEUE_AREA"
          ? Number(meta.max_vehicles_count)
          : null,

      /* ---------- LOAD PAD ---------- */
      load_pad_max_duration_min:
        zone.zoneType === "LOAD_PAD"
          ? Number(meta.load_pad_max_duration_min)
          : null,

      /* ---------- DUMP AREA ---------- */
      dump_area_max_duration_min:
        zone.zoneType === "DUMP_AREA"
          ? Number(meta.dump_area_max_duration_min)
          : null,

      /* ---------- ZONE AREA ---------- */
      zone_max_speed_kmh:
        zone.zoneType === "ZONE_AREA"
          ? Number(meta.zone_max_speed_kmh)
          : null,

      zone_bank_volume_m3:
        zone.zoneType === "ZONE_AREA"
          ? Number(meta.zone_bank_volume_m3)
          : null,

      zone_bank_swell_factor:
        zone.zoneType === "ZONE_AREA"
          ? Number(meta.zone_bank_swell_factor)
          : null,
    };

    await updateZone(zone.id, payload);

    Swal.fire("Updated!", "Zone updated successfully.", "success");
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Edit Zone", zone.name]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">
              Editing Zone: {zone.name} (Operation: {parentOp?.name})
            </Typography>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            {/* NAME */}
            <TextField
              label="Zone Name"
              fullWidth
              margin="normal"
              value={zone.name}
              onChange={(e) =>
                setZone((prev) => ({ ...prev, name: e.target.value }))
              }
            />

            {/* ENABLED */}
            <FormControlLabel
              control={
                <Switch
                  checked={zone.enabled}
                  onChange={(e) =>
                    setZone((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                />
              }
              label="Enabled"
            />

            {/* TYPE (READ ONLY) */}
            <TextField
              label="Zone Type"
              fullWidth
              margin="normal"
              value={zone.zoneType}
              InputProps={{ readOnly: true }}
            />

            {/* MAP */}
            <div style={{ marginTop: 40 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Edit Zone Shape
              </Typography>

              <GeofenceZoneEditor
                value={zone.geofence}
                parentBoundary={parentOp.geometry}
                onChange={(geo) =>
                  setZone((prev) => ({
                    ...prev,
                    geofence: geo,
                  }))
                }
              />
            </div>

            {/* METADATA */}
            <Typography variant="subtitle1" sx={{ mt: 3 }}>
              Zone Settings
            </Typography>

            {metaFields.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                fullWidth
                margin="normal"
                value={zone.metadata[field.key]}
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

            {/* SAVE */}
            <button
              onClick={handleSave}
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
              Update Zone
            </button>
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
}
