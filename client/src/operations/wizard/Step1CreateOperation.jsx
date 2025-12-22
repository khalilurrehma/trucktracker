// src/operations/wizard/Step1CreateOperation.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
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
import Swal from "sweetalert2";

import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";
import useSettingsStyles from "@/settings/common/useSettingsStyles";
import GeofenceEditor from "@/operations/components/GeofenceEditor";
import CircleInputs from "@/operations/components/CircleInputs";
import { useWizard } from "./WizardContext";

export default function Step1CreateOperation({ goNext }) {
  const classes = useSettingsStyles();
  const user = useSelector((state) => state.session.user);
  const { operation, setOperation } = useWizard();
  const [circle, setCircle] = useState({
    lat: "",
    lng: "",
    radius: 0,
  });

  const [attributes, setAttributes] = useState({
    op_name: "",
    op_priority: 10,
    op_enabled: true,
    geofence: null,
    op_metadata: {
      Day_volume_m3_goal: "",
      op_max_speed_kmh: "",
      op_total_bank_volume_m3: "",
      op_swell_factor: "",
    },
  });

  // Rehydrate when navigating back
  useEffect(() => {
    if (!operation) return;

    if (operation.circle) {
      setCircle(operation.circle);
    }

    setAttributes({
      op_name: operation.name || "",
      op_priority: operation.op_priority ?? 10,
      op_enabled: operation.op_enabled ?? true,
      geofence: operation.geometry
        ? {
            geometry: operation.geometry,
            area_sqm: operation.area_sqm,
            area_ha: operation.area_ha,
          }
        : null,
      op_metadata: {
        Day_volume_m3_goal: operation.day_volume_m3_goal ?? "",
        op_max_speed_kmh: operation.op_max_speed_kmh ?? "",
        op_total_bank_volume_m3: operation.op_total_bank_volume_m3 ?? "",
        op_swell_factor: operation.op_swell_factor ?? "",
      },
    });
  }, [operation]);

  const handleNext = () => {
    if (!attributes.op_name) {
      return Swal.fire("Validation", "Operation name is required", "warning");
    }
    if (!attributes.geofence?.geometry) {
      return Swal.fire("Validation", "Please draw the operation area", "warning");
    }

    const meta = attributes.op_metadata || {};

    // This is what we'll send later to createOperation()
    const operationPayload = {
      name: attributes.op_name,
      geometry: attributes.geofence?.geometry || null,
      area_sqm: attributes.geofence?.area_sqm || null,
      area_ha: attributes.geofence?.area_ha || null,
      circle,
      day_volume_m3_goal: meta.Day_volume_m3_goal
        ? parseFloat(meta.Day_volume_m3_goal)
        : null,
      op_max_speed_kmh: meta.op_max_speed_kmh
        ? parseFloat(meta.op_max_speed_kmh)
        : null,
      op_total_bank_volume_m3: meta.op_total_bank_volume_m3
        ? parseFloat(meta.op_total_bank_volume_m3)
        : null,
      op_swell_factor: meta.op_swell_factor
        ? parseFloat(meta.op_swell_factor)
        : null,
      user_id: user.id,
      op_priority: attributes.op_priority,
      op_enabled: attributes.op_enabled,
    };

    setOperation(operationPayload);

    Swal.fire({
      icon: "success",
      title: "Operation",
      text: "Operation data saved successfully.",
      timer: 1000,
      showConfirmButton: false,
    });

    goNext("create-operation");
  };

  const handleGeofenceChange = useCallback((result) => {
    setAttributes((prev) => ({
      ...prev,
      geofence: result,
    }));
  }, [setAttributes]);

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Create Operation (Step 1/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Create Operation</Typography>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            <TextField
              label="Operation Name"
              fullWidth
              margin="normal"
              value={attributes.op_name || ""}
              onChange={(e) =>
                setAttributes((prev) => ({ ...prev, op_name: e.target.value }))
              }
            />
            <CircleInputs circle={circle} setCircle={setCircle} />
            <div style={{ marginTop: 40, width: "100%" }}>
              <Typography variant="subtitle1" style={{ marginBottom: 18 }}>
                Operation Area
              </Typography>

              <GeofenceEditor
                value={attributes.geofence}
                onChange={handleGeofenceChange}
                circle={circle}
              />
            </div>

            <div style={{ width: "100%", marginTop: 30 }}>
              <TextField
                label="Daily volume goal to move m3"
                fullWidth
                type="number"
                margin="normal"
                value={attributes.op_metadata?.Day_volume_m3_goal || ""}
                onChange={(e) =>
                  setAttributes((prev) => ({
                    ...prev,
                    op_metadata: {
                      ...prev.op_metadata,
                      Day_volume_m3_goal: e.target.value,
                    },
                  }))
                }
              />

              <TextField
                label="Operation Max Speed (km/h)"
                fullWidth
                type="number"
                margin="normal"
                value={attributes.op_metadata?.op_max_speed_kmh || ""}
                onChange={(e) =>
                  setAttributes((prev) => ({
                    ...prev,
                    op_metadata: {
                      ...prev.op_metadata,
                      op_max_speed_kmh: e.target.value,
                    },
                  }))
                }
              />

              <TextField
                label="Operation material swell factor %"
                fullWidth
                type="number"
                margin="normal"
                value={attributes.op_metadata?.op_swell_factor || ""}
                onChange={(e) =>
                  setAttributes((prev) => ({
                    ...prev,
                    op_metadata: {
                      ...prev.op_metadata,
                      op_swell_factor: e.target.value,
                    },
                  }))
                }
              />

              <TextField
                label="Operation total material to move in bank m3"
                fullWidth
                type="number"
                margin="normal"
                value={attributes.op_metadata?.op_total_bank_volume_m3 || ""}
                onChange={(e) =>
                  setAttributes((prev) => ({
                    ...prev,
                    op_metadata: {
                      ...prev.op_metadata,
                      op_total_bank_volume_m3: e.target.value,
                    },
                  }))
                }
              />
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
