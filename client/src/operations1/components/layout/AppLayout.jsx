import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { useTheme } from "@mui/material/styles";
import Sidebar from "./Sidebar.jsx";
import { cn } from "../../lib/utils";
const AppLayout = ({
    children,
    className,
    showWizard = false,
    wizardSteps = [],
    currentStep = 0,
    onStepClick,
}) => {
    const theme = useTheme();
    const dataTheme = theme?.palette?.mode === "dark" ? "dark" : "light";
    return (_jsxs("div", { className: "ops-theme flex min-h-screen bg-background", "data-theme": dataTheme, children: [_jsx(Sidebar, { showWizard: showWizard, wizardSteps: wizardSteps, currentStep: currentStep, onStepClick: onStepClick }), _jsx("main", { className: cn("flex-1 gradient-bg overflow-auto", className), children: children })] }));
};
export default AppLayout;
