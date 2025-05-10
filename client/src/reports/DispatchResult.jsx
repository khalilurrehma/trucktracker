import React, { useEffect, useState } from "react";
import { Box, Button, Grid, MenuItem, TextField } from "@mui/material";
import {
  GoogleMap,
  Marker,
  Circle,
  useJsApiLoader,
  InfoWindow,
} from "@react-google-maps/api";
import carPng from "../images/car-4-48.png";
import { useSelector } from "react-redux";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import axios from "axios";

const mapContainerStyle = {
  width: "100%",
  height: "500px",
  borderRadius: "10px",
};

const centerDefault = {
  lat: -12.0464,
  lng: -77.0428,
};

function generateCaseNumber() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const DispatchResult = () => {
  let url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [mapCenter, setMapCenter] = useState(centerDefault);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [radius] = useState(2000);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const positionsObj = useSelector((state) => state.session.positions) || {};
  const positions = Array.isArray(positionsObj)
    ? positionsObj
    : Object.values(positionsObj);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API,
  });

  const handleShowClick = async () => {
    if (!address) return;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&components=locality:Lima|country:PE&key=${
        import.meta.env.VITE_GOOGLE_MAP_API
      }`
    );
    const data = await response.json();
    if (data.status === "OK") {
      const { lat, lng } = data.results[0].geometry.location;
      setMapCenter({ lat, lng });
      setMarkerPosition({ lat, lng });
    } else {
      alert("Address not found");
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const { data } = await axios.get(`${url}/all/device/service-types`);
      if (data.status) setServiceTypes(data.message);
    } catch (error) {
      console.error("Error fetching service types:", error);
    }
  };

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  const devicesInRadius = positions.filter((pos) => {
    if (!markerPosition) return true;
    const distance = getDistanceFromLatLonInMeters(
      pos.latitude,
      pos.longitude,
      markerPosition.lat,
      markerPosition.lng
    );
    return distance <= radius;
  });

  const selectedDevice = devicesInRadius.find(
    (pos) => pos.deviceId === selectedDeviceId
  );

  console.log("Devices under radius:", devicesInRadius);

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "reportDispatchResult"]}
    >
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Service Type"
              fullWidth
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
            >
              {serviceTypes.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Case Number"
              fullWidth
              value={caseNumber}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              onClick={() => setCaseNumber(generateCaseNumber())}
              sx={{ height: "56px", width: "100%" }}
            >
              Generate Case
            </Button>
          </Grid>

          <Grid item xs={12} sm={10}>
            <TextField
              label="Incident Address"
              fullWidth
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="outlined"
              disabled={!address}
              onClick={handleShowClick}
              sx={{ height: "56px", width: "100%" }}
            >
              Show
            </Button>
          </Grid>
        </Grid>

        {isLoaded && (
          <Box sx={{ mt: 3 }}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={15}
            >
              {markerPosition && (
                <>
                  <Marker position={markerPosition} />
                  <Circle
                    center={markerPosition}
                    radius={radius}
                    options={{
                      fillColor: "#FF0000",
                      fillOpacity: 0.2,
                      strokeWeight: 1,
                    }}
                  />
                </>
              )}
              {devicesInRadius.map((pos) => (
                <Marker
                  key={pos.deviceId}
                  position={{ lat: pos.latitude, lng: pos.longitude }}
                  icon={{
                    url: carPng,
                    scaledSize: new window.google.maps.Size(30, 30),
                  }}
                  onClick={() => setSelectedDeviceId(pos.deviceId)}
                  title={`Device ${pos.deviceId}`}
                />
              ))}
              {selectedDevice && (
                <InfoWindow
                  position={{
                    lat: selectedDevice.latitude,
                    lng: selectedDevice.longitude,
                  }}
                  onCloseClick={() => setSelectedDeviceId(null)}
                >
                  <div>
                    <h3>
                      {selectedDevice.attributes?.["device.name"] ??
                        selectedDevice.deviceId}
                    </h3>
                    <p>
                      Fix Time:{" "}
                      {new Date(selectedDevice.fixTime).toLocaleString()}
                    </p>
                    <p>
                      Address:{" "}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedDevice.latitude},${selectedDevice.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Show Address
                      </a>
                    </p>
                    <p>Speed: {(selectedDevice.speed || 0).toFixed(2)} km/h</p>
                    <p>
                      Distance:{" "}
                      {((selectedDevice.totalDistance || 0) / 1000).toFixed(2)}
                      km
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </Box>
        )}
      </Box>
    </PageLayout>
  );
};

export default DispatchResult;
