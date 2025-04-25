import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Toolbar,
  IconButton,
  OutlinedInput,
  InputAdornment,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Badge,
  ListItemButton,
  ListItemText,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import { makeStyles, useTheme } from "@mui/styles";
import MapIcon from "@mui/icons-material/Map";
import ViewListIcon from "@mui/icons-material/ViewList";
import AddIcon from "@mui/icons-material/Add";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import TuneIcon from "@mui/icons-material/Tune";
import { useTranslation } from "../common/components/LocalizationProvider";
import { useDeviceReadonly } from "../common/util/permissions";
import DeviceRow from "./DeviceRow";
import { nativePostMessage } from "../common/components/NativeInterface";

const useStyles = makeStyles((theme) => ({
  toolbar: {
    display: "flex",
    gap: theme.spacing(1),
  },
  filterPanel: {
    display: "flex",
    flexDirection: "column",
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    width: theme.dimensions.drawerWidthTablet,
    // width: "350px",
  },
}));

const MainToolbar = ({
  filteredDevices,
  devicesOpen,
  setDevicesOpen,
  keyword,
  setKeyword,
  filter,
  setFilter,
  filterSort,
  setFilterSort,
  filterMap,
  setFilterMap,
}) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const theme = useTheme();
  const navigate = useNavigate();
  const t = useTranslation();

  const deviceReadonly = useDeviceReadonly();

  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);
  const user = useSelector((state) => state.session.user);

  const toolbarRef = useRef();
  const inputRef = useRef();
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [devicesAnchorEl, setDevicesAnchorEl] = useState(null);

  const deviceStatusCount = (status) =>
    Object.values(devices).filter((d) => d.status === status).length;

  const handleLogout = async () => {
    const notificationToken = window.localStorage.getItem("notificationToken");
    if (notificationToken && !user.readonly) {
      window.localStorage.removeItem("notificationToken");
      const tokens = user.attributes.notificationTokens?.split(",") || [];
      if (tokens.includes(notificationToken)) {
        const updatedUser = {
          ...user,
          attributes: {
            ...user.attributes,
            notificationTokens:
              tokens.length > 1
                ? tokens.filter((it) => it !== notificationToken).join(",")
                : undefined,
          },
        };
        await fetch(`/api/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedUser),
        });
      }
    }

    await fetch("/api/session", { method: "DELETE" });
    nativePostMessage("logout");
    navigate("/login");
    dispatch(sessionActions.updateUser(null));
  };

  return (
    <>
      <Toolbar ref={toolbarRef} className={classes.toolbar}>
        <IconButton edge="start" onClick={() => setDevicesOpen(!devicesOpen)}>
          {devicesOpen ? <MapIcon /> : <ViewListIcon />}
        </IconButton>

        <OutlinedInput
          ref={inputRef}
          placeholder={t("sharedSearchDevices")}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => setDevicesAnchorEl(toolbarRef.current)}
          onBlur={() => setDevicesAnchorEl(null)}
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                onClick={() => setFilterAnchorEl(inputRef.current)}
              >
                <Badge
                  color="info"
                  variant="dot"
                  invisible={!filter.statuses.length && !filter.groups.length}
                >
                  <TuneIcon fontSize="small" />
                </Badge>
              </IconButton>
            </InputAdornment>
          }
          size="small"
          fullWidth
        />
        <Popover
          open={!!devicesAnchorEl && !devicesOpen}
          anchorEl={devicesAnchorEl}
          onClose={() => setDevicesAnchorEl(null)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: Number(theme.spacing(2).slice(0, -2)),
          }}
          marginThreshold={0}
          PaperProps={{
            style: {
              width: `calc(${
                toolbarRef.current?.clientWidth
              }px - ${theme.spacing(4)})`,
            },
          }}
          elevation={1}
          disableAutoFocus
          disableEnforceFocus
        >
          {filteredDevices.slice(0, 3).map((_, index) => {
            return (
              <DeviceRow
                key={filteredDevices[index].id}
                data={filteredDevices}
                index={index}
              />
            );
          })}
          {filteredDevices.length > 3 && (
            <ListItemButton
              alignItems="center"
              onClick={() => setDevicesOpen(true)}
            >
              <ListItemText
                primary={t("notificationAlways")}
                style={{ textAlign: "center" }}
              />
            </ListItemButton>
          )}
        </Popover>
        <Popover
          open={!!filterAnchorEl}
          anchorEl={filterAnchorEl}
          onClose={() => setFilterAnchorEl(null)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <div className={classes.filterPanel}>
            <FormControl>
              <InputLabel>{t("deviceStatus")}</InputLabel>
              <Select
                label={t("deviceStatus")}
                value={filter.statuses}
                onChange={(e) =>
                  setFilter({ ...filter, statuses: e.target.value })
                }
                multiple
              >
                <MenuItem value="online">{`${t(
                  "deviceStatusOnline"
                )} (${deviceStatusCount("online")})`}</MenuItem>
                <MenuItem value="offline">{`${t(
                  "deviceStatusOffline"
                )} (${deviceStatusCount("offline")})`}</MenuItem>
                <MenuItem value="unknown">{`${t(
                  "deviceStatusUnknown"
                )} (${deviceStatusCount("unknown")})`}</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>{t("settingsGroups")}</InputLabel>
              <Select
                label={t("settingsGroups")}
                value={filter.groups}
                onChange={(e) =>
                  setFilter({ ...filter, groups: e.target.value })
                }
                multiple
              >
                {Object.values(groups)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>{t("sharedSortBy")}</InputLabel>
              <Select
                label={t("sharedSortBy")}
                value={filterSort}
                onChange={(e) => setFilterSort(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">{"\u00a0"}</MenuItem>
                <MenuItem value="name">{t("sharedName")}</MenuItem>
                <MenuItem value="lastUpdate">{t("deviceLastUpdate")}</MenuItem>
              </Select>
            </FormControl>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filterMap}
                    onChange={(e) => setFilterMap(e.target.checked)}
                  />
                }
                label={t("sharedFilterMap")}
              />
            </FormGroup>
          </div>
        </Popover>
        <IconButton
          edge="end"
          onClick={() => navigate("/settings/new-device")}
          disabled={deviceReadonly}
        >
          <Tooltip
            open={!deviceReadonly && Object.keys(devices).length === 0}
            title={t("deviceRegisterFirst")}
            arrow
          >
            <AddIcon />
          </Tooltip>
        </IconButton>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            // gap: "2px",
          }}
        >
          <IconButton
            // edge="end"
            onClick={handleLogout}
            disabled={deviceReadonly}
          >
            <Tooltip title="Logout">
              <ExitToAppIcon />
            </Tooltip>
          </IconButton>
          <Typography
            variant="caption"
            color="textSecondary"
            style={{ marginTop: "-10px", textAlign: "center" }}
          >
            {t("loginLogout")}
          </Typography>
        </div>
      </Toolbar>
    </>
  );
};

export default MainToolbar;
