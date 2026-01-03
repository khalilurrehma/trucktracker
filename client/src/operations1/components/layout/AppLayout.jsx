import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import Sidebar from "./Sidebar.jsx";
import { cn } from "../../lib/utils";
const AppLayout = ({ children, className }) => {
    return (_jsxs("div", { className: "flex min-h-screen bg-background", children: [_jsx(Sidebar, {}), _jsx("main", { className: cn("flex-1 gradient-bg overflow-auto", className), children: children })] }));
};
export default AppLayout;
