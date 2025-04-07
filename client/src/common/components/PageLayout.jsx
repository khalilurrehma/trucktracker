import React, { useState } from "react";
import {
  AppBar,
  Breadcrumbs,
  Divider,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "./LocalizationProvider";

const useStyles = makeStyles((theme) => ({
  desktopRoot: {
    height: "100%",
    display: "flex",
  },
  mobileRoot: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  desktopDrawer: {
    width: (props) =>
      props.miniVariant
        ? `calc(${theme.spacing(8)} + 1px)`
        : theme.dimensions.drawerWidthDesktop,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  mobileDrawer: {
    width: theme.dimensions.drawerWidthTablet,
  },
  mobileToolbar: {
    zIndex: 1,
  },
  content: {
    flexGrow: 1,
    // alignItems: "stretch",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
}));

const PageTitle = ({ breadcrumbs }) => {
  const theme = useTheme();
  const t = useTranslation();

  const pageTitle = breadcrumbs[breadcrumbs.length - 1];
  const desktop = useMediaQuery(theme.breakpoints.up("md"));

  if (desktop) {
    return (
      <Typography variant="h6" noWrap>
        {breadcrumbs[0] === "Operations" ? "Operations" : t(breadcrumbs[0])}
      </Typography>
    );
  }
  return (
    <Breadcrumbs>
      {breadcrumbs.slice(0, -1).map((breadcrumb) => (
        <Typography variant="h6" color="inherit" key={breadcrumb}>
          {t(breadcrumb)}
        </Typography>
      ))}
      {pageTitle === "reportNewCase" ? (
        <Typography variant="h6" color="textPrimary">
          New Case
        </Typography>
      ) : pageTitle === "reportDispatchResult" ? (
        <Typography variant="h6" color="textPrimary">
          Dispatch Result
        </Typography>
      ) : pageTitle === "usageControlReport" ? (
        <Typography variant="h6" color="textPrimary">
          Usage Control
        </Typography>
      ) : pageTitle === "configShifts" ? (
        <Typography variant="h6" color="textPrimary">
          Usage Control
        </Typography>
      ) : pageTitle === "settingsCalcs" ? (
        <Typography variant="h6" color="textPrimary">
          Calculators
        </Typography>
      ) : (
        <Typography variant="h6" color="textPrimary">
          {t(pageTitle)}
        </Typography>
      )}
    </Breadcrumbs>
  );
};

const PageTitle2 = ({ breadcrumbs2 }) => {
  const theme = useTheme();
  const t = useTranslation();

  const desktop = useMediaQuery(theme.breakpoints.up("md"));

  if (desktop) {
    return (
      <Typography variant="h6" noWrap>
        {breadcrumbs2[0] === "Operations" ? "Operations" : t(breadcrumbs2[0])}
      </Typography>
    );
  }
  return (
    <Breadcrumbs>
      {breadcrumbs2.slice(0, -1).map((breadcrumb) => (
        <Typography variant="h6" color="inherit" key={breadcrumb}>
          {t(breadcrumb)}
        </Typography>
      ))}
      <Typography variant="h6" color="textPrimary">
        {breadcrumbs2[breadcrumbs2.length - 1]}
      </Typography>
    </Breadcrumbs>
  );
};

const PageLayout = ({ menu, breadcrumbs, breadcrumbs2, children }) => {
  const classes = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();

  const desktop = useMediaQuery(theme.breakpoints.up("md"));

  const [openDrawer, setOpenDrawer] = useState(false);

  return desktop ? (
    <div className={classes.desktopRoot}>
      <Drawer
        variant="permanent"
        className={classes.desktopDrawer}
        classes={{ paper: classes.desktopDrawer }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            sx={{ mr: 2 }}
            onClick={() => navigate("/")}
          >
            <ArrowBackIcon />
          </IconButton>
          {breadcrumbs && <PageTitle breadcrumbs={breadcrumbs} />}
          {breadcrumbs2 && <PageTitle2 breadcrumbs2={breadcrumbs2} />}
        </Toolbar>
        <Divider />
        {menu}
      </Drawer>
      <div className={classes.content}>{children}</div>
    </div>
  ) : (
    <div className={classes.mobileRoot}>
      <Drawer
        variant="temporary"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        classes={{ paper: classes.mobileDrawer }}
      >
        {menu}
      </Drawer>
      <AppBar
        className={classes.mobileToolbar}
        position="static"
        color="inherit"
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            sx={{ mr: 2 }}
            onClick={() => setOpenDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          {breadcrumbs && <PageTitle breadcrumbs={breadcrumbs} />}
          {breadcrumbs2 && <PageTitle2 breadcrumbs2={breadcrumbs2} />}
        </Toolbar>
      </AppBar>
      <div className={classes.content}>{children}</div>
    </div>
  );
};

export default PageLayout;
