// src/operations/editWizard/EditStep3LoadPadZone.jsx
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

const META_FIELDS = {
  LOAD_PAD: [
    { key: "load_pad_max_duration_min", label: "Load Pad Max Duration (min)" },
  ],
};

export default function EditStep3LoadPadZone({ goNext, goPrev }) {
  const classes = useSettingsStyles();
  const { loadPadZone, setLoadPadZone, operation } = useEditWizard();

  const [local, setLocal] = useState(null);

  useEffect(() => {
    if (loadPadZone) {
      setLocal({
        id: loadPadZone.id,
        name: loadPadZone.name,
        enabled: loadPadZone.enabled,
        zoneType: loadPadZone.zoneType,
        geofence: loadPadZone.geofence,
        metadata: loadPadZone.metadata,
      });
    }
  }, [loadPadZone]);

  if (!local) return <p style={{ padding: 20 }}>Loading LOAD_PAD...</p>;

  const metaFields = META_FIELDS["LOAD_PAD"];

  const handleNext = () => {
    setLoadPadZone(local);
    goNext("load-pad");
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Edit LOAD_PAD (Step 3/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Edit LOAD_PAD</Typography>
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

            <div style={{ marginTop: 40 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Edit Zone Shape
              </Typography>

              <GeofenceZoneEditor
                value={local.geofence}
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
                onClick={() => goPrev("load-pad")}
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
