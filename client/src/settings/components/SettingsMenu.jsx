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

const SettingsMenu = () => {
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

  useEffect(() => {
    if (!traccarUser?.superAdmin) {
      fetchCompanyRealmByTraccarId(traccarUser?.id);
    }
  }, [traccarUser]);

  const fetchCompanyRealmByTraccarId = async (userId) => {
    try {
      const apiUrl = `${url}/realm/traccarUser/${userId}`;

      const res = await axios.get(apiUrl);

      if (res.status === 200) {
        setRealmId(res.data.message[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <List>
        <MenuItem
          title={t("sharedPreferences")}
          link="/settings/preferences"
          icon={<SettingsIcon />}
          selected={location.pathname === "/settings/preferences"}
        />
        <MenuItem
          title={t("settingsUser")}
          link={`/settings/user/${userId}`}
          icon={<PersonIcon />}
          selected={location.pathname === `/settings/user/${userId}`}
        />
        {!readonly && (
          <>
            {traccarUser?.superAdmin && (
              <MenuItem
                title="Usage Configuration"
                link="/settings/view-usage"
                icon={<SupervisedUserCircleIcon />}
                selected={location.pathname.startsWith("/settings/view-usage")}
              />
            )}
            {traccarUser?.superAdmin && (
              <MenuItem
                title={"Realms"}
                link="/settings/realms"
                icon={<PersonIcon />}
                selected={location.pathname.startsWith("/settings/realms")}
              />
            )}
            {traccarUser?.superAdmin && (
              <Accordion
                expanded={expanded.includes("admin_calcs")}
                onChange={handleChange("admin_calcs")}
                sx={accordinSX}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="dispatchbh-content"
                  id="dispatchbh-header"
                  sx={{ pl: 2, m: 0 }}
                >
                  <TrackChangesIcon sx={{ mr: 4 }} />
                  Calculators
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <MenuItem
                    title="Reports Calculators"
                    link="/settings/calcs/all/default?type=default"
                    icon={<DifferenceOutlinedIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith(
                      "/settings/calcs/all/default?type=default"
                    )}
                  />
                  <MenuItem
                    title="Custom Reports Calculators"
                    link="/settings/calcs/all/custom?type=custom"
                    icon={<ContentPasteOutlinedIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith(
                      "/settings/calcs/all/custom?type=custom"
                    )}
                  />
                  <MenuItem
                    title="Alert Calculators"
                    link="/settings/calcs/all/notification?type=notification"
                    icon={<ContentPasteOutlinedIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith(
                      "/settings/calcs/all/notification?type=notification"
                    )}
                  />
                </AccordionDetails>
              </Accordion>
            )}
            {/* {!traccarUser?.attributes?.non_admin &&
              !traccarUser?.superAdmin && (
                <Accordion
                  expanded={expanded.includes("company_calcs")}
                  onChange={handleChange("company_calcs")}
                  sx={accordinSX}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="dispatchbh-content"
                    id="dispatchbh-header"
                    sx={{ pl: 2, m: 0 }}
                  >
                    <TrackChangesIcon sx={{ mr: 4 }} />
                    Calculators
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <MenuItem
                      title="Default Calculators"
                      link="/settings/company/default/calculators"
                      icon={<DifferenceOutlinedIcon sx={{ ml: 2 }} />}
                      selected={location.pathname.startsWith(
                        "/settings/company/default/calculators"
                      )}
                    />
                    <MenuItem
                      title="Custom Calculators"
                      link="/settings/company/custom/calculators"
                      icon={<ContentPasteOutlinedIcon sx={{ ml: 2 }} />}
                      selected={location.pathname.startsWith(
                        "/settings/company/custom/calculators"
                      )}
                    />
                  </AccordionDetails>
                </Accordion>
              )} */}
            {traccarUser?.superAdmin && (
              <Accordion
                expanded={expanded.includes("config")}
                onChange={handleChange("config")}
                sx={accordinSX}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="dispatchbh-content"
                  id="dispatchbh-header"
                  sx={{ pl: 2, m: 0 }}
                >
                  <TrackChangesIcon sx={{ mr: 4 }} />
                  Configuration Reports
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <MenuItem
                    title="Categories"
                    link="/settings/categories"
                    icon={<AutoAwesomeMotionIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith(
                      "/settings/categories"
                    )}
                  />
                  <MenuItem
                    title="Reports"
                    link="/settings/reports"
                    icon={<InsertDriveFileIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith("/settings/reports")}
                  />
                </AccordionDetails>
              </Accordion>
            )}
            <Accordion
              expanded={expanded.includes("dispatch")}
              onChange={handleChange("dispatch")}
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
                  title="Assign Devices"
                  link="/settings/config-shifts"
                  icon={<TravelExploreIcon sx={{ ml: 2 }} />}
                  selected={location.pathname.startsWith(
                    "/settings/config-shifts"
                  )}
                />
                <MenuItem
                  title="Shifts"
                  link="/settings/shifts"
                  icon={<AddIcon sx={{ ml: 2 }} />}
                  selected={location.pathname.startsWith("/settings/shifts")}
                />
                <MenuItem
                  title="Drivers Shifts"
                  link="/settings/drivers/shifts"
                  icon={<PersonIcon sx={{ ml: 2 }} />}
                  selected={location.pathname.startsWith(
                    "/settings/drivers/shifts"
                  )}
                />
              </AccordionDetails>
            </Accordion>
            <Accordion
              expanded={expanded.includes("management")}
              onChange={handleChange("management")}
              sx={accordinSX}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="dispatchbh-content"
                id="dispatchbh-header"
                sx={{ pl: 2, m: 0 }}
              >
                <TrackChangesIcon sx={{ mr: 4 }} />
                Nextop Management Platform
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <MenuItem
                  title={"Nextop Devices"}
                  link="/settings/new-devices"
                  icon={<SmartphoneIcon sx={{ ml: 2 }} />}
                  selected={location.pathname.startsWith(
                    "/settings/new-devices"
                  )}
                />
                <MenuItem
                  title={"Nextop Geofence"}
                  link="/new-geofences"
                  icon={<CreateIcon sx={{ ml: 2 }} />}
                  selected={location.pathname.startsWith(
                    "/settings/new-geofences"
                  )}
                />
                {!features.disableGroups && (
                  <MenuItem
                    title={"Nextop Groups"}
                    link="/settings/new-groups"
                    icon={<FolderIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith(
                      "/settings/new-groups"
                    )}
                  />
                )}
                {!traccarUser?.attributes.non_admin && (
                  <MenuItem
                    title="Nextop Drivers"
                    link="/settings/new-drivers"
                    icon={<PersonIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith(
                      "/settings/new-drivers"
                    )}
                  />
                )}
                {traccarUser?.superAdmin && (
                  <MenuItem
                    title={"Nextop Users"}
                    link="/settings/subaccounts"
                    icon={<PeopleIcon sx={{ ml: 2 }} />}
                    selected={
                      location.pathname.startsWith("/settings/subaccounts") &&
                      location.pathname !== `/settings/user/${userId}`
                    }
                  />
                )}
              </AccordionDetails>
            </Accordion>
            {traccarUser?.superAdmin && (
              <Accordion
                expanded={expanded.includes("traccar_related")}
                onChange={handleChange("traccar_related")}
                sx={accordinSX}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="dispatchbh-content"
                  id="dispatchbh-header"
                  sx={{ pl: 2, m: 0 }}
                >
                  <TrackChangesIcon sx={{ mr: 4 }} />
                  Local Management Platform
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <MenuItem
                    title={t("deviceTitle")}
                    link="/settings/devices"
                    icon={<SmartphoneIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith("/settings/device")}
                  />

                  <MenuItem
                    title={t("sharedGeofences")}
                    link="/geofence"
                    icon={<CreateIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith(
                      "/settings/geofence"
                    )}
                  />

                  {!features.disableGroups && (
                    <MenuItem
                      title={t("settingsGroups")}
                      link="/settings/groups"
                      icon={<FolderIcon sx={{ ml: 2 }} />}
                      selected={location.pathname.startsWith("/settings/group")}
                    />
                  )}

                  {!features.disableDrivers && (
                    <MenuItem
                      title={t("sharedDrivers")}
                      link="/settings/drivers"
                      icon={<PersonIcon sx={{ ml: 2 }} />}
                      selected={location.pathname.startsWith(
                        "/settings/driver"
                      )}
                    />
                  )}
                  {!features.disableCalendars && (
                    <MenuItem
                      title={t("sharedCalendars")}
                      link="/settings/calendars"
                      icon={<TodayIcon sx={{ ml: 2 }} />}
                      selected={location.pathname.startsWith(
                        "/settings/calendar"
                      )}
                    />
                  )}
                  {!features.disableComputedAttributes && (
                    <MenuItem
                      title={t("sharedComputedAttributes")}
                      link="/settings/attributes"
                      icon={<StorageIcon sx={{ ml: 2 }} />}
                      selected={location.pathname.startsWith(
                        "/settings/attribute"
                      )}
                    />
                  )}
                  {!features.disableMaintenance && (
                    <MenuItem
                      title={t("sharedMaintenance")}
                      link="/settings/maintenances"
                      icon={<BuildIcon sx={{ ml: 2 }} />}
                      selected={location.pathname.startsWith(
                        "/settings/maintenance"
                      )}
                    />
                  )}
                  {!features.disableSavedCommands && (
                    <MenuItem
                      title={t("sharedSavedCommands")}
                      link="/settings/commands"
                      icon={<PublishIcon sx={{ ml: 2 }} />}
                      selected={location.pathname.startsWith(
                        "/settings/command"
                      )}
                    />
                  )}
                  {supportLink && (
                    <MenuItem
                      title={t("settingsSupport")}
                      link={supportLink}
                      icon={<HelpIcon sx={{ ml: 2 }} />}
                    />
                  )}
                  {traccarUser?.superAdmin && (
                    <MenuItem
                      title={t("settingsUsers")}
                      link="/settings/users"
                      icon={<PeopleIcon sx={{ ml: 2 }} />}
                      selected={location.pathname.startsWith("/settings/user")}
                    />
                  )}
                </AccordionDetails>
              </Accordion>
            )}
            <Accordion
              expanded={expanded.includes("notifications")}
              onChange={handleChange("notifications")}
              sx={accordinSX}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="dispatchbh-content"
                id="dispatchbh-header"
                sx={{ pl: 2, m: 0 }}
              >
                <TrackChangesIcon sx={{ mr: 4 }} />
                Nextop Notifications
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <MenuItem
                  title={t("sharedNotifications")}
                  link="/settings/notifications"
                  icon={<NotificationsIcon sx={{ ml: 2 }} />}
                  selected={location.pathname.endsWith(
                    "/settings/notifications"
                  )}
                />
                {traccarUser?.superAdmin && (
                  <MenuItem
                    title={`Protocol configuration`}
                    link="/settings/protocol/notifications"
                    icon={<NotificationsIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.startsWith(
                      "/settings/protocol/notifications"
                    )}
                  />
                )}
                {traccarUser?.superAdmin && (
                  <MenuItem
                    title={`Notification Logs`}
                    link="/settings/notifications-logs"
                    icon={<NotificationsIcon sx={{ ml: 2 }} />}
                    selected={location.pathname.endsWith("logs")}
                  />
                )}
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </List>
      {!traccarUser?.superAdmin && admin && (
        <>
          <Divider />
          <List>
            <MenuItem
              title={t("serverAnnouncement")}
              link="/settings/announcement"
              icon={<CampaignIcon />}
              selected={location.pathname === "/settings/announcement"}
            />
            {admin && (
              <MenuItem
                title={t("settingsServer")}
                link="/settings/server"
                icon={<StorageIcon />}
                selected={location.pathname === "/settings/server"}
              />
            )}
            {realmId && (
              <MenuItem
                title={t("settingsUsers")}
                link={`/settings/realm/${realmId?.flespi_realm_id}/users`}
                icon={<PeopleIcon />}
                selected={
                  location.pathname.startsWith("/settings/realm") &&
                  location.pathname !== `/settings/user/${userId}`
                }
              />
            )}
          </List>
        </>
      )}
      {traccarUser?.superAdmin && (
        <>
          <Divider />
          <List>
            <MenuItem
              title={t("serverAnnouncement")}
              link="/settings/announcement"
              icon={<CampaignIcon />}
              selected={location.pathname === "/settings/announcement"}
            />
            <MenuItem
              title={t("settingsServer")}
              link="/settings/server"
              icon={<StorageIcon />}
              selected={location.pathname === "/settings/server"}
            />
          </List>
        </>
      )}
    </>
  );
};

export default SettingsMenu;
