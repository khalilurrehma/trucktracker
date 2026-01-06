import React from "react";
import { ArrowLeft } from "lucide-react";
import { List } from "@mui/material";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import { useLocation, useNavigate } from "react-router-dom";
import MenuItem from "../../../common/components/MenuItem";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoadIqActive = location.pathname.startsWith("/operations/geofence/list");

  return (
    <aside className="w-72 min-h-screen bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] flex flex-col">
      <div className="p-4 border-b border-[hsl(var(--sidebar-border))]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-primary))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-semibold text-lg">Operations</span>
        </button>
      </div>
      <nav className="flex-1">
        <List
          sx={{
            "& .MuiListItemButton-root": {
              color: "hsl(var(--sidebar-foreground))",
            },
            "& .MuiListItemButton-root.Mui-selected": {
              backgroundColor: "hsl(var(--sidebar-accent))",
            },
            "& .MuiListItemButton-root.Mui-selected:hover": {
              backgroundColor: "hsl(var(--sidebar-accent))",
            },
            "& .MuiListItemIcon-root": {
              color: "hsl(var(--sidebar-foreground))",
              minWidth: "40px",
            },
            "& .MuiListItemButton-root.Mui-selected .MuiListItemIcon-root": {
              color: "hsl(var(--sidebar-primary))",
            },
          }}
        >
          <MenuItem
            title="Load IQ"
            link="/operations/geofence/list"
            icon={<TrackChangesIcon />}
            selected={isLoadIqActive}
            sx={{
              color: "hsl(var(--sidebar-foreground))",
              borderRadius: "10px",
              mx: 1,
              my: 0.5,
              "& .MuiListItemIcon-root": {
                color: "hsl(var(--sidebar-foreground))",
              },
              "& .MuiListItemText-primary": {
                fontWeight: 600,
              },
              "&.Mui-selected": {
                backgroundColor: "hsl(var(--sidebar-accent))",
                boxShadow: "inset 3px 0 0 hsl(var(--sidebar-primary))",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "hsl(var(--sidebar-accent))",
              },
              "&.Mui-selected .MuiListItemIcon-root": {
                color: "hsl(var(--sidebar-primary))",
              },
              "&.Mui-selected .MuiListItemText-primary": {
                color: "hsl(var(--sidebar-primary))",
              },
            }}
          />
        </List>
      </nav>
    </aside>
  );
};

export default Sidebar;
