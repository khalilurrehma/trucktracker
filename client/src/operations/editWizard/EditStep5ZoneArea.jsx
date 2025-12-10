// src/operations/editWizard/EditStep5ZoneArea.jsx
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
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";
import GeofenceZoneEditor from "@/operations/components/GeofenceZoneEditor";
import useSettingsStyles from "@/settings/common/useSettingsStyles";
import { useEditWizard } from "./EditWizardContext";
import CircleInputs from "@/operations/components/CircleInputs";
const META_FIELDS = {
  ZONE_AREA: [
    { key: "zone_bank_swell_factor", label: "Bank Swell Factor" },
    { key: "zone_bank_volume_m3", label: "Bank Volume (m³)" },
    { key: "zone_max_speed_kmh", label: "Max Speed (km/h)" },
  ],
};

export default function EditStep5ZoneArea({ goNext, goPrev }) {
  const classes = useSettingsStyles();
  const { zoneArea, setZoneArea, operation } = useEditWizard();

  const [local, setLocal] = useState(null);
  const [circle, setCircle] = useState({
    lat: "",
    lng: "",
    radius: 0,
  });
  useEffect(() => {
    if (zoneArea) {
      setLocal({
        id: zoneArea.id,
        name: zoneArea.name,
        enabled: zoneArea.enabled,
        zoneType: zoneArea.zoneType,
        geofence: zoneArea.geofence,
        metadata: zoneArea.metadata,
      });
    }
  }, [zoneArea]);

  if (!local) return <p style={{ padding: 20 }}>Loading ZONE_AREA...</p>;

  const metaFields = META_FIELDS["ZONE_AREA"];

  const handleNext = () => {
    setZoneArea(local);
    goNext("zone-area");
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Edit ZONE_AREA (Step 5/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Edit ZONE_AREA</Typography>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            <TextField
              label="Zone Name"
              fullWidth
              margin="normal"
              value={local.name}
              onChange={(e) =>
                setLocal((prev) => ({ ...prev, name: e.target.value }))
              }
            />

            <CircleInputs circle={circle} setCircle={setCircle} />

            <div style={{ marginTop: 40 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Edit Zone Shape
              </Typography>

              <GeofenceZoneEditor
                zoneType="ZONE_AREA"
                circle={circle}
                value={{ ...local.geofence, name: local.name }}
                parentBoundary={operation.geometry}
                onChange={(geo) =>
                  setLocal((prev) => ({ ...prev, geofence: geo }))
                }
              />
            </div>

            <Typography variant="subtitle1" sx={{ mt: 3 }}>
              Zone Area Settings
            </Typography>

            {metaFields.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                fullWidth
                margin="normal"
                value={local.metadata[field.key]}
                onChange={(e) =>
                  setLocal((prev) => ({
                    ...prev,
                    metadata: {
                      ...prev.metadata,
                      [field.key]: e.target.value,
                    },
                  }))
                }
              />
            ))}

            {/* Navigation */}
            <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
              <button
                onClick={() => goPrev("zone-area")}
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
                onClick={handleNext}
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
