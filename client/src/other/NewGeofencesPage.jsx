import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Divider,
  Typography,
  IconButton,
  useMediaQuery,
  Toolbar,
} from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import makeStyles from "@mui/styles/makeStyles";
import { useTheme } from "@mui/material/styles";
import Drawer from "@mui/material/Drawer";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useNavigate } from "react-router-dom";
import MapView from "../map/core/MapView";
import MapCurrentLocation from "../map/MapCurrentLocation";
import MapGeofenceEdit from "../map/draw/MapGeofenceEdit2";
import GeofencesList from "./GeofencesList2";
import { useTranslation } from "../common/components/LocalizationProvider";
import MapGeocoder from "../map/geocoder/MapGeocoder";
import { errorsActions, geofencesActions } from "../store";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useCatchCallback } from "../reactHelper";
import axios from "axios";
import { useAppContext } from "../AppContext";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  content: {
    flexGrow: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "row",
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column-reverse",
    },
  },
  drawer: {
    zIndex: 1,
  },
  drawerPaper: {
    position: "relative",
    [theme.breakpoints.up("sm")]: {
      width: theme.dimensions.drawerWidthTablet,
    },
    [theme.breakpoints.down("sm")]: {
      height: theme.dimensions.drawerHeightPhone,
    },
  },
  mapContainer: {
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
  fileInput: {
    display: "none",
  },
}));

const NewGeofencesPage = () => {
  const theme = useTheme();
  const classes = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();
  const { traccarUser } = useAppContext();

  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));

  const [selectedGeofenceId, setSelectedGeofenceId] = useState();

  const handleFile = (event) => {
    const files = Array.from(event.target.files);
    const [file] = files;
    const reader = new FileReader();
    reader.onload = async () => {
      const xml = new DOMParser().parseFromString(reader.result, "text/xml");
      const segment = xml.getElementsByTagName("trkseg")[0];
      const coordinates = Array.from(segment.getElementsByTagName("trkpt"))
        .map(
          (point) => `${point.getAttribute("lat")} ${point.getAttribute("lon")}`
        )
        .join(", ");
      const area = `LINESTRING (${coordinates})`;
      const newItem = { name: "", area };
      try {
        const response = await fetch(`${url}/new-geofences`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem),
        });
        if (response.ok) {
          const item = await response.json();
          navigate(`/settings/new-geofence/${item.id}`);
        } else {
          throw Error(await response.text());
        }
      } catch (error) {
        dispatch(errorsActions.push(error.message));
      }
    };
    reader.onerror = (event) => {
      dispatch(errorsActions.push(event.target.error));
    };
    reader.readAsText(file);
  };

  let url;
  if (import.meta.env.DEV) {
    url = `${import.meta.env.VITE_DEV_BACKEND_URL}`;
  } else {
    url = `${import.meta.env.VITE_PROD_BACKEND_URL}`;
  }

  const refreshGeofences = useCatchCallback(async () => {
    try {
      //   setLoading(true);
      const apiUrl = `${url}/new-geofences`;
      const [newItemsResponse, permissionItemsResponse] = await Promise.all([
        axios.get(apiUrl),
        fetch("/api/geofences"),
      ]);

      if (newItemsResponse.status === 200 && permissionItemsResponse.ok) {
        const newItems = newItemsResponse.data.data;
        const permissionItems = await permissionItemsResponse.json();
        const matchedItems = findMatchingItems(newItems, permissionItems);

        dispatch(
          geofencesActions.refresh(
            traccarUser?.superAdmin ? newItems : matchedItems
          )
        );
      } else {
        throw new Error("Failed to fetch data from one of the APIs");
      }
    } catch (error) {
      console.error(error);
    } finally {
      //   setLoading(false);
    }
  }, [dispatch]);

  const findMatchingItems = (newItems, permissionItems) => {
    return newItems.map((newItem) => {
      const matchingPermission = permissionItems.find(
        (permissionItem) => permissionItem.id === newItem.id
      );
      return {
        ...newItem,
        textChannel: matchingPermission
          ? matchingPermission.textChannel
          : false,
      };
    });
  };

  return (
    <div className={classes.root}>
      <div className={classes.content}>
        <Drawer
          className={classes.drawer}
          anchor={isPhone ? "bottom" : "left"}
          variant="permanent"
          classes={{ paper: classes.drawerPaper }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              sx={{ mr: 2 }}
              onClick={() => navigate(-1)}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              {t("sharedGeofences")}
            </Typography>
            <RefreshIcon onClick={refreshGeofences} />
            <label htmlFor="upload-gpx">
              <input
                accept=".gpx"
                id="upload-gpx"
                type="file"
                className={classes.fileInput}
                onChange={handleFile}
              />
              <IconButton edge="end" component="span" onClick={() => {}}>
                <Tooltip title={t("sharedUpload")}>
                  <UploadFileIcon />
                </Tooltip>
              </IconButton>
            </label>
          </Toolbar>
          <Divider />
          <GeofencesList onGeofenceSelected={setSelectedGeofenceId} />
        </Drawer>
        <div className={classes.mapContainer}>
          <MapView>
            <MapGeofenceEdit selectedGeofenceId={selectedGeofenceId} />
          </MapView>
          <MapCurrentLocation />
          <MapGeocoder />
        </div>
      </div>
    </div>
  );
};

export default NewGeofencesPage;
