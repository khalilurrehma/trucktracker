// src/operations/editWizard/EditStep2QueueZone.jsx
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
  QUEUE_AREA: [
    { key: "ideal_queue_duration_m", label: "Maximun vehicles count inside QUEUE_AREA, set alert if number is higher" },
    { key: "max_vehicles_count", label: "Vehicle ideal time inside QUEUE_AREA, number should be lower, if number is over set alert" },
  ],
  LOADING: [{ key: "load_pad_max_duration_min", label: "Vehicle maximun time inside LOAD_PAD / to activate an alert" }],
  DUMP: [{ key: "dump_area_max_duration_min", label: "Vehicle maximun time inside DUMP_AREA / to activate an alert" }],
  ZONE_AREA: [
    { key: "zone_bank_swell_factor", label: "Zone material swell factor %" },
    { key: "zone_bank_volume_m3", label: "Zone total material to move in bank m3" },
    { key: "zone_max_speed_kmh", label: "Vehices max speed in km/h in case this value exist, it replace op_max_speed_km/h" },
  ],
};
export default function EditStep2QueueZone({ goNext, goPrev }) {
  const classes = useSettingsStyles();
  const { queueZone, setQueueZone, operation } = useEditWizard();

  const [local, setLocal] = useState(null);
  const [circle, setCircle] = useState({
    lat: "",
    lng: "",
    radius: 0,
  });
  useEffect(() => {
    if (queueZone) {
      setLocal({
        id: queueZone.id,
        name: queueZone.name,
        enabled: queueZone.enabled,
        zoneType: queueZone.zoneType,
        geofence: queueZone.geofence,
        metadata: queueZone.metadata,
      });
    }
  }, [queueZone]);

  if (!local) return <p style={{ padding: 20 }}>Loading queue zone...</p>;

  const metaFields = META_FIELDS["QUEUE_AREA"];

  const handleNext = () => {
    setQueueZone(local);
    goNext("queue");
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Edit QUEUE_AREA (Step 2/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Edit QUEUE_AREA</Typography>
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
                circle={circle}
                value={{ ...local.geofence, name: local.name }}
                zoneType="QUEUE_AREA"
                parentBoundary={operation.geometry}
                onChange={(geo) =>
                  setLocal((prev) => ({ ...prev, geofence: geo }))
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

            {/* Navigation buttons */}
            <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
              <button
                onClick={() => goPrev("queue")}
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
