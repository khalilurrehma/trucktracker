import React, { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import {
  Divider,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import { geofencesActions } from "../store";
import CollectionActions from "../settings/components/CollectionActions2";
import { useCatchCallback } from "../reactHelper";
import axios from "axios";
import { useAppContext } from "../AppContext";
import { getAllGeofences, getGeofencesByUserId } from "../apis/api";

const useStyles = makeStyles(() => ({
  list: {
    maxHeight: "100%",
    overflow: "auto",
  },
  icon: {
    width: "25px",
    height: "25px",
    filter: "brightness(0) invert(1)",
  },
}));

const GeofencesList = ({ onGeofenceSelected }) => {
  const { traccarUser } = useAppContext();
  const classes = useStyles();
  const dispatch = useDispatch();
  // const items = useSelector((state) => state.geofences.items);
  const [items, setItems] = useState([]);

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

  useEffect(() => {
    fetchDataFromAPI();
  }, []);

  const fetchDataFromAPI = async () => {
    try {
      const apiUrl = `${url}/new-geofences`;

      const [newGeofencesResponse, permissionGeofenceResponse] =
        await Promise.all([axios.get(apiUrl), fetch("/api/geofences")]);

      if (
        newGeofencesResponse.status === 200 &&
        permissionGeofenceResponse.ok
      ) {
        const newGeofence = newGeofencesResponse.data.data;

        const permissionGeofences = await permissionGeofenceResponse.json();

        const matchedGeofence = findMatchingGeofences(
          newGeofence,
          permissionGeofences
        );
        setItems(traccarUser?.superAdmin ? newGeofence : matchedGeofence);
      } else {
        throw new Error("Failed to fetch data from one of the APIs");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const findMatchingGeofences = (newGeofence, permissionGeofences) => {
    return newGeofence.filter((newGeofence) => {
      return permissionGeofences.some(
        (permissionGeofence) => permissionGeofence.id === newGeofence.traccarId
      );
    });
  };

  return (
    <List className={classes.list}>
      {Object.values(items).map((item, index, list) => {
        const canPerformActions = () => {
          const userRole = traccarUser?.superAdmin
            ? "superAdmin"
            : traccarUser?.administrator && !traccarUser?.attributes?.non_admin
            ? "admin"
            : traccarUser?.administrator &&
              traccarUser?.attributes?.non_admin === true
            ? "supervisor"
            : null;

          const createdRole = item.created_role || "supervisor";

          if (userRole === "superAdmin") {
            return true;
          } else if (userRole === "admin") {
            return createdRole !== "superAdmin" && createdRole !== null;
          } else if (userRole === "supervisor") {
            return createdRole === "supervisor";
          }
          return false;
        };

        return (
          <Fragment key={item.id}>
            <ListItemButton
              key={item.id}
              onClick={() => onGeofenceSelected(item.id)}
            >
              <ListItemText
                primary={item.name}
                secondary={item.created_by ? item.created_by : "unknown"}
              />
              {canPerformActions() ? (
                <CollectionActions
                  itemId={item.id}
                  editPath="/settings/new-geofence"
                  endpoint="new-geofences"
                  setTimestamp={refreshGeofences}
                />
              ) : (
                <Tooltip title="You do not have permission to perform actions">
                  <span>
                    <IconButton size="small" disabled>
                      <BlockIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </ListItemButton>
            {index < list.length - 1 ? <Divider /> : null}
          </Fragment>
        );
      })}
    </List>
  );
};

export default GeofencesList;
