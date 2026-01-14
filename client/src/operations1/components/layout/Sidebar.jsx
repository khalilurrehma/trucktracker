import React from "react";
import { ArrowLeft, Eye, Lock } from "lucide-react";
import { List } from "@mui/material";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import { useLocation, useNavigate } from "react-router-dom";
import MenuItem from "../../../common/components/MenuItem";

const Sidebar = ({
  showWizard = false,
  wizardSteps = [],
  currentStep = 0,
  onStepClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoadIqActive = location.pathname.startsWith("/operations/geofence/list");
  const canNavigateStep = (index) => index <= currentStep;

  return (
    <aside className="w-64 min-h-screen bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] flex flex-col">
      <div className="p-4 border-b border-[hsl(var(--sidebar-border))]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[hsl(var(--sidebar-foreground))] hover:text-[hsl(var(--sidebar-primary))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-semibold text-lg">Operations</span>
        </button>
      </div>
      <nav className="flex-1 p-4 flex flex-col">
        <List
          sx={{
            mt: 1.5,
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
              mx: 0,
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
        {showWizard && wizardSteps.length > 0 && (
          <div className="mt-4 flex-1 space-y-1">
            {wizardSteps.map((step, index) => {
              const isActive = index === currentStep;
              const isDisabled = !canNavigateStep(index);
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => {
                    if (!isDisabled && onStepClick) {
                      onStepClick(index);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))] shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]"
                      : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-semibold ${
                    isActive
                      ? "border-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary))]"
                      : "border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))]"
                  }`}>
                    {index + 1}
                  </span>
                  <span className="flex-1 text-left">{step}</span>
                  {isDisabled && <Lock className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        )}
      </nav>
      <div className="p-4 border-t border-[hsl(var(--sidebar-border))]">
        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          LoadIQ v1.0
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
