import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { cn } from "../../lib/utils";
const StepIndicator = ({ steps, currentStep, className }) => {
    return (_jsx("div", { className: cn("flex items-center gap-2", className), children: steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (_jsxs(React.Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300", isActive && "bg-primary text-primary-foreground shadow-glow-sm", isCompleted && "bg-success text-success-foreground", !isActive && !isCompleted && "bg-secondary text-muted-foreground"), children: isCompleted ? (_jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) })) : (index + 1) }), _jsx("span", { className: cn("text-sm font-medium hidden md:block transition-colors", isActive && "text-foreground", !isActive && "text-muted-foreground"), children: step })] }), index < steps.length - 1 && (_jsx("div", { className: cn("w-8 lg:w-12 h-0.5 transition-colors", isCompleted ? "bg-success" : "bg-border") }))] }, step));
        }) }));
};
export default StepIndicator;
