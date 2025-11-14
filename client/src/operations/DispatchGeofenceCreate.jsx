import React, { useState } from "react";
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
import { createOperation } from "@/apis/operationApi";
import { useCatch } from "@/reactHelper";
import GeofenceEditor from "@/operations/components/GeofenceEditor";

const GeofenceCreate = () => {
    const classes = useSettingsStyles();

    const user = useSelector((state) => state.session.user);

    // 🔥 STATE FIXED — always deep clone op_metadata
    const [attributes, setAttributes] = useState({
        ...user.attributes,
        op_metadata: { ...(user.attributes.op_metadata || {}) },
        geofence: user.attributes.geofence || null
    });

    const handleSave = useCatch(async () => {
        const meta = attributes.op_metadata || {};

        const finalPayload = {
            name: attributes.op_name,
            geometry: attributes.geofence?.geometry || null,
            area_sqm: attributes.geofence?.area_sqm || null,
            area_ha: attributes.geofence?.area_ha || null,
            day_volume_m3_goal: parseFloat(meta.Day_volume_m3_goal) || null,
            op_max_speed_kmh: parseFloat(meta.op_max_speed_kmh) || null,
            op_total_bank_volume_m3: parseFloat(meta.op_total_bank_volume_m3) || null,
            op_swell_factor: parseFloat(meta.op_swell_factor) || null,
            user_id: user.id,
        };

        try {
            await createOperation(finalPayload);
            console.log("FINAL PAYLOAD TO SEND:", finalPayload);

            Swal.fire({
                icon: "success",
                title: "Operation created",
                text: "Your operation geofence was successfully saved!",
                timer: 2000,
                showConfirmButton: false,
            });

            // 🔥 RESET THE FORM HERE
            setAttributes({
                ...user.attributes,
                op_metadata: {},
                geofence: null,
                op_name: "",
                op_priority: 10,
                op_enabled: true,
            });

        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error?.response?.data?.message || "Something went wrong.",
            });
            throw error;
        }
    });



    return (
        <PageLayout
            menu={<OperationsMenu />}
            breadcrumbs={["settingsTitle", "sharedPreferences"]}
        >
            <Container maxWidth="xl" className={classes.container}>
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">Operation Settings</Typography>
                    </AccordionSummary>

                    <AccordionDetails className={classes.details}>

                        {/* NAME */}
                        <TextField
                            label="Name"
                            fullWidth
                            margin="normal"
                            value={attributes.op_name || ""}
                            onChange={(e) =>
                                setAttributes(prev => ({
                                    ...prev,
                                    op_name: e.target.value
                                }))
                            }
                        />

                        {/* PRIORITY */}
                        <TextField
                            label="Priority"
                            fullWidth
                            type="number"
                            margin="normal"
                            value={attributes.op_priority ?? 10}
                            onChange={(e) =>
                                setAttributes(prev => ({
                                    ...prev,
                                    op_priority: Number(e.target.value)
                                }))
                            }
                        />

                        {/* ENABLED */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={attributes.op_enabled ?? false}
                                    onChange={(e) =>
                                        setAttributes(prev => ({
                                            ...prev,
                                            op_enabled: e.target.checked
                                        }))
                                    }
                                />
                            }
                            label="Enabled"
                        />

                        {/* MAP */}
                        <div style={{ marginTop: 40, width: "100%" }}>
                            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                Operation Area
                            </Typography>

                            <GeofenceEditor
                                value={attributes.geofence}
                                onChange={(result) =>
                                    setAttributes(prev => ({
                                        ...prev,
                                        geofence: {
                                            ...prev.geofence,
                                            geometry: result.geometry || null,
                                            area_sqm: result.area_sqm || null,
                                            area_ha: result.area_ha || null
                                        }
                                    }))
                                }
                            />

                        </div>

                        {/* METADATA */}
                        <div style={{ width: "100%", marginTop: 30 }}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                Metadata
                            </Typography>

                            {/* Day Volume Goal */}
                            <TextField
                                label="Day_volume_m3_goal"
                                fullWidth
                                margin="normal"
                                value={attributes.op_metadata?.Day_volume_m3_goal || ""}
                                onChange={(e) =>
                                    setAttributes(prev => ({
                                        ...prev,
                                        op_metadata: {
                                            ...prev.op_metadata,
                                            Day_volume_m3_goal: e.target.value
                                        }
                                    }))
                                }
                            />

                            {/* OP ID */}
                            <TextField
                                label="op_id"
                                fullWidth
                                margin="normal"
                                value={attributes.op_metadata?.op_id || ""}
                                onChange={(e) =>
                                    setAttributes(prev => ({
                                        ...prev,
                                        op_metadata: {
                                            ...prev.op_metadata,
                                            op_id: e.target.value
                                        }
                                    }))
                                }
                            />

                            {/* Max Speed */}
                            <TextField
                                label="op_max_speed_kmh"
                                fullWidth
                                margin="normal"
                                value={attributes.op_metadata?.op_max_speed_kmh || ""}
                                onChange={(e) =>
                                    setAttributes(prev => ({
                                        ...prev,
                                        op_metadata: {
                                            ...prev.op_metadata,
                                            op_max_speed_kmh: e.target.value
                                        }
                                    }))
                                }
                            />

                            {/* Swell Factor */}
                            <TextField
                                label="op_swell_factor"
                                fullWidth
                                margin="normal"
                                value={attributes.op_metadata?.op_swell_factor || ""}
                                onChange={(e) =>
                                    setAttributes(prev => ({
                                        ...prev,
                                        op_metadata: {
                                            ...prev.op_metadata,
                                            op_swell_factor: e.target.value
                                        }
                                    }))
                                }
                            />

                            {/* Total Bank Volume */}
                            <TextField
                                label="op_total_bank_volume_m3"
                                fullWidth
                                margin="normal"
                                value={attributes.op_metadata?.op_total_bank_volume_m3 || ""}
                                onChange={(e) =>
                                    setAttributes(prev => ({
                                        ...prev,
                                        op_metadata: {
                                            ...prev.op_metadata,
                                            op_total_bank_volume_m3: e.target.value
                                        }
                                    }))
                                }
                            />
                        </div>

                        {/* SAVE BUTTON */}
                        <button
                            onClick={handleSave}
                            style={{
                                marginTop: 30,
                                padding: "10px 20px",
                                background: "#1976d2",
                                color: "white",
                                borderRadius: 6,
                                border: "none",
                                cursor: "pointer"
                            }}
                        >
                            Save
                        </button>
                    </AccordionDetails>
                </Accordion>
            </Container>
        </PageLayout>
    );
};

export default GeofenceCreate;
