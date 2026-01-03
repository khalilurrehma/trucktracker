import React from "react";
import { ArrowLeft } from "lucide-react";
import { List } from "@mui/material";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import { useLocation, useNavigate } from "react-router-dom";
import MenuItem from "../../../common/components/MenuItem";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-[#e0e0e0] flex flex-col">
      <div className="p-4 border-b border-[#e0e0e0]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#424242] hover:text-[#212121] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-semibold text-lg">Operations</span>
        </button>
      </div>
      <nav className="flex-1">
        <List
          sx={{
            "& .MuiListItemButton-root": {
              color: "#424242",
            },
            "& .MuiListItemButton-root.Mui-selected": {
              backgroundColor: "#e0e0e0",
            },
            "& .MuiListItemButton-root.Mui-selected:hover": {
              backgroundColor: "#d6d6d6",
            },
            "& .MuiListItemIcon-root": {
              color: "#757575",
              minWidth: "40px",
            },
            "& .MuiListItemButton-root.Mui-selected .MuiListItemIcon-root": {
              color: "#424242",
            },
          }}
        >
          <MenuItem
            title="Load IQ"
            link="/operations/geofence/list_new"
            icon={<TrackChangesIcon />}
            selected={location.pathname === "/operations/geofence/list_new"}
          />
        </List>
      </nav>
    </aside>
  );
};

export default Sidebar;
