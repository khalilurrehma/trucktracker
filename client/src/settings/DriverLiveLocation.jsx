import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Circle,
  useLoadScript,
} from "@react-google-maps/api";
import carPng from "../images/car-4-48.png";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import LiveLocationMap from "../reports/components/LiveLocationMap";
import { fetchDeviceLiveLocation } from "../apis/api";
import { useAppContext } from "../AppContext";

const mapContainerStyle = {
  width: "100%",
  height: "500px",
};

const defaultCenter = { lat: 24.8607, lng: 67.0011 }; // Default to Karachi

const DriverLiveLocation = () => {
  const { mqttDeviceLiveLocation } = useAppContext();
  const [deviceLocation, setDeviceLocation] = useState(null);
  const { deviceId, flespiId, lat, long } = useParams();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API,
  });

  useEffect(() => {
    if (deviceId) {
      getDeviceLocation();
    }
  }, [deviceId]);

  useEffect(() => {
    if (mqttDeviceLiveLocation.length > 0) {
      const liveUpdate = mqttDeviceLiveLocation.find(
        (d) => d.deviceId == flespiId
      );

      if (liveUpdate) {
        setDeviceLocation({
          lat: liveUpdate.latitude,
          lng: liveUpdate.longitude,
        });
      }
    }
  }, [mqttDeviceLiveLocation]);

  const getDeviceLocation = async () => {
    const deviceReaTimeLocation = await fetchDeviceLiveLocation(deviceId);
    if (deviceReaTimeLocation) {
      setDeviceLocation({
        lat: deviceReaTimeLocation.latitude,
        lng: deviceReaTimeLocation.longitude,
      });
    } else {
      console.error("Failed to fetch device live location.");
    }
  };

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "configVehicles"]}
    >
      <div style={{ padding: "20px", height: "500px" }}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={14}
          center={deviceLocation || defaultCenter}
        >
          {lat && long && (
            <Marker
              position={{ lat: parseFloat(lat), lng: parseFloat(long) }}
              title="Driver Location"
            />
          )}

          {deviceLocation && (
            <Marker
              position={deviceLocation}
              icon={{
                url: carPng,
                scaledSize: new google.maps.Size(30, 30),
              }}
              animation={google.maps.Animation.DROP}
              title="Device Position"
            />
          )}

          {lat && long && (
            <Circle
              center={{ lat: parseFloat(lat), lng: parseFloat(long) }}
              radius={100}
              options={{
                strokeColor: "blue",
                fillColor: "blue",
                fillOpacity: 0.3,
              }}
            />
          )}
        </GoogleMap>
      </div>
    </PageLayout>
  );
};
export default DriverLiveLocation;
