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
import { jsx as _jsx } from "react/jsx-runtime";
import { NavLink as RouterNavLink } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "../lib/utils";
const NavLink = forwardRef((_a, ref) => {
    var { className, activeClassName, pendingClassName, to } = _a, props = __rest(_a, ["className", "activeClassName", "pendingClassName", "to"]);
    return (_jsx(RouterNavLink, Object.assign({ ref: ref, to: to, className: ({ isActive, isPending }) => cn(className, isActive && activeClassName, isPending && pendingClassName) }, props)));
});
NavLink.displayName = "NavLink";
export { NavLink };
