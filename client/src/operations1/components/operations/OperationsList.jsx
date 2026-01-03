import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Pencil, Bookmark, Map, Trash2, Plus, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
const OperationsList = ({ operations, onEdit, onDelete, onView, onCreate, className, }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    const filteredOperations = operations.filter((op) => op.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const totalPages = Math.ceil(filteredOperations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOperations = filteredOperations.slice(startIndex, startIndex + itemsPerPage);
    return (_jsxs("div", { className: cn("flex flex-col gap-6", className), children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Search geofence...", value: searchQuery, onChange: (e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }, className: "pl-11 h-11" })] }), _jsxs(Button, { onClick: onCreate, className: "gap-2", children: [_jsx(Plus, { className: "w-4 h-4" }), "New Operation"] })] }), _jsxs("div", { className: "grid grid-cols-12 gap-4 px-4 py-3 bg-secondary/50 rounded-lg border border-border/50", children: [_jsx("div", { className: "col-span-4 text-sm font-medium text-primary", children: "Name" }), _jsx("div", { className: "col-span-5 text-sm font-medium text-primary", children: "Metadata" }), _jsx("div", { className: "col-span-3 text-sm font-medium text-primary text-right", children: "Action" })] }), _jsx("div", { className: "flex flex-col gap-3", children: paginatedOperations.length === 0 ? (_jsx("div", { className: "text-center py-12 text-muted-foreground", children: searchQuery ? "No operations found matching your search." : "No operations yet. Create your first one!" })) : (paginatedOperations.map((operation, index) => (_jsxs("div", { className: cn("grid grid-cols-12 gap-4 px-4 py-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm", "hover:bg-card hover:border-primary/30 hover:shadow-glow-sm transition-all duration-200", "animate-fade-in"), style: { animationDelay: `${index * 50}ms` }, children: [_jsx("div", { className: "col-span-4 flex items-center", children: _jsx("span", { className: "font-medium text-foreground", children: operation.name }) }), _jsxs("div", { className: "col-span-5 flex flex-col gap-1 text-sm text-muted-foreground", children: [_jsxs("div", { className: "flex gap-4", children: [_jsxs("span", { children: ["Goal: ", _jsx("span", { className: "text-foreground font-medium", children: operation.goal })] }), _jsxs("span", { children: ["Bank: ", _jsx("span", { className: "text-foreground font-medium", children: operation.bank })] })] }), _jsxs("div", { className: "flex gap-4", children: [_jsxs("span", { children: ["Speed: ", _jsx("span", { className: "text-foreground font-medium", children: operation.speed })] }), _jsxs("span", { children: ["Swell: ", _jsx("span", { className: "text-foreground font-medium", children: operation.swell })] })] })] }), _jsxs("div", { className: "col-span-3 flex items-center justify-end gap-2", children: [_jsx(Button, { variant: "icon", size: "iconSm", onClick: () => onEdit(operation.id), title: "Edit", children: _jsx(Pencil, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: () => navigate(`/operations/${operation.id}`), title: "View on Map", children: _jsx(Map, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: () => navigate(`/operations1/geofence/dashboard/${operation.flespiGeofenceId || operation.id}`), title: "Dashboard", children: _jsx(BarChart3, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "icon", size: "iconSm", onClick: () => onDelete(operation.id), title: "Delete", className: "hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }, operation.id)))) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-center gap-2 pt-4", children: [_jsx(Button, { variant: "ghost", size: "iconSm", onClick: () => setCurrentPage((p) => Math.max(1, p - 1)), disabled: currentPage === 1, children: _jsx(ChevronLeft, { className: "w-4 h-4" }) }), Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (_jsx(Button, { variant: currentPage === page ? "default" : "ghost", size: "iconSm", onClick: () => setCurrentPage(page), className: cn(currentPage === page && "shadow-glow-sm"), children: page }, page))), _jsx(Button, { variant: "ghost", size: "iconSm", onClick: () => setCurrentPage((p) => Math.min(totalPages, p + 1)), disabled: currentPage === totalPages, children: _jsx(ChevronRight, { className: "w-4 h-4" }) })] }))] }));
};
export default OperationsList;







