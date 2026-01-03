import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { cn } from "../../lib/utils";
const zoneTypeLabels = {
    ZONE_AREA: "ZONE AREA",
    QUEUE_AREA: "QUEUE AREA",
    LOAD_PAD: "LOAD PAD",
    DUMP_AREA: "DUMP AREA",
};
const zoneTypeColors = {
    ZONE_AREA: "#a855f7", // Purple
    QUEUE_AREA: "#f97316", // Orange
    LOAD_PAD: "#22c55e", // Green
    DUMP_AREA: "#ef4444", // Red
};
const ZonesSidebar = ({ operationId, operationName, zones, selectedZoneId, onZoneSelect, onBack, }) => {
    return (_jsxs("div", { className: "w-56 bg-background border-r border-border flex flex-col h-full", children: [_jsx("button", { onClick: onBack, className: "m-3 px-4 py-2 text-sm font-medium bg-card border border-border rounded-md hover:bg-accent transition-colors text-left", children: "Back" }), _jsx("div", { className: "px-4 py-3 border-b border-border", children: _jsxs("h2", { className: "text-sm font-medium text-muted-foreground", children: ["Zones in Operation #", operationId] }) }), _jsx("div", { className: "flex-1 overflow-y-auto py-2", children: zones.map((zone) => (_jsxs("button", { onClick: () => onZoneSelect(zone), className: cn("w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-l-4", selectedZoneId === zone.id && "bg-accent/30"), style: { borderLeftColor: zoneTypeColors[zone.type] }, children: [_jsx("div", { className: "font-semibold text-sm text-foreground", children: zone.name }), _jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: zoneTypeLabels[zone.type] })] }, zone.id))) })] }));
};
export { zoneTypeColors, zoneTypeLabels };
export default ZonesSidebar;
