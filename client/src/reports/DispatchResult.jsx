import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Autocomplete,
  TextField,
  Chip,
} from "@mui/material";
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
import { useAppContext } from "../AppContext";
import {
  formatTime,
  generateCaseNumber,
  getAuthenticatedAudioUrl,
  getDistanceFromLatLonInMeters,
} from "../settings/common/New.Helper";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DispatchResultTable from "./components/DispatchResultTable";
import DispatchDialog from "./components/DispatchDialog";
import dayjs from "dayjs";
import { useTranslation } from "../common/components/LocalizationProvider";

const GOOGLE_MAPS_LIBRARIES = ["places", "maps"];
const radiusOptions = [
  { label: "500m", value: 500 },
  { label: "1km", value: 1000 },
  { label: "2km", value: 2000 },
  { label: "3km", value: 3000 },
  { label: "5km", value: 5000 },
  { label: "10km", value: 10000 },
  { label: "20km", value: 20000 },
  { label: "50km", value: 50000 },
];

const DispatchResult = () => {
  let url = import.meta.env.DEV
    ? import.meta.env.VITE_DEV_BACKEND_URL
    : import.meta.env.VITE_PROD_BACKEND_URL;

  const userId = useSelector((state) => state.session.user.id);
  const t = useTranslation();
  const centerDefault = { lat: -12.0464, lng: -77.0428 };
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [mapZoom, setMapZoom] = useState(15);
  const [peruTime, setPeruTime] = useState(new Date());
  const [serviceTypes, setServiceTypes] = useState([]);
  const [newAllDevices, setNewAllDevices] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState([]);
  const [filteredDeviceIds, setFilteredDeviceIds] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(null);
  const [caseNumber, setCaseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [mapCenter, setMapCenter] = useState(centerDefault);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [radius, setRadius] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assignedDevices, setAssignedDevices] = useState([]);
  const [placeOptions, setPlaceOptions] = useState([]);

  const positionsObj = useSelector((state) => state.session.positions) || {};
  const positions = Array.isArray(positionsObj)
    ? positionsObj
    : Object.values(positionsObj);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API,
    libraries: GOOGLE_MAPS_LIBRARIES,
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
      if (map) {
        map.panTo({ lat, lng });
      }
    } else {
      alert("Address not found");
    }
  };

  const fetchNewAllDevices = async () => {
    const currentDate = dayjs().format("YYYY-MM-DD");
    try {
      const apiUrl = `${url}/new-devices?date=${currentDate}`;
      const res = await axios.get(apiUrl);

      if (res.status === 200) {
        const formattedDevice = res.data.data.map((device) => {
          return {
            id: device.traccarId,
            name: device.name,
            uniqueId: device.uniqueId,
            category: device.category,
            contact: device.contact,
            disabled: device.disabled,
            phone: device.phone,
            expirationTime: device.expirationTime,
            groupId: device.groupId,
            lastUpdate: device.lastUpdate,
            model: device.model,
            status: device.traccar_status,
            attributes: device.attributes,
            services: device.services,
            costByKm: device.cost_by_km,
            initialBase: device.initialBase,
          };
        });
        setNewAllDevices(formattedDevice);
      } else {
        throw new Error("Failed to fetch data from one of the APIs");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const { data } =
        userId === 1
          ? await axios.get(`${url}/all/device/service-types`)
          : await axios.get(`${url}/all/device/service-types/user/${userId}`);
      if (data.status) setServiceTypes(data.message);
    } catch (error) {
      console.error("Error fetching service types:", error);
    }
  };

  useEffect(() => {
    fetchNewAllDevices();
    fetchServiceTypes();
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const peruDate = new Date(utc - 5 * 60 * 60000);
      setPeruTime(peruDate);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!newAllDevices || selectedServiceType.length === 0) {
      return;
    }

    const filteredDevices = newAllDevices.filter((device) => {
      const deviceServiceIds = (device.services || []).map(
        (service) => service.serviceId
      );

      return selectedServiceType.some((selectedService) =>
        deviceServiceIds.includes(selectedService.id)
      );
    });

    setFilteredDeviceIds(filteredDevices.map((device) => device.id));
  }, [selectedServiceType, newAllDevices]);

  const devicesInRadius = positions.filter((pos) => {
    if (!filteredDeviceIds.includes(pos.deviceId)) return false;
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

  const handleAssignClick = () => {
    const processDevices = devicesInRadius.filter((device) =>
      selectedDeviceIds.includes(device.deviceId)
    );

    if (processDevices.length > 0) {
      setAssignedDevices(processDevices);
      setOpenAssignModal(true);
    }
  };

  useEffect(() => {
    if (!isLoaded || !window.google) return;

    const autocompleteService =
      new window.google.maps.places.AutocompleteService();

    const fetchPlacePredictions = async (input) => {
      if (!input) {
        setPlaceOptions([]);
        return;
      }

      try {
        const response = await autocompleteService.getPlacePredictions({
          input,
          componentRestrictions: { country: "PE" },
          types: ["address"],
        });

        setPlaceOptions(
          response.predictions.map((prediction) => ({
            label: prediction.description,
            placeId: prediction.place_id,
          }))
        );
      } catch (error) {
        console.error("Error fetching place predictions:", error);
        setPlaceOptions([]);
      }
    };

    if (address) {
      fetchPlacePredictions(address);
    }
  }, [address, isLoaded]);

  const handlePlaceSelect = async (newValue) => {
    if (!newValue) {
      setAddress("");
      setMarkerPosition(null);
      setMapCenter(centerDefault);
      if (map) {
        map.panTo(centerDefault);
      }
      return;
    }

    setAddress(newValue.label);

    const tempDiv = document.createElement("div");
    const placesService = new window.google.maps.places.PlacesService(tempDiv);

    placesService.getDetails(
      { placeId: newValue.placeId, fields: ["geometry"] },
      (place, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place.geometry
        ) {
          const { lat, lng } = place.geometry.location;
          const newPosition = { lat: lat(), lng: lng() };
          setMapCenter(newPosition);
          setMarkerPosition(newPosition);
          if (map) {
            map.panTo(newPosition);
          }
        } else {
          console.error("PlacesService failed:", status);
          alert("Unable to retrieve location details");
        }
        tempDiv.remove();
      }
    );
  };

  return (
    <PageLayout
      menu={<OperationsMenu />}
      breadcrumbs={["Operations", "reportDispatchResult"]}
    >
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Autocomplete
              multiple
              id="service-type-selector"
              options={serviceTypes}
              getOptionLabel={(option) => option.name || ""}
              value={selectedServiceType}
              onChange={(e, newValue) => setSelectedServiceType(newValue)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Service Types"
                  variant="outlined"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={index}
                    label={option.name}
                    {...getTagProps({ index })}
                  />
                ))
              }
            />
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

          <Grid item xs={12} sm={7}>
            <Autocomplete
              id="address-autocomplete"
              options={placeOptions}
              getOptionLabel={(option) => option.label || ""}
              value={
                placeOptions.find((option) => option.label === address) || null
              }
              onChange={(event, newValue) => handlePlaceSelect(newValue)}
              onInputChange={(event, newInputValue) =>
                setAddress(newInputValue)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Incident Address"
                  fullWidth
                  variant="outlined"
                />
              )}
              isOptionEqualToValue={(option, value) =>
                option.placeId === value.placeId
              }
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Autocomplete
              id="radius-autocomplete"
              fullWidth
              options={radiusOptions}
              getOptionLabel={(option) => option.label}
              value={
                radiusOptions.find((option) => option.value === radius) || null
              }
              onChange={(event, newValue) => {
                setRadius(newValue ? newValue.value : "");
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("commandRadius")}
                  variant="outlined"
                  sx={{ width: "100%" }}
                />
              )}
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
          <Box ref={mapRef} sx={{ mt: 3 }}>
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "500px" }}
              center={mapCenter}
              zoom={mapZoom}
              onLoad={(mapInstance) => setMap(mapInstance)}
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
                      {((selectedDevice.totalDistance || 0) / 1000).toFixed(2)}{" "}
                      km
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1,
              borderRadius: "10px",
              color: "#0D47A1",
              fontWeight: 600,
              fontFamily: "monospace",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AccessTimeIcon fontSize="small" />
              <span>Peru Time: {peruTime.toLocaleTimeString()}</span>
            </Box>
            {devicesInRadius.length > 0 && (
              <>
                <Box sx={{ flexGrow: 1, mx: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Search..."
                    size="small"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    sx={{
                      width: "70%",
                      mx: "auto",
                      display: "block",
                      backgroundColor: "white",
                      borderRadius: "4px",
                    }}
                  />
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ minWidth: "100px", ml: 2 }}
                  disabled={
                    !selectedDeviceIds || selectedDeviceIds.length === 0
                  }
                  onClick={handleAssignClick}
                >
                  Assign Case
                </Button>
              </>
            )}
          </Box>
        </Box>

        {devicesInRadius.length > 0 && (
          <DispatchResultTable
            devicesInRadius={devicesInRadius}
            markerPosition={markerPosition}
            searchValue={searchValue}
            newAllDevices={newAllDevices}
            setMapCenter={setMapCenter}
            setSelectedDeviceId={setSelectedDeviceId}
            selectedDeviceIds={selectedDeviceIds}
            setSelectedDeviceIds={setSelectedDeviceIds}
            mapRef={mapRef}
            setMapZoom={setMapZoom}
          />
        )}

        {openAssignModal && (
          <DispatchDialog
            value={{ description: address }}
            openAssignModal={openAssignModal}
            setOpenAssignModal={setOpenAssignModal}
            assignedDevices={assignedDevices}
            selectedRows={selectedDeviceIds}
            setSelectedRows={setSelectedDeviceIds}
            lat={markerPosition?.lat}
            lng={markerPosition?.lng}
          />
        )}
      </Box>
    </PageLayout>
  );
};

export default DispatchResult;
