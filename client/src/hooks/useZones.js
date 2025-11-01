import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  getAllZones,
  createZone,
  deleteZone as apiDeleteZone,
} from "../apis/zoneApi";
import {
  createDeviceAssignment,
  deleteDeviceAssignment,
  markDeviceAssignmentComplete,
} from "../apis/deviceAssignmentApi";

export function useZones() {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    (async () => {
      const z = await getAllZones();
      setZones(z || []);
    })();
  }, []);

  const saveZone = async (payload) => {
    const z = await createZone(payload);
    setZones((old) => [z, ...old]);
    Swal.fire({ icon: "success", title: "Zone saved!", timer: 1200, showConfirmButton: false });
    return z;
  };

  const deleteZone = async (id) => {
    await apiDeleteZone(id);
    setZones((old) => old.filter((z) => z.id !== id));
    Swal.fire({ icon: "success", title: "Zone deleted" });
  };

  // Assign devices (add/remove diff)
  const assignDevices = async (zoneId, selectedOperationId, allDevices, selectedDeviceIdsRaw) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    // Normalize ids to number
    const normalize = (arr) =>
      (arr || [])
        .map((d) => (typeof d === "object" ? Number(d.device_id || d.id) : Number(d)))
        .filter((n) => !isNaN(n) && n > 0);

    const current = normalize(zone.devices);
    const selected = normalize(selectedDeviceIdsRaw);

    const toAdd = selected.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !selected.includes(id));

    // Optimistic UI
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, devices: selected } : z))
    );

    for (const id of toAdd) {
      await createDeviceAssignment({
        device_id: id,
        operation_id: Number(selectedOperationId),
        zone_id: Number(zoneId),
      });
    }
    for (const id of toRemove) {
      await deleteDeviceAssignment({
        device_id: id,
        operation_id: Number(selectedOperationId),
        zone_id: Number(zoneId),
      });
    }

    Swal.fire({ icon: "success", title: "Device assignments updated!", timer: 1200, showConfirmButton: false });
  };

  const markCompleted = async (zoneId, allDevices) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone || !zone.devices?.length) {
      return Swal.fire({ icon: "warning", title: "No devices assigned to this zone." });
    }

    for (const id of zone.devices) {
      const deviceId = typeof id === "object" ? id.device_id : id;
      await markDeviceAssignmentComplete(deviceId);
    }

    // Mark completed in local devices if found
    setZones((prev) =>
      prev.map((z) =>
        z.id === zoneId
          ? {
              ...z,
              devices: z.devices.map((id) => {
                const deviceId = typeof id === "object" ? id.device_id : id;
                const dev = allDevices.find((d) => d.id === deviceId);
                if (dev) dev.completed = true;
                return id;
              }),
            }
          : z
      )
    );

    Swal.fire({ icon: "success", title: "✅ Devices marked as completed!", timer: 1500, showConfirmButton: false });
  };

  return { zones, saveZone, deleteZone, assignDevices, markCompleted, setZones };
}
