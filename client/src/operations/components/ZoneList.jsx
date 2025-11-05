import React, { useMemo, useState } from "react";
import { FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText } from "@mui/material";

export default function ZoneList({ ops, zones, allDevices }) {
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [selectedDevices, setSelectedDevices] = useState([]);

  const zoneList = useMemo(
    () => zones.zones.filter((z) => z.operationId === ops.selectedOperationId),
    [zones.zones, ops.selectedOperationId]
  );

  const norm = (arr) =>
    (arr || [])
      .map((d) => (typeof d === "object" ? Number(d.device_id || d.id) : Number(d)))
      .filter((n) => !isNaN(n) && n > 0);

  return (
    <div className="card">
      <h4>Zones</h4>
      {zoneList.map((z) => (
        <div key={z.id} style={{ fontSize: 13, marginBottom: 10 }}>
          <b>{z.name}</b> ({z.zoneType})
          <button className="btn-small" onClick={() => zones.deleteZone(z.id)}>🗑 Delete Zone</button>

          <div style={{ marginTop: 6 }}>
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Assign / Manage Devices</InputLabel>
              <Select
                multiple
                label="Assign / Manage Devices"
                value={selectedZoneId === z.id ? selectedDevices : norm(z.devices)}
                onChange={(e) => {
                  setSelectedZoneId(z.id);
                  setSelectedDevices(e.target.value.map((v) => Number(v)));
                }}
                renderValue={(selected) =>
                  selected
                    .map((id) => allDevices.find((d) => d.id === id)?.name || `Device ${id}`)
                    .join(", ")
                }
              >
                {allDevices.map((d) => {
                  const zoneDevices = norm(z.devices);
                  const checkedDevices = selectedZoneId === z.id ? selectedDevices : zoneDevices;
                  return (
                    <MenuItem key={d.id} value={d.id}>
                      <Checkbox checked={checkedDevices.includes(d.id)} disabled={d.completed} />
                      <ListItemText primary={`${d.name}${d.completed ? " (completed)" : ""}`} />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              <button
                className="btn-small"
                onClick={async () => {
                  const devicesToSave = selectedZoneId === z.id ? selectedDevices : norm(z.devices);
                  await zones.assignDevices(z.id, ops.selectedOperationId, allDevices, devicesToSave);
                }}
              >
                💾 Save Assignment
              </button>

            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
