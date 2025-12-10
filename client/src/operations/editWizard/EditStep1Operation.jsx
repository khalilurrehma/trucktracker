// src/operations/editWizard/EditStep1Operation.jsx
import React, { useEffect, useState } from "react";
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
import { useEditWizard } from "./EditWizardContext";
import CircleInputs from "@/operations/components/CircleInputs";
export default function EditStep1Operation({ goNext }) {
  const classes = useSettingsStyles();
  const user = useSelector((state) => state.session.user);
  const { operation, setOperation } = useEditWizard();
  const [local, setLocal] = useState(null);
  const [circle, setCircle] = useState({
    lat: "",
    lng: "",
    radius: 0,
  });
  useEffect(() => {
    if (operation) {
      setLocal({
        op_name: operation.name,
        op_priority: operation.priority ?? 10,
        op_enabled: operation.enabled ?? true,
        geofence: {
          geometry: operation.geometry,
          area_sqm: operation.area_sqm,
          area_ha: operation.area_ha,
        },
        op_metadata: {
          Day_volume_m3_goal: operation.day_volume_m3_goal || "",
          op_max_speed_kmh: operation.op_max_speed_kmh || "",
          op_swell_factor: operation.op_swell_factor || "",
          op_total_bank_volume_m3: operation.op_total_bank_volume_m3 || "",
        },
      });
    }
  }, [operation]);

  if (!local) return <p style={{ padding: 20 }}>Loading operation...</p>;

  const handleNext = () => {
    if (!local.op_name) {
      return Swal.fire("Validation", "Operation name is required", "warning");
    }
    if (!local.geofence?.geometry) {
      return Swal.fire("Validation", "Please draw the operation area", "warning");
    }

    const meta = local.op_metadata || {};

    setOperation({
      ...operation,
      name: local.op_name,
      priority: local.op_priority,
      enabled: local.op_enabled,
      geometry: local.geofence.geometry,
      area_sqm: local.geofence.area_sqm,
      area_ha: local.geofence.area_ha,
      day_volume_m3_goal: meta.Day_volume_m3_goal,
      op_max_speed_kmh: meta.op_max_speed_kmh,
      op_swell_factor: meta.op_swell_factor,
      op_total_bank_volume_m3: meta.op_total_bank_volume_m3,
      user_id: user.id,
    });

    goNext("operation");
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "Edit Operation (Step 1/7)"]}
    >
      <Container maxWidth="xl" className={classes.container}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Edit Operation</Typography>
          </AccordionSummary>

          <AccordionDetails className={classes.details}>
            <TextField
              label="Name"
              fullWidth
              margin="normal"
              value={local.op_name}
              onChange={(e) =>
                setLocal((prev) => ({ ...prev, op_name: e.target.value }))
              }
            />
            <CircleInputs circle={circle} setCircle={setCircle} />

            <div style={{ marginTop: 40 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Operation Area
              </Typography>

              <GeofenceEditor
                value={local.geofence}
                onChange={(result) =>
                  setLocal((prev) => ({
                    ...prev,
                    geofence: {
                      geometry: result.geometry || null,
                      area_sqm: result.area_sqm || null,
                      area_ha: result.area_ha || null,
                    },
                  }))
                }
                circle={circle}
              />
            </div>

            <div style={{ marginTop: 30 }}>

              <TextField
                label="Day Volume Goal"
                fullWidth
                margin="normal"
                type="number"
                value={local.op_metadata.Day_volume_m3_goal}
                onChange={(e) =>
                  setLocal((prev) => ({
                    ...prev,
                    op_metadata: {
                      ...prev.op_metadata,
                      Day_volume_m3_goal: e.target.value,
                    },
                  }))
                }
              />

              <TextField
                label="Max Speed (km/h)"
                fullWidth
                margin="normal"
                type="number"
                value={local.op_metadata.op_max_speed_kmh}
                onChange={(e) =>
                  setLocal((prev) => ({
                    ...prev,
                    op_metadata: {
                      ...prev.op_metadata,
                      op_max_speed_kmh: e.target.value,
                    },
                  }))
                }
              />

              <TextField
                label="Swell Factor"
                fullWidth
                margin="normal"
                type="number"
                value={local.op_metadata.op_swell_factor}
                onChange={(e) =>
                  setLocal((prev) => ({
                    ...prev,
                    op_metadata: {
                      ...prev.op_metadata,
                      op_swell_factor: e.target.value,
                    },
                  }))
                }
              />

              <TextField
                label="Total Bank Volume (m3)"
                fullWidth
                margin="normal"
                type="number"
                value={local.op_metadata.op_total_bank_volume_m3}
                onChange={(e) =>
                  setLocal((prev) => ({
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
