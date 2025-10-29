import React, { useEffect } from "react";
import {
  List,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import BusinessIcon from "@mui/icons-material/Business";
import CasesIcon from "@mui/icons-material/Cases";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HistoryIcon from "@mui/icons-material/History";
import { useLocation } from "react-router-dom";
import { useTranslation } from "../../common/components/LocalizationProvider";
import MenuItem from "../../common/components/MenuItem";
import { useAppContext } from "../../AppContext";
import axios from "axios";
import { useSuperVisor } from "../../common/util/permissions";

const OperationsMenu = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const t = useTranslation();
  const location = useLocation();
  const superVisor = useSuperVisor();
  const { traccarUser } = useAppContext();

  const [expanded, setExpanded] = React.useState([]);

  const saveToLocalStorage = (expandedPanels) => {
    localStorage.setItem("expandedPanels", JSON.stringify(expandedPanels));
  };

  const loadFromLocalStorage = () => {
    const storedData = localStorage.getItem("expandedPanels");
    return storedData ? JSON.parse(storedData) : [];
  };

  useEffect(() => {
    setExpanded(loadFromLocalStorage());
  }, []);

  useEffect(() => {
    saveToLocalStorage(expanded);
  }, [expanded]);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded((prevExpanded) =>
      isExpanded ? [panel] : prevExpanded.filter((p) => p !== panel)
    );
  };

  const accordinSX = {
    backgroundImage: "none",
    boxShadow: "none",
    backgroundColor: "transparent",
    "::before": {
      content: "none",
    },
    "&.Mui-expanded": {
      margin: 0,
    },
  };

  return (
    <>
      <List>
          <MenuItem
          title="Loadiq"
          link="/operations/geofence/map"
          icon={<TrackChangesIcon />}
          selected={location.pathname === "/operations/geofence/map"}
        />
      </List>
    </>
  );
};

export default OperationsMenu;
