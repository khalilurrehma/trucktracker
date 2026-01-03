import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { cn } from "../../lib/utils";
const PageHeader = ({ title, subtitle, action, className }) => {
    return (_jsxs("div", { className: cn("flex items-center justify-between pb-6 border-b border-border/50", className), children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold text-foreground", children: title }), subtitle && (_jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: subtitle }))] }), action && (_jsx("div", { className: "flex items-center gap-3", children: action }))] }));
};
export default PageHeader;
