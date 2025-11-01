import OperationForm from "./components/OperationForm";
import ZoneForm from "./components/ZoneForm";
import OperationList from "./components/OperationList";
import ZoneList from "./components/ZoneList";
import MapCanvas from "./components/MapCanvas";
import { useOperations } from "../hooks/useOperations";
import { useZones } from "../hooks/useZones";
import { useDevices } from "../hooks/useDevices";
import { useDrawing } from "../hooks/useDrawing";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";

export default function OperationZoneManager() {
  const navigate = useNavigate();

  const ops = useOperations();
  const zones = useZones();
  const allDevices = useDevices(ops.selectedOperationId);
  const drawing = useDrawing();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr" }}>
      <div style={{ padding: 12, background: "var(--panel)", borderRight: "1px solid var(--border)" }}>
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          Back
        </Button>

        {ops.mode === "OPERATION" ? (
          <OperationForm ops={ops} drawing={drawing} />
        ) : (
          <ZoneForm ops={ops} zones={zones} drawing={drawing} />
        )}

        <OperationList ops={ops} />
        {ops.selectedOperationId && (
          <ZoneList ops={ops} zones={zones} allDevices={allDevices} />
        )}
      </div>

      <MapCanvas
        ops={ops}
        zones={zones}
        drawing={drawing}
        allDevices={allDevices}
      />
    </div>
  );
}
