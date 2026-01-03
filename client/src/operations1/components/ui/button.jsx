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
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow-sm active:scale-[0.98]",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
            outline: "border border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary/50 active:scale-[0.98]",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
            ghost: "hover:bg-secondary hover:text-foreground",
            link: "text-primary underline-offset-4 hover:underline",
            success: "bg-success text-success-foreground hover:bg-success/90 hover:shadow-lg active:scale-[0.98]",
            glow: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow animate-pulse-glow active:scale-[0.98]",
            icon: "bg-secondary text-secondary-foreground hover:bg-muted hover:text-primary border border-border/50 active:scale-[0.95]",
        },
        size: {
            default: "h-10 px-5 py-2",
            sm: "h-9 rounded-lg px-3 text-xs",
            lg: "h-12 rounded-lg px-8 text-base",
            xl: "h-14 rounded-xl px-10 text-base font-semibold",
            icon: "h-10 w-10",
            iconSm: "h-8 w-8",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
const Button = React.forwardRef((_a, ref) => {
    var { className, variant, size, asChild = false } = _a, props = __rest(_a, ["className", "variant", "size", "asChild"]);
    const Comp = asChild ? Slot : "button";
    return _jsx(Comp, Object.assign({ className: cn(buttonVariants({ variant, size, className })), ref: ref }, props));
});
Button.displayName = "Button";
export { Button, buttonVariants };
