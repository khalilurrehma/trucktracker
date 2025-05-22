import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Autocomplete,
  TextField,
  Chip,
  CircularProgress,
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
import {
  generateCaseNumber,
  getDistanceFromLatLonInMeters,
} from "../settings/common/New.Helper";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DispatchResultTable from "./components/DispatchResultTable";
import DispatchDialog from "./components/DispatchDialog";
import dayjs from "dayjs";
import { useTranslation } from "../common/components/LocalizationProvider";

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const GOOGLE_MAPS_LIBRARIES = ["places", "geometry", "maps"];
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
  const url = import.meta.env.DEV
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
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [caseNumber, setCaseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [mapCenter, setMapCenter] = useState(centerDefault);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [radius, setRadius] = useState(3000);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [devicesInRadius, setDevicesInRadius] = useState([]);
  const [assignedDevices, setAssignedDevices] = useState([]);
  const [placeOptions, setPlaceOptions] = useState([]);
  const [etaMap, setEtaMap] = useState({});
  const [loading, setLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
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

    fetchServiceTypes();
  }, [userId, url]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const peruDate = new Date(utc - 5 * 60 * 60000);
      setPeruTime(peruDate);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlacePredictions = debounce(async (input) => {
    if (!isLoaded || !window.google || !input) {
      setPlaceOptions([]);
      return;
    }

    const autocompleteService =
      new window.google.maps.places.AutocompleteService();
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
  }, 500);

  const handleAddressChange = (e, newInputValue) => {
    setAddress(newInputValue);
    fetchPlacePredictions(newInputValue);
  };

  const handlePlaceSelect = (newValue) => {
    if (!newValue) {
      setAddress("");
      setPlaceOptions([]);
      setMarkerPosition(null);
      setMapCenter(centerDefault);
      if (map) map.panTo(centerDefault);
      return;
    }

    setAddress(newValue.label);
    setPlaceOptions([]);

    if (!map || !isLoaded || !window.google) return;

    const placesService = new window.google.maps.places.PlacesService(map);
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
          if (map) map.panTo(newPosition);
        } else {
          console.error("PlacesService failed:", status);
          alert("Unable to retrieve location details");
        }
      }
    );
  };

  const handleShowClick = async () => {
    if (
      !address ||
      !selectedServiceType.length ||
      !isLoaded ||
      !window.google
    ) {
      alert("Please enter an address and select at least one service type");
      return;
    }

    setLoading(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const geocodeResults = await new Promise((resolve, reject) => {
        geocoder.geocode(
          {
            address,
            componentRestrictions: { locality: "Lima", country: "PE" },
          },
          (results, status) => {
            if (status === "OK") resolve(results);
            else reject(new Error(`Geocode failed: ${status}`));
          }
        );
      });

      const { lat, lng } = geocodeResults[0].geometry.location;
      const newPosition = { lat: lat(), lng: lng() };
      setMapCenter(newPosition);
      setMarkerPosition(newPosition);
      if (map) map.panTo(newPosition);

      const currentDate = dayjs().format("YYYY-MM-DD");
      const apiUrl = `${url}/new-devices?date=${currentDate}&deviceLocation=true`;
      const res = await axios.get(apiUrl);

      if (res.status !== 200) {
        throw new Error("Failed to fetch devices");
      }

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
          lat: device?.location?.lat,
          lng: device?.location?.lng,
          fixTime: device?.lastConnection,
          speed: device?.speed,
        };
      });

      const filteredDevices = formattedDevice
        .filter((device) => {
          const deviceServiceIds = (device.services || []).map(
            (service) => service.serviceId || service.id
          );
          return (
            selectedServiceType.some((selectedService) =>
              deviceServiceIds.includes(selectedService.id)
            ) &&
            device.lat &&
            device.lng
          );
        })
        .map((device) => ({
          ...device,
          distance: getDistanceFromLatLonInMeters(
            device.lat,
            device.lng,
            newPosition.lat,
            newPosition.lng
          ),
        }))
        .filter((device) => device.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
      // .slice(0, 10);

      setDevicesInRadius(filteredDevices);
    } catch (error) {
      console.error("Error in handleShowClick:", error);
      alert("Failed to fetch data or geocode address");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClick = () => {
    const processDevices = devicesInRadius.filter((device) =>
      selectedDeviceIds.includes(device.id)
    );
    if (processDevices.length > 0) {
      setAssignedDevices(processDevices);
      setOpenAssignModal(true);
    }
  };

  const selectedDevice = devicesInRadius.find(
    (device) => device.id === selectedDeviceId
  );

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
              onInputChange={handleAddressChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Incident Address"
                  fullWidth
                  variant="outlined"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
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
                setRadius(newValue ? newValue.value : 3000);
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
              disabled={!address || !selectedServiceType.length || loading}
              onClick={handleShowClick}
              sx={{ height: "56px", width: "100%" }}
            >
              {loading ? <CircularProgress size={24} /> : "Show"}
            </Button>
          </Grid>
        </Grid>

        {isLoaded && (
          <Box ref={mapRef} sx={{ mt: 3, width: "100%", height: "500px" }}>
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={mapCenter}
              zoom={mapZoom}
              onLoad={(mapInstance) => {
                setMap(mapInstance);
              }}
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
              {devicesInRadius.map((device) => (
                <Marker
                  key={device.id}
                  position={{ lat: device.lat, lng: device.lng }}
                  icon={{
                    url: carPng,
                    scaledSize: new window.google.maps.Size(30, 30),
                  }}
                  onClick={() => setSelectedDeviceId(device.id)}
                />
              ))}
              {selectedDevice && (
                <InfoWindow
                  position={{
                    lat: selectedDevice.lat,
                    lng: selectedDevice.lng,
                  }}
                  onCloseClick={() => setSelectedDeviceId(null)}
                >
                  <div>
                    <h3>{selectedDevice.name ?? selectedDevice.id}</h3>
                    <p>
                      Address:{" "}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedDevice.lat},${selectedDevice.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Show Address
                      </a>
                    </p>
                    <p>
                      Distance: {(selectedDevice.distance / 1000).toFixed(2)} km
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
                  disabled={!selectedDeviceIds.length}
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
            selectedServiceType={selectedServiceType}
            etaMap={etaMap}
        setEtaMap={setEtaMap}
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
            newAllDevices={newAllDevices}
            etaMap={etaMap}
            caseNumber={caseNumber}
          />
        )}
      </Box>
    </PageLayout>
  );
};

export default DispatchResult;
