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
        {!superVisor && (
          <MenuItem
            title={t("operationsDispatch")}
            link="/operations/dispatch"
            icon={<SettingsIcon />}
            selected={location.pathname === "/operations/dispatch"}
          />
        )}
        <MenuItem
          title={t("operationsSearchHistory")}
          link="/operations/dispatch/search-history"
          icon={<HistoryIcon />}
          selected={location.pathname === "/operations/dispatch/search-history"}
        />
        <MenuItem
          title={t("operationsCases")}
          link="/operations/cases"
          icon={<NotificationsActiveIcon />}
          selected={location.pathname === "/operations/cases"}
        />
        <MenuItem
          title={t("operationsSubprocesses")}
          link="/operations/subprocesses"
          icon={<AccountTreeIcon />}
          selected={location.pathname === "/operations/subprocesses"}
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
        {!traccarUser?.attributes?.non_admin && (
          <Accordion
            expanded={expanded.includes("rimac_control")}
            onChange={handleChange("rimac_control")}
            sx={accordinSX}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="dispatchbh-content"
              id="dispatchbh-header"
              sx={{ pl: 2, m: 0 }}
            >
              <BusinessIcon sx={{ mr: 4 }} />
              {t("operationRimac")}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <MenuItem
                title={t("operationRimacCases")}
                link="/operations/rimac/cases"
                icon={<CasesIcon sx={{ ml: 2 }} />}
                selected={location.pathname.startsWith(
                  "/operations/rimac/cases"
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
