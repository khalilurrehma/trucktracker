import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

import {
    getAllDeviceAssignments,
    createDeviceAssignment
} from "@/apis/deviceAssignmentApi";


export default function AssignDeviceToParent() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const classes = useSettingsStyles();

    const parentId = Number(searchParams.get("parent"));
    const user = useSelector((state) => state.session.user);

    const [devices, setDevices] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    /* ---------------- FETCH DEVICES + ASSIGNMENTS ---------------- */
    useEffect(() => {
        const load = async () => {
            try {
                const assignmentList = await getAllDeviceAssignments();
                setAssignments(assignmentList);

                const uniqueDevices = [
                    ...new Map(
                        assignmentList.map((item) => [
                            item.device_id,
                            {
                                id: item.device_id,
                                name: item.device_name,
                                flespi: item.flespi_device_id,
                            },
                        ])
                    ).values(),
                ];

                setDevices(uniqueDevices);
            } catch (err) {
                console.error(err);
                Swal.fire("Error", "Failed to load devices", "error");
            }
            setLoading(false);
        };

        load();
    }, []);

    /* ---------------- ASSIGN DEVICE ---------------- */
    const handleAssign = async (deviceId) => {
        try {
            const exists = assignments.some(
                (a) => a.device_id === deviceId && a.operation_id === parentId
            );

            if (exists) {
                return Swal.fire({
                    icon: "warning",
                    title: "Already Assigned",
                    text: "This device is already assigned to this operation.",
                });
            }

            await createDeviceAssignment({
                device_id: deviceId,
                operation_id: parentId,
                zone_id: parentId,
            });

            Swal.fire({
                icon: "success",
                title: "Assigned!",
                text: "Device assigned successfully.",
                timer: 1800,
                showConfirmButton: false,
            });

            navigate(-1);
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Could not assign device", "error");
        }
    };

    if (loading) return (
        <PageLayout
            menu={<OperationsMenu />}
            breadcrumbs={["settingsTitle", "sharedPreferences"]}
        >
            <Container maxWidth="xl" className={classes.container}>
                <Typography variant="subtitle1">Loading devices...</Typography>
            </Container>
        </PageLayout>
    );

    /* ---------------- RENDER ---------------- */
    return (
        <PageLayout
            menu={<OperationsMenu />}
            breadcrumbs={["settingsTitle", "sharedPreferences"]}
        >
            <Container maxWidth="xl" className={classes.container}>

                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">
                            Assign Device to Parent #{parentId}
                        </Typography>
                    </AccordionSummary>

                    <AccordionDetails className={classes.details}>

                        <div style={{ marginBottom: 20 }}>
                            <button
                                onClick={() => navigate(-1)}
                                style={{
                                    padding: "6px 12px",
                                    border: "1px solid #ccc",
                                    borderRadius: 6,
                                    cursor: "pointer"
                                }}
                            >
                                ← Back
                            </button>
                        </div>

                        {devices.length === 0 && (
                            <Typography>No devices found.</Typography>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {devices.map((dev) => (
                                <div
                                    key={dev.id}
                                    style={{
                                        padding: 12,
                                        border: "1px solid #ddd",
                                        borderRadius: 8,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <strong>{dev.name}</strong>
                                        <div style={{ fontSize: 12, opacity: 0.6 }}>
                                            Flespi: {dev.flespi}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleAssign(dev.id)}
                                        style={{
                                            background: "#1976d2",
                                            color: "#fff",
                                            border: "none",
                                            padding: "8px 16px",
                                            borderRadius: 6,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Assign
                                    </button>
                                </div>
                            ))}
                        </div>
                    </AccordionDetails>
                </Accordion>

            </Container>
        </PageLayout>
    );
}
