import React, { useEffect, useState } from "react";
import {
  GoogleMap,
  Marker,
  Circle,
  useJsApiLoader,
} from "@react-google-maps/api";
import { ToastContainer, toast } from "react-toastify";
import useReportStyles from "../common/useReportStyles";

const GOOGLE_MAPS_LIBRARIES = ["places", "geometry", "maps"];

const GoogleMapComponent = ({
  initialAddress,
  styles,
  onAddressChange,
  center,
  radius,
}) => {
  const classes = useReportStyles();

  const containerStyle = {
    width: styles?.width || "100%",
    height: styles?.height || "400px",
    borderRadius: "10px",
  };

  const [mapCenter, setMapCenter] = useState({
    lat: center ? parseFloat(center?.lat) : -9.5284198,
    lng: center ? parseFloat(center?.lng) : -77.52920309999999,
  });
  const [markerPosition, setMarkerPosition] = useState({
    lat: parseFloat(center?.lat) || 38.750228,
    lng: parseFloat(center?.lng) || -9.20321,
  });
  const [zoom, setZoom] = useState(16);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const formattedAddress = encodeURIComponent(initialAddress);

  const geocodeAddress = async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAP_API;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${formattedAddress}&key=${apiKey}`
    );
    const data = await response.json();

    if (data.status === "OK") {
      const { lat, lng } = data.results[0].geometry.location;
      setMapCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
      onAddressChange({ lat, lng });
      setZoom(20);
    } else {
      toast.error("Address not found!");
    }
  };

  useEffect(() => {
    if (initialAddress && isLoaded) geocodeAddress();
  }, [initialAddress, isLoaded]);

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <div className={classes.containerMapBorderRadius}>
      <ToastContainer />
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={zoom}
      >
        <Marker position={markerPosition} />
        <Circle
          center={markerPosition}
          radius={radius || 0}
          options={{
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
          }}
        />
      </GoogleMap>
    </div>
  );
};

export default GoogleMapComponent;
