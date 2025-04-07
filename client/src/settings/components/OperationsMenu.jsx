import React, { useEffect, useState } from "react";
import {
  Divider,
  List,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CreateIcon from "@mui/icons-material/Create";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SupervisedUserCircleIcon from "@mui/icons-material/SupervisedUserCircle";
import FolderIcon from "@mui/icons-material/Folder";
import PersonIcon from "@mui/icons-material/Person";
import StorageIcon from "@mui/icons-material/Storage";
import BuildIcon from "@mui/icons-material/Build";
import PeopleIcon from "@mui/icons-material/People";
import TodayIcon from "@mui/icons-material/Today";
import AddIcon from "@mui/icons-material/Add";
import PublishIcon from "@mui/icons-material/Publish";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import HelpIcon from "@mui/icons-material/Help";
import CampaignIcon from "@mui/icons-material/Campaign";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import FunctionsIcon from "@mui/icons-material/Functions";
import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";
import DifferenceOutlinedIcon from "@mui/icons-material/DifferenceOutlined";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ContentPasteOutlinedIcon from "@mui/icons-material/ContentPasteOutlined";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "../../common/components/LocalizationProvider";
import {
  useAdministrator,
  useManager,
  useRestriction,
} from "../../common/util/permissions";
import useFeatures from "../../common/util/useFeatures";
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
  const [realmId, setRealmId] = useState(null);

  const readonly = useRestriction("readonly");
  const admin = useAdministrator();
  const manager = useManager();
  const userId = useSelector((state) => state.session.user.id);
  const supportLink = useSelector(
    (state) => state.session.server.attributes.support
  );

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

  const features = useFeatures();

  return (
    <>
      <List>
        <MenuItem
          title="Dispatch"
          link="/operations/dispatch"
          icon={<SettingsIcon />}
          selected={location.pathname === "/operations/dispatch"}
        />
        <MenuItem
          title="Cases"
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
              Usage Control
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <MenuItem
                title="Realtime"
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
          title="Alarms"
          link="/operations/alerts"
          icon={<NotificationsNoneIcon />}
          selected={location.pathname.startsWith("/operations/alerts")}
        />
      </List>
    </>
  );
};

export default OperationsMenu;
