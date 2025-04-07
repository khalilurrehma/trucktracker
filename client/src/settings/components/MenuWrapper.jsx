import React from "react";
import { Collapse, List, ListItemButton, ListItemText } from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonIcon from "@mui/icons-material/Person";
import MenuItem from "../../common/components/MenuItem";
import { useLocation } from "react-router-dom";

const MenuWrapper = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  const handleToggle = () => {
    setOpen(!open);
  };

  return (
    <>
      <ListItemButton
        onClick={handleToggle}
        selected={location.pathname.startsWith("/settings/control-usage")}
      >
        <ListItemText primary="Usage Control" />
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <MenuItem
            title="Logs"
            link="/settings/control-usage/logs"
            icon={<PersonIcon />}
            selected={location.pathname.startsWith(
              "/settings/control-usage/logs"
            )}
          />
        </List>
      </Collapse>
    </>
  );
};

export default MenuWrapper;
