import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/styles";
import { map } from "../core/MapView";
import { geofenceToFeature, geometryToArea } from "../core/mapUtil";
import { errorsActions, geofencesActions } from "../../store";
import { useCatchCallback } from "../../reactHelper";
import theme from "./theme";
import { useAppContext } from "../../AppContext";
import axios from "axios";

const draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    polygon: true,
    line_string: true,
    trash: true,
  },
  userProperties: true,
  styles: [
    ...theme,
    {
      id: "gl-draw-title",
      type: "symbol",
      filter: ["all"],
      layout: {
        "text-field": "{user_name}",
        "text-font": ["Roboto Regular"],
        "text-size": 12,
      },
      paint: {
        "text-halo-color": "white",
        "text-halo-width": 1,
      },
    },
  ],
});

const MapGeofenceEdit = ({ selectedGeofenceId }) => {
  const { traccarUser, traccarToken, subaccount } = useAppContext();
  const [items, setItems] = useState(false);
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const geofences = useSelector((state) => state.geofences.items);
  const userName = useSelector((state) => state.session.user.name);
  const userId = useSelector((state) => state.session.user.id);

  let url;
  if (import.meta.env.DEV) {
    url = `${import.meta.env.VITE_DEV_BACKEND_URL}`;
  } else {
    url = `${import.meta.env.VITE_PROD_BACKEND_URL}`;
  }

  const refreshGeofences = useCatchCallback(async () => {
    try {
      const apiUrl = `${url}/new-geofences`;

      const [newGeofencesResponse, permissionGeofenceResponse] =
        await Promise.all([axios.get(apiUrl), fetch("/api/geofences")]);

      if (
        newGeofencesResponse.status === 200 &&
        permissionGeofenceResponse.ok
      ) {
        const newGeofence = newGeofencesResponse.data.data;
        console.log(newGeofence, "newGeofence");

        const permissionGeofences = await permissionGeofenceResponse.json();
        console.log(permissionGeofences, "permissionGeofences");

        const matchedGeofence = findMatchingGeofences(
          newGeofence,
          permissionGeofences
        );
        console.log(matchedGeofence, "matchedGeofence");

        setItems(userId === 1 ? newGeofence : matchedGeofence);
        // dispatch(
        //   geofencesActions.refresh(
        //     traccarUser?.superAdmin ? newGeofence : matchedGeofence
        //   )
        // );
      } else {
        throw new Error("Failed to fetch data from one of the APIs");
      }
    } catch (error) {
      console.error(error);
    }
  }, [dispatch]);

  const findMatchingGeofences = (newGeofence, permissionGeofences) => {
    return newGeofence.filter((newGeofence) => {
      return permissionGeofences.some(
        (permissionGeofence) => permissionGeofence.id === newGeofence.traccarId
      );
    });
  };

  useEffect(() => {
    refreshGeofences();

    map.addControl(draw, "top-left");
    return () => map.removeControl(draw);
  }, [refreshGeofences]);

  useEffect(() => {
    const listener = async (event) => {
      const feature = event.features[0];

      const newItem = {
        userId: traccarUser?.id,
        subaccount_cid: subaccount,
        isSuperAdmin: traccarUser?.superAdmin || false,
        traccarUserToken: traccarToken?.token,
        administrator:
          traccarUser?.superAdmin === true ||
          traccarUser?.attributes?.non_admin === true
            ? false
            : true,
        superVisor: traccarUser?.attributes?.non_admin || false,
        userName,
        name: "",
        area: geometryToArea(feature.geometry),
      };
      draw.delete(feature.id);
      try {
        const response = await fetch(`${url}/new-geofences`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem),
        });
        if (response.ok) {
          const item = await response.json();
          navigate(`/settings/new-geofence/${item.data.id}`);
        } else {
          throw Error(await response.text());
        }
      } catch (error) {
        dispatch(errorsActions.push(error.message));
      }
    };

    map.on("draw.create", listener);
    return () => map.off("draw.create", listener);
  }, [dispatch, navigate]);

  useEffect(() => {
    const listener = async (event) => {
      const feature = event.features[0];
      try {
        const response = await axios.delete(
          `${url}/new-geofences/${feature.id}`
        );
        // console.log("Responses delete geofences ;", response);
        if (response.status === 200) {
          refreshGeofences();
        } else {
          throw Error(await response.text());
        }
      } catch (error) {
        dispatch(errorsActions.push(error.message));
      }
    };

    map.on("draw.delete", listener);
    return () => map.off("draw.delete", listener);
  }, [dispatch, refreshGeofences]);

  useEffect(() => {
    const listener = async (event) => {
      const feature = event.features[0];
      const item = Object.values(geofences).find((i) => i.id === feature.id);
      if (item) {
        const updatedItem = { ...item, area: geometryToArea(feature.geometry) };
        try {
          const response = await fetch(`${url}/new-geofences/${feature.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedItem),
          });
          if (response.ok) {
            refreshGeofences();
          } else {
            throw Error(await response.text());
          }
        } catch (error) {
          dispatch(errorsActions.push(error.message));
        }
      }
    };

    map.on("draw.update", listener);
    return () => map.off("draw.update", listener);
  }, [dispatch, geofences, refreshGeofences]);

  useEffect(() => {
    draw.deleteAll();
    Object.values(items).forEach((item) => {
      draw.add(geofenceToFeature(theme, item));
    });
  }, [items]);

  useEffect(() => {
    if (selectedGeofenceId) {
      const feature = draw.get(selectedGeofenceId);
      let { coordinates } = feature.geometry;
      if (Array.isArray(coordinates[0][0])) {
        [coordinates] = coordinates;
      }
      const bounds = coordinates.reduce(
        (bounds, coordinate) => bounds.extend(coordinate),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[1])
      );
      const canvas = map.getCanvas();
      map.fitBounds(bounds, {
        padding: Math.min(canvas.width, canvas.height) * 0.1,
      });
    }
  }, [selectedGeofenceId]);

  return null;
};

export default MapGeofenceEdit;
