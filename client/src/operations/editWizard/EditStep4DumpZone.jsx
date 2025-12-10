// src/operations/editWizard/EditStep4DumpZone.jsx
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
  DUMP_AREA: [
    { key: "dump_area_max_duration_min", label: "Dump Area Max Duration (min)" },
  ],
};

export default function EditStep4DumpZone({ goNext, goPrev }) {
  const classes = useSettingsStyles();
  const { dumpZone, setDumpZone, operation } = useEditWizard();

  const [local, setLocal] = useState(null);
  const [circle, setCircle] = useState({
    lat: "",
    lng: "",
    radius: 0,
  });
  useEffect(() => {
    if (dumpZone) {
      setLocal({
        id: dumpZone.id,
        name: dumpZone.name,
        enabled: dumpZone.enabled,
        zoneType: dumpZone.zoneType,
        geofence: dumpZone.geofence,
        metadata: dumpZone.metadata,
      });
    }
  }, [dumpZone]);

  if (!local) return <p style={{ padding: 20 }}>Loading DUMP_AREA...</p>;

  const metaFields = META_FIELDS["DUMP_AREA"];

  const handleNext = () => {
    setDumpZone(local);
    goNext("dump");
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Edit DUMP_AREA (Step 4/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Edit DUMP_AREA</Typography>
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
                zoneType="DUMP_AREA"
                value={{ ...local.geofence, name: local.name }}
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

            {/* Navigation */}
            <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
              <button
                onClick={() => goPrev("dump")}
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
``
