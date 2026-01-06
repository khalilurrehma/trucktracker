import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { useTheme } from "@mui/material/styles";
import Sidebar from "./Sidebar.jsx";
import { cn } from "../../lib/utils";
const AppLayout = ({ children, className }) => {
    const theme = useTheme();
    const dataTheme = theme?.palette?.mode === "dark" ? "dark" : "light";
    return (_jsxs("div", { className: "ops-theme flex min-h-screen bg-background", "data-theme": dataTheme, children: [_jsx(Sidebar, {}), _jsx("main", { className: cn("flex-1 gradient-bg overflow-auto", className), children: children })] }));
};
export default AppLayout;
