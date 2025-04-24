import React, { useEffect } from "react";
import {
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";

import EqualizerIcon from "@mui/icons-material/Equalizer";
import SettingsIcon from "@mui/icons-material/Settings";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import StarIcon from "@mui/icons-material/Star";
import TimelineIcon from "@mui/icons-material/Timeline";
import PauseCircleFilledIcon from "@mui/icons-material/PauseCircleFilled";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AddIcon from "@mui/icons-material/Add";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import RouteIcon from "@mui/icons-material/Route";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PsychologyIcon from "@mui/icons-material/Psychology";
import NotesIcon from "@mui/icons-material/Notes";
import { useLocation } from "react-router-dom";
import { useTranslation } from "../../common/components/LocalizationProvider";
import {
  useAdministrator,
  useRestriction,
} from "../../common/util/permissions";
import MenuItem from "../../common/components/MenuItem";
import { useAppContext } from "../../AppContext";

// const MenuItem = ({ title, link, selected }) => (
//   <ListItemButton key={link} component={Link} to={link} selected={selected}>
//     <ListItemIcon>{icon}</ListItemIcon>
//     <ListItemText primary={title} />
//   </ListItemButton>
// );

const ReportsMenu = () => {
  const t = useTranslation();
  const location = useLocation();
  const { realmUserCalcs, categoriesMenus, companyValidCalcs, traccarUser } =
    useAppContext();
  const admin = useAdministrator();
  const readonly = useRestriction("readonly");

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
          title={t("reportCombined")}
          link="/reports/combined"
          icon={<StarIcon />}
          selected={location.pathname === "/reports/combined"}
        />
        <MenuItem
          title={t("reportRoute")}
          link="/reports/route"
          icon={<TimelineIcon />}
          selected={location.pathname === "/reports/route"}
        />
        <MenuItem
          title={t("reportEvents")}
          link="/reports/new-event"
          icon={<NotificationsActiveIcon />}
          selected={location.pathname === "/reports/new-event"}
        />
        <MenuItem
          title={"Driver Behaviour"}
          link="/reports/driver-behaviour"
          icon={<PsychologyIcon />}
          selected={location.pathname === "/reports/driver-behaviour"}
        />
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
              title="Daily Reports"
              link="/reports/usage-control"
              icon={<NotificationsActiveIcon sx={{ ml: 2 }} />}
              selected={location.pathname === "/reports/usage-control"}
            />
            <MenuItem
              title="Logs"
              link="/reports/usage-control/logs"
              icon={<AssignmentIcon sx={{ ml: 2 }} />}
              selected={location.pathname.startsWith(
                "/reports/usage-control/logs"
              )}
            />
            <MenuItem
              title="Scheduled Devices Logs"
              link="/reports/devices/logs"
              icon={<AssignmentIcon sx={{ ml: 2 }} />}
              selected={location.pathname.startsWith(
                "/reports/usage-control/logs"
              )}
            />
          </AccordionDetails>
        </Accordion>
        {/* <MenuItem
          title={t("reportTrips")}
          link="/reports/trip"
          icon={<PlayCircleFilledIcon />}
          selected={location.pathname === "/reports/trip"}
        />
        <MenuItem
          title={t("reportStops")}
          link="/reports/stop"
          icon={<PauseCircleFilledIcon />}
          selected={location.pathname === "/reports/stop"}
        /> */}
        <MenuItem
          title={t("reportSummary")}
          link="/reports/summary"
          icon={<FormatListBulletedIcon />}
          selected={location.pathname === "/reports/summary"}
        />
        <MenuItem
          title={t("reportChart")}
          link="/reports/chart"
          icon={<TrendingUpIcon />}
          selected={location.pathname === "/reports/chart"}
        />
        <MenuItem
          title={t("reportReplay")}
          link="/replay"
          icon={<RouteIcon />}
        />
      </List>
      {categoriesMenus.message?.length > 0 &&
        categoriesMenus.message?.map((category) => {
          return (
            <Accordion
              key={category.category_id}
              expanded={expanded.includes(`panel${category.category_id}`)}
              onChange={handleChange(`panel${category.category_id}`)}
              sx={accordinSX}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel${category.category_id}bh-content`}
                id={`panel${category.category_id}bh-header`}
                sx={{ pl: 2, m: 0 }}
              >
                <i
                  className={`fas ${category.category_icon}`}
                  style={{
                    width: "56px",
                    fontSize: "19px",
                    padding: "0 0 0 2px",
                  }}
                ></i>
                {category.category_name}
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {category?.reports.length > 0 &&
                  category?.reports
                    ?.filter((report) => {
                      let parsedCalcId = report.calcs_ids;
                      if (
                        !Array.isArray(realmUserCalcs) ||
                        realmUserCalcs.length === 0
                      ) {
                        return true;
                      }

                      return realmUserCalcs.find(
                        (item) => item.id == parsedCalcId
                      );
                    })
                    ?.filter((report) => {
                      if (
                        !Array.isArray(companyValidCalcs) ||
                        companyValidCalcs.length === 0
                      ) {
                        return true;
                      }

                      return companyValidCalcs.find(
                        (item) =>
                          item["metadata.superAdminCalcId"] == report.calcs_ids
                      );
                    })
                    .map((filteredReport) => {
                      let calcId = JSON.parse(filteredReport.calcs_ids);

                      return (
                        <MenuItem
                          key={filteredReport.id}
                          title={filteredReport.name}
                          link={`/reports/${calcId}`}
                          icon={
                            <i
                              className={`fas ${filteredReport.icon}`}
                              style={{
                                width: "56px",
                                fontSize: "19px",
                                padding: "0 0 0 15px",
                              }}
                            ></i>
                          }
                          selected={location.pathname === `/reports/${calcId}`}
                        />
                      );
                    })}
              </AccordionDetails>
            </Accordion>
          );
        })}
      {traccarUser?.superAdmin && (
        <>
          <Divider />
          <List>
            <MenuItem
              title={t("sharedLogs")}
              link="/reports/logs"
              icon={<NotesIcon />}
              selected={location.pathname === "/reports/logs"}
            />
            {!readonly && (
              <MenuItem
                title={t("reportScheduled")}
                link="/reports/scheduled"
                icon={<EventRepeatIcon />}
                selected={location.pathname === "/reports/scheduled"}
              />
            )}
            {admin && (
              <MenuItem
                title={t("statisticsTitle")}
                link="/reports/statistics"
                icon={<BarChartIcon />}
                selected={location.pathname === "/reports/statistics"}
              />
            )}
          </List>
        </>
      )}
    </>
  );
};

export default ReportsMenu;
