var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { cn } from "../../lib/utils";
const Input = React.forwardRef((_a, ref) => {
    var { className, type, label } = _a, props = __rest(_a, ["className", "type", "label"]);
    return (_jsxs("div", { className: "relative w-full", children: [label && (_jsx("label", { className: "absolute -top-2.5 left-3 px-1 text-xs font-medium text-muted-foreground bg-card", children: label })), _jsx("input", Object.assign({ type: type, className: cn("flex h-12 w-full rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground ring-offset-background transition-all duration-200", "placeholder:text-muted-foreground", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50", "hover:border-border/80 hover:bg-secondary/70", "disabled:cursor-not-allowed disabled:opacity-50", label && "pt-4", className), ref: ref }, props))] }));
});
Input.displayName = "Input";
export { Input };
