import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { ArrowLeft, ChevronUp, Check } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
const ReviewStep = ({ data, onSubmit, onBack, isExpanded = true, onToggleExpand, isSubmitting = false, title = "Finalize Wizard", subtitle = "Review & Submit", submitLabel = "Create Everything", submittingLabel = "Creating...", }) => {
    const items = [
        { label: "Operation", value: data.operationName },
        { label: "QUEUE_AREA", value: data.queueArea },
        { label: "LOAD_PAD", value: data.loadPad },
        { label: "DUMP_AREA", value: data.dumpArea },
        { label: "ZONE_AREA", value: data.zoneArea },
        { label: "Devices assigned", value: data.devicesAssigned.toString() },
    ];
    return (_jsxs("div", { className: "glass-card rounded-xl overflow-hidden animate-slide-up", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-border/50 cursor-pointer hover:bg-secondary/30 transition-colors", onClick: onToggleExpand, children: [_jsx("h2", { className: "text-lg font-display font-semibold", children: title }), _jsx(ChevronUp, { className: cn("w-5 h-5 text-muted-foreground transition-transform duration-300", !isExpanded && "rotate-180") })] }), isExpanded && (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: onBack, className: "gap-2", children: [_jsx(ArrowLeft, { className: "w-4 h-4" }), "Back"] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-lg font-display font-semibold text-primary", children: subtitle }), _jsx("div", { className: "space-y-3 bg-secondary/30 rounded-xl p-5 border border-border/50", children: items.map((item, index) => (_jsxs("div", { className: cn("flex items-center gap-3 animate-fade-in"), style: { animationDelay: `${index * 50}ms` }, children: [_jsx(Check, { className: "w-4 h-4 text-success" }), _jsxs("span", { className: "text-muted-foreground", children: [item.label, ":"] }), _jsx("span", { className: "font-medium text-foreground", children: item.value })] }, item.label))) })] }), _jsx(Button, { onClick: onSubmit, variant: "success", className: "w-full bg-primary text-primary-foreground hover:bg-primary/90", size: "xl", disabled: isSubmitting, children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" }), submittingLabel] })) : (submitLabel) })] }))] }));
};
export default ReviewStep;
