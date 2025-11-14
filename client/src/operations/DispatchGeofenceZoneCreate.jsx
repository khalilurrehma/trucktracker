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
    Select,
    MenuItem,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import PageLayout from "@/common/components/PageLayout";
import OperationsMenu from "@/settings/components/OperationsMenu";
import useSettingsStyles from "@/settings/common/useSettingsStyles";
import GeofenceZoneEditor from "@/operations/components/GeofenceZoneEditor";

import { getOperationById } from "@/apis/operationApi";
import { createZone } from "@/apis/zoneApi";

/* ----------------------- METADATA FIELDS PER ZONE TYPE ----------------------- */
const META_FIELDS = {
    QUEUE: [
        { key: "ideal_queue_duration_m", label: "Ideal Queue Duration (min)" },
        { key: "queue_max_vehicles_count", label: "Max Vehicles Count" },
    ],

    LOADING: [
        { key: "load_pad_max_duration_min", label: "Load Pad Max Duration (min)" },
    ],

    DUMP: [
        { key: "dump_area_max_duration_min", label: "Dump Area Max Duration (min)" },
    ],

    ZONE_AREA: [
        { key: "zone_bank_swell_factor", label: "Bank Swell Factor" },
        { key: "zone_bank_volume_m3", label: "Bank Volume (m³)" },
        { key: "zone_max_speed_kmh", label: "Max Speed (km/h)" },
    ],
};

export default function CreateZonePage() {
    const classes = useSettingsStyles();
    const user = useSelector((state) => state.session.user);

    /* ----------------------- GET parent ID FROM URL ----------------------- */
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const parentId = params.get("parent");

    /* ----------------------- STATE ----------------------- */
    const [loading, setLoading] = useState(true);
    const [parentOp, setParentOp] = useState(null);

    const [zone, setZone] = useState({
        name: "",
        enabled: true,
        zoneType: "QUEUE",
        capacity: "",
        geofence: null,
        metadata: { zone_type: "QUEUE" },
    });

    /* ----------------------- LOAD PARENT OPERATION ----------------------- */
    useEffect(() => {
        const loadParent = async () => {
            try {
                const op = await getOperationById(parentId);

                setParentOp({
                    id: op.id,
                    name: op.name,
                    geometry: op.geometry ? JSON.parse(op.geometry) : null,
                });

                setLoading(false);
            } catch (err) {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Cannot load parent operation.",
                });
            }
        };

        loadParent();
    }, [parentId]);

    if (loading) return <p style={{ padding: 20 }}>Loading operation…</p>;

    /* ----------------------- ZONE TYPE CHANGE ----------------------- */
    const handleTypeChange = (type) => {
        const fields = META_FIELDS[type] || [];
        const newMetadata = { zone_type: type };

        fields.forEach((f) => {
            newMetadata[f.key] = zone.metadata[f.key] || "";
        });

        setZone((prev) => ({
            ...prev,
            zoneType: type,
            metadata: newMetadata,
        }));
    };

    /* ----------------------- SAVE ZONE ----------------------- */
    const handleSave = async () => {
        const meta = zone.metadata || {};
        const geo = zone.geofence || {};

        // Map FRONTEND → BACKEND zone type
        const zoneTypeMap = {
            QUEUE: "QUEUE_AREA",
            LOADING: "LOAD_PAD",
            DUMP: "DUMP_AREA",
            ZONE_AREA: "ZONE_AREA",
        };

        const backendZoneType = zoneTypeMap[zone.zoneType];

        const payload = {
            operationId: parentOp.id,
            name: zone.name,
            zoneType: backendZoneType,
            geometry: geo.geometry || null,
            area_sqm: geo.area_sqm || null,
            area_ha: geo.area_ha || null,

            /* ------------------ QUEUE AREA ------------------ */
            ideal_queue_duration_m:
                backendZoneType === "QUEUE_AREA"
                    ? Number(meta.ideal_queue_duration_m || 0)
                    : null,

            max_vehicles_count:
                backendZoneType === "QUEUE_AREA"
                    ? Number(meta.queue_max_vehicles_count || 0)
                    : null,

            /* ------------------ LOADING AREA ------------------ */
            load_pad_max_duration_min:
                backendZoneType === "LOAD_PAD"
                    ? Number(meta.load_pad_max_duration_min || 0)
                    : null,

            /* ------------------ DUMP AREA ------------------ */
            dump_area_max_duration_min:
                backendZoneType === "DUMP_AREA"
                    ? Number(meta.dump_area_max_duration_min || 0)
                    : null,

            /* ------------------ ZONE AREA ------------------ */
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

        console.log("🚀 FINAL ZONE PAYLOAD:", payload);

        await createZone(payload);

        Swal.fire({
            icon: "success",
            title: "Zone Created",
            text: "Your zone has been created inside the operation.",
        });

        /* ----------------------------------------------------------
            RESET FORM AFTER SAVE
        ---------------------------------------------------------- */
        setZone({
            name: "",
            enabled: true,
            zoneType: "QUEUE",
            capacity: "",
            geofence: null,
            metadata: {
                zone_type: "QUEUE",
                ideal_queue_duration_m: "",
                queue_max_vehicles_count: "",
            },
        });
    };



    const metaFields = META_FIELDS[zone.zoneType] || [];

    return (
        <PageLayout menu={<OperationsMenu />} breadcrumbs={["Operations", "Create Zone"]}>
            <Container maxWidth="xl" className={classes.container}>
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">
                            Create Zone in Operation: {parentOp?.name}
                        </Typography>
                    </AccordionSummary>

                    <AccordionDetails className={classes.details}>
                        {/* ------------------- ZONE NAME ------------------- */}
                        <TextField
                            label="Zone Name"
                            fullWidth
                            margin="normal"
                            value={zone.name}
                            onChange={(e) =>
                                setZone((prev) => ({ ...prev, name: e.target.value }))
                            }
                        />

                        {/* ------------------- ENABLED ------------------- */}
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

                        {/* ------------------- ZONE TYPE ------------------- */}
                        <Typography sx={{ mt: 2, mb: 1, opacity: 0.7 }}>
                            Zone Type
                        </Typography>

                        <Select
                            fullWidth
                            value={zone.zoneType}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            sx={{ mb: 2 }}
                        >
                            <MenuItem value="QUEUE">QUEUE</MenuItem>
                            <MenuItem value="LOADING">LOADING</MenuItem>
                            <MenuItem value="DUMP">DUMP</MenuItem>
                            <MenuItem value="ZONE_AREA">ZONE_AREA</MenuItem>
                        </Select>

                        {/* ------------------- CAPACITY ------------------- */}
                        <TextField
                            label="Capacity (optional)"
                            fullWidth
                            type="number"
                            margin="normal"
                            value={zone.capacity}
                            onChange={(e) =>
                                setZone((prev) => ({ ...prev, capacity: e.target.value }))
                            }
                        />

                        {/* ------------------- MAP ------------------- */}
                        <div style={{ marginTop: 40 }}>
                            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                Draw Zone Area (Must be inside Operation)
                            </Typography>

                            <GeofenceZoneEditor
                                value={zone.geofence}
                                parentBoundary={parentOp.geometry}  // NEW
                                onChange={(geo) =>
                                    setZone((prev) => ({
                                        ...prev,
                                        geofence: geo,
                                    }))
                                }
                            />
                        </div>

                        {/* ------------------- METADATA ------------------- */}
                        <div style={{ width: "100%", marginTop: 20 }}>
                            <Typography variant="subtitle1">Metadata</Typography>

                            <TextField
                                label="zone_type"
                                fullWidth
                                margin="normal"
                                value={zone.metadata.zone_type}
                                InputProps={{ readOnly: true }}
                            />
                        </div>

                        {metaFields.map((field) => (
                            <TextField
                                key={field.key}
                                label={field.label}
                                fullWidth
                                margin="normal"
                                value={zone.metadata[field.key] || ""}
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
                            Save Zone
                        </button>
                    </AccordionDetails>
                </Accordion>
            </Container>
        </PageLayout>
    );
}
