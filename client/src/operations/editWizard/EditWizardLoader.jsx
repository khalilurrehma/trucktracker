// src/operations/editWizard/EditWizardLoader.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";

import { useEditWizard } from "./EditWizardContext";
import EditWizardRouter from "./EditWizardRouter";

import { getOperationById } from "@/apis/operationApi";
import { getZonesByOperationId } from "@/apis/zoneApi";
import { getAllDeviceAssignments } from "@/apis/deviceAssignmentApi";

export default function EditWizardLoader() {
  const { operationId } = useParams();
  const {
    setOperation,
    setQueueZone,
    setLoadPadZone,
    setDumpZone,
    setZoneArea,
    setAssignedDevices,
  } = useEditWizard();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        /* ---- Load Operation ---- */
        const op = await getOperationById(operationId);

        setOperation({
          id: op.id,
          name: op.name,
          priority: op.priority,
          enabled: op.enabled,
          geometry: JSON.parse(op.geometry || "{}"),
          area_sqm: op.area_sqm,
          area_ha: op.area_ha,
          day_volume_m3_goal: op.day_volume_m3_goal || "",
          op_max_speed_kmh: op.op_max_speed_kmh || "",
          op_swell_factor: op.op_swell_factor || "",
          op_total_bank_volume_m3: op.op_total_bank_volume_m3 || "",
        });

        /* ---- Load Zones ---- */
        const zones = await getZonesByOperationId(operationId);

        const zoneByType = (type) => zones.find((z) => z.zoneType === type);

        const prepareZone = (z) =>
          z && {
            id: z.id,
            name: z.name,
            enabled: z.enabled,
            zoneType: z.zoneType,
            geofence: {
              geometry: JSON.parse(z.geometry || "{}"),
              area_sqm: z.area_sqm,
              area_ha: z.area_ha,
            },
            metadata: {
              zone_type: z.zoneType,
              ideal_queue_duration_m: z.ideal_queue_duration_m || "",
              max_vehicles_count: z.max_vehicles_count || "",
              load_pad_max_duration_min: z.load_pad_max_duration_min || "",
              dump_area_max_duration_min: z.dump_area_max_duration_min || "",
              zone_max_speed_kmh: z.zone_max_speed_kmh || "",
              zone_bank_volume_m3: z.zone_bank_volume_m3 || "",
              zone_bank_swell_factor: z.zone_bank_swell_factor || "",
            },
          };

        setQueueZone(prepareZone(zoneByType("QUEUE_AREA")));
        setLoadPadZone(prepareZone(zoneByType("LOAD_PAD")));
        setDumpZone(prepareZone(zoneByType("DUMP_AREA")));
        setZoneArea(prepareZone(zoneByType("ZONE_AREA")));

        /* ---- Load Device Assignments ---- */
        const allA = await getAllDeviceAssignments();
        const assigned = allA
          .filter((a) => a.operation_id === Number(operationId))
          .map((a) => a.device_id);

        setAssignedDevices(assigned);

        setLoading(false);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to load edit wizard data.", "error");
      }
    };

    load();
  }, [operationId]);

  if (loading) return <p style={{ padding: 20 }}>Loading edit wizard…</p>;

  return <EditWizardRouter />;
}
