import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";

import {
    Container,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    TextField,
    Switch,
    FormControlLabel,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";

import { getOperationById, updateOperation } from "@/apis/operationApi";
import GeofenceEditor from "@/operations/components/GeofenceEditor";
import useSettingsStyles from "@/settings/common/useSettingsStyles";


const OperationEdit = () => {
    const { id } = useParams();
    const classes = useSettingsStyles();
    const user = useSelector((state) => state.session.user);

    const [loading, setLoading] = useState(true);

    const [attributes, setAttributes] = useState({
        op_name: "",
        op_priority: 10,
        op_enabled: true,
        op_metadata: {},
        geofence: null
    });

    // 🔥 Load data on mount
    useEffect(() => {
        const fetchOperation = async () => {
            try {
                const op = await getOperationById(id);

                setAttributes({
                    op_name: op.name,
                    op_priority: op.priority ?? 10,
                    op_enabled: op.enabled ?? true,

                    op_metadata: {
                        Day_volume_m3_goal: op.day_volume_m3_goal || "",
                        op_max_speed_kmh: op.op_max_speed_kmh || "",
                        op_swell_factor: op.op_swell_factor || "",
                        op_total_bank_volume_m3: op.op_total_bank_volume_m3 || "",
                    },

                    geofence: {
                        geometry: op.geometry ? JSON.parse(op.geometry) : null,
                        area_sqm: op.area_sqm || null,
                        area_ha: op.area_ha || null,
                    }
                });

                setLoading(false);
            } catch (error) {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Unable to load operation.",
                });
                setLoading(false);
            }
        };

        fetchOperation();
    }, [id]);

    // 🔥 Save changes
    const handleSave = async () => {
        const meta = attributes.op_metadata || {};

        const finalPayload = {
            name: attributes.op_name,
            priority: attributes.op_priority,
            enabled: attributes.op_enabled,
            geometry: attributes.geofence?.geometry || null,

            area_sqm: attributes.geofence?.area_sqm,
            area_ha: attributes.geofence?.area_ha,

            day_volume_m3_goal: parseFloat(meta.Day_volume_m3_goal) || null,
            op_max_speed_kmh: parseFloat(meta.op_max_speed_kmh) || null,
            op_total_bank_volume_m3: parseFloat(meta.op_total_bank_volume_m3) || null,
            op_swell_factor: parseFloat(meta.op_swell_factor) || null,

            user_id: user.id,
        };

        try {
            await updateOperation(id, finalPayload);

            Swal.fire({
                icon: "success",
                title: "Updated!",
                text: "Operation updated successfully.",
                timer: 1500,
                showConfirmButton: false,
            });

        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error?.response?.data?.message || "Failed to update operation.",
            });
        }
    };


    if (loading) return <p style={{ padding: 30 }}>Loading operation…</p>;


    return (
        <PageLayout menu={<OperationsMenu />} breadcrumbs={["Operations", "Edit"]}>
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
                            value={attributes.op_name}
                            onChange={(e) =>
                                setAttributes((prev) => ({
                                    ...prev,
                                    op_name: e.target.value,
                                }))
                            }
                        />

                        <TextField
                            label="Priority"
                            type="number"
                            fullWidth
                            margin="normal"
                            value={attributes.op_priority}
                            onChange={(e) =>
                                setAttributes((prev) => ({
                                    ...prev,
                                    op_priority: Number(e.target.value),
                                }))
                            }
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={attributes.op_enabled}
                                    onChange={(e) =>
                                        setAttributes((prev) => ({
                                            ...prev,
                                            op_enabled: e.target.checked,
                                        }))
                                    }
                                />
                            }
                            label="Enabled"
                        />

                        <div style={{ marginTop: 40 }}>
                            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                Operation Area
                            </Typography>

                            <GeofenceEditor
                                value={attributes.geofence}
                                onChange={(result) =>
                                    setAttributes((prev) => ({
                                        ...prev,
                                        geofence: {
                                            ...prev.geofence,
                                            geometry: result.geometry || null,
                                            area_sqm: result.area_sqm || null,
                                            area_ha: result.area_ha || null,
                                        },
                                    }))
                                }
                            />
                        </div>

                        {/* METADATA */}
                        <div style={{ marginTop: 30 }}>
                            <Typography variant="subtitle1">Metadata</Typography>

                            <TextField
                                label="Day Volume Goal"
                                fullWidth
                                margin="normal"
                                value={attributes.op_metadata.Day_volume_m3_goal}
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
                                label="Max Speed (km/h)"
                                fullWidth
                                margin="normal"
                                value={attributes.op_metadata.op_max_speed_kmh}
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
                                label="Swell Factor"
                                fullWidth
                                margin="normal"
                                value={attributes.op_metadata.op_swell_factor}
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
                                label="Total Bank Volume (m3)"
                                fullWidth
                                margin="normal"
                                value={attributes.op_metadata.op_total_bank_volume_m3}
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
                            onClick={handleSave}
                            style={{
                                marginTop: 30,
                                padding: "10px 20px",
                                background: "#1976d2",
                                color: "white",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                            }}
                        >
                            Save Changes
                        </button>
                    </AccordionDetails>
                </Accordion>
            </Container>
        </PageLayout>
    );
};

export default OperationEdit;
