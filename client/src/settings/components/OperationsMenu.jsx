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
import { useLocation } from "react-router-dom";
import { useTranslation } from "../../common/components/LocalizationProvider";
import MenuItem from "../../common/components/MenuItem";
import { useAppContext } from "../../AppContext";
import axios from "axios";

const OperationsMenu = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const t = useTranslation();
  const location = useLocation();
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
          title={t("operationsDispatch")}
          link="/operations/dispatch"
          icon={<SettingsIcon />}
          selected={location.pathname === "/operations/dispatch"}
        />
        <MenuItem
          title={t("operationsCases")}
          link="/operations/cases"
          icon={<NotificationsActiveIcon />}
          selected={location.pathname === "/operations/cases"}
        />
        {!traccarUser?.attributes?.non_admin && (
          <Accordion
            expanded={expanded.includes("usage_control")}
            onChange={handleChange("usage_control")}
            sx={accordinSX}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="dispatchbh-content"
              id="dispatchbh-header"
              sx={{ pl: 2, m: 0 }}
            >
              <TrackChangesIcon sx={{ mr: 4 }} />
              {t("operationUsageControl")}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <MenuItem
                title={t("operationRealtime")}
                link="/operations/control-usage"
                icon={<TrackChangesIcon sx={{ ml: 2 }} />}
                selected={location.pathname.startsWith(
                  "/operations/control-usage"
                )}
              />
            </AccordionDetails>
          </Accordion>
        )}
        <MenuItem
          title={t("operationAlarms")}
          link="/operations/alerts"
          icon={<NotificationsNoneIcon />}
          selected={location.pathname.startsWith("/operations/alerts")}
        />
      </List>
    </>
  );
};

export default OperationsMenu;
