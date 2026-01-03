import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { ScrollArea } from "../ui/scroll-area";
const AlertsPanel = ({ alerts, isOpen, onClose }) => {
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: "absolute top-3 right-3 w-72 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-xl z-30 animate-fade-in", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-border", children: [_jsx("h3", { className: "font-semibold text-sm text-foreground", children: "ALERTS / EVENTS" }), _jsx("button", { onClick: onClose, className: "p-1 hover:bg-accent rounded transition-colors", children: _jsx(X, { className: "w-4 h-4 text-muted-foreground" }) })] }), _jsx(ScrollArea, { className: "h-56", children: _jsx("div", { className: "p-2 space-y-1", children: alerts.length === 0 ? (_jsx("p", { className: "text-xs text-muted-foreground text-center py-4", children: "No alerts" })) : (alerts.map((alert) => (_jsxs("div", { className: cn("px-3 py-2 rounded text-xs", alert.type === "warning" && "bg-amber-500/10 text-amber-400", alert.type === "error" && "bg-red-500/10 text-red-400", alert.type === "info" && "bg-blue-500/10 text-blue-400"), children: [_jsx("span", { className: "font-medium", children: alert.timestamp }), _jsx("span", { className: "mx-1", children: "\u2013" }), _jsxs("span", { children: ["Vehicle ", alert.vehicleId, ": "] }), _jsx("span", { className: "text-foreground/80", children: alert.message })] }, alert.id)))) }) })] }));
};
export default AlertsPanel;
