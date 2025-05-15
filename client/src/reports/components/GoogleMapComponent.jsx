import React, { useEffect, useRef } from "react";
import { GoogleMap, Marker, Circle } from "@react-google-maps/api";
import carPng from "../../images/car-4-48.png";
import { ToastContainer, toast } from "react-toastify";
import useReportStyles from "../common/useReportStyles";
import { checkDeviceRadius } from "../../apis/api";

const GoogleMapComponent = ({
  initialAddress,
  styles,
  onAddressChange,
  center,
  radius,
}) => {
  const containerStyle = {
    width: styles?.width || "100%",
    height: styles?.height || "400px",
    borderRadius: "10px",
  };

  const [mapCenter, setMapCenter] = React.useState({
    lat: center ? parseFloat(center?.lat) : -9.5284198,
    lng: center ? parseFloat(center?.lng) : -77.52920309999999,
  });
  const [markerPosition, setMarkerPosition] = React.useState({
    lat: parseFloat(center?.lat) || 38.750228,
    lng: parseFloat(center?.lng) || -9.20321,
  });

  const [zoom, setZoom] = React.useState(16);
  const classes = useReportStyles();
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
      // toast.error("Address not found!");
    }
  };

  React.useEffect(() => {
    if (initialAddress) geocodeAddress();
  }, [initialAddress]);

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
          radius={false || radius}
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
