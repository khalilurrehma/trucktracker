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
import { useLocation } from "react-router-dom";

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

  const { search } = useLocation();
  const query = new URLSearchParams(search);

  const rimacAddress = query.get("address");
  const rimacCaseNumber = query.get("casenumber");

  let ifRimacCase = rimacAddress && rimacCaseNumber ? true : false;

  const userId = useSelector((state) => state.session.user.id);
  const userName = useSelector((state) => state.session.user.name);
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
  const [destinationAddress, setDestinationAddress] = useState("");
  const [mapCenter, setMapCenter] = useState(centerDefault);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [destinationPosition, setDestinationPosition] = useState(null);
  const [radius, setRadius] = useState(3000);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [devicesInRadius, setDevicesInRadius] = useState([]);
  const [assignedDevices, setAssignedDevices] = useState([]);
  const [placeOptions, setPlaceOptions] = useState([]);
  const [destinationPlaceOptions, setDestinationPlaceOptions] = useState([]);
  const [etaMap, setEtaMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState([]);
  const [searchId, setSearchId] = useState(0);

  const resetStates = () => {
    setSelectedServiceType([]);
    setSelectedDeviceIds([]);
    setCaseNumber("");
    setAddress("");
    setDestinationAddress(""); // Reset destination address
    setMapCenter(centerDefault);
    setMarkerPosition(null);
    setDestinationPosition(null);
    setRadius(3000);
    setSelectedDeviceId(null);
    setSearchValue("");
    setOpenAssignModal(false);
    setDevicesInRadius([]);
    setAssignedDevices([]);
    setPlaceOptions([]);
    setDestinationPlaceOptions([]);
    setEtaMap({});
    setLoading(false);
    setSessionToken(null);
    setSelectedRowData([]);
  };

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setSessionToken(new window.google.maps.places.AutocompleteSessionToken());
    }
  }, [isLoaded]);

  const preprocessAddress = (input) => {
    if (!input) return input;
    let cleaned = input.trim();
    cleaned = cleaned.replace(/,\s*Lima,\s*Lima\b/gi, ", Lima");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    return cleaned;
  };

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

  const fetchPlacePredictions = debounce(async (input, setOptions) => {
    if (!isLoaded || !window.google || !input) {
      setOptions([]);
      return;
    }

    const autocompleteService =
      new window.google.maps.places.AutocompleteService();
    const cleanedInput = preprocessAddress(input);

    try {
      const response = await autocompleteService.getPlacePredictions({
        input: cleanedInput,
        componentRestrictions: { country: ["PE", "PT"] },
        types: ["geocode", "establishment"],
        sessionToken,
        location: new window.google.maps.LatLng(-12.0464, -77.0428),
        radius: 50000,
      });

      const predictions = response.predictions.map((prediction) => ({
        label: prediction.description,
        placeId: prediction.place_id,
        types: prediction.types,
      }));

      if (predictions.length === 0) {
        if (cleanedInput.length > 5) {
          setOptions([
            {
              label: `Search: ${cleanedInput}`,
              placeId: null,
              isCustom: true,
            },
          ]);
        } else {
          setOptions([]);
        }

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          {
            address: cleanedInput,
            componentRestrictions: { country: ["PE", "PT"] },
          },
          (results, status) => {
            if (status === "OK" && results[0]) {
              setOptions([
                {
                  label: results[0].formatted_address,
                  placeId: results[0].place_id,
                  types: results[0].types,
                },
              ]);
            }
          }
        );
      } else {
        setOptions(predictions);
      }
    } catch (error) {
      console.error("Error fetching place predictions:", error);
      setOptions([]);
    }
  }, 300);

  const handleAddressChange = (e, newInputValue) => {
    setAddress(newInputValue);
    fetchPlacePredictions(newInputValue, setPlaceOptions);
  };

  const handleDestinationAddressChange = (e, newInputValue) => {
    setDestinationAddress(newInputValue);
    fetchPlacePredictions(newInputValue, setDestinationPlaceOptions);
  };

  const handlePlaceSelect = (newValue, isDestination = false) => {
    const setAddressFn = isDestination ? setDestinationAddress : setAddress;
    const setPositionFn = isDestination
      ? setDestinationPosition
      : setMarkerPosition;
    const setOptionsFn = isDestination
      ? setDestinationPlaceOptions
      : setPlaceOptions;
    const center = isDestination ? mapCenter : centerDefault;

    if (!newValue || (!newValue.placeId && !newValue.label)) {
      setAddressFn("");
      setOptionsFn([]);
      setPositionFn(null);
      if (!isDestination && map) map.panTo(center);
      return;
    }

    setAddressFn(newValue.label);
    setOptionsFn([]);

    if (!map || !isLoaded || !window.google) return;

    const placesService = new window.google.maps.places.PlacesService(map);
    placesService.getDetails(
      {
        placeId: newValue.placeId,
        fields: ["geometry", "formatted_address", "types"],
        sessionToken,
      },
      (place, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place.geometry
        ) {
          const { lat, lng } = place.geometry.location;
          const newPosition = { lat: lat(), lng: lng() };
          setPositionFn(newPosition);
          if (!isDestination) {
            setMapCenter(newPosition);
            if (map) {
              map.panTo(newPosition);
              const zoomLevel = place.types.includes("point_of_interest")
                ? 16
                : 15;
              setMapZoom(zoomLevel);
            }
          }
        } else {
          console.error("PlacesService failed:", status);
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            {
              address: newValue.label,
              componentRestrictions: { country: ["PE", "PT"] },
            },
            (results, status) => {
              if (status === "OK" && results[0]) {
                const { lat, lng } = results[0].geometry.location;
                const newPosition = { lat: lat(), lng: lng() };
                setPositionFn(newPosition);
                if (!isDestination && map) map.panTo(newPosition);
              } else {
                alert("Unable to retrieve location details");
              }
            }
          );
        }
      }
    );

    setSessionToken(new window.google.maps.places.AutocompleteSessionToken());
  };

  const handleShowClick = async () => {
    if (
      !address ||
      !radius ||
      !selectedServiceType.length ||
      !isLoaded ||
      !window.google
    ) {
      alert("Please enter an address and select at least one service type");
      return;
    }

    if (selectedServiceType[0]?.name === "GRUA" && !destinationAddress) {
      alert("Please enter a destination address for GRUA service");
      return;
    }

    setLoading(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const cleanedAddress = preprocessAddress(address);
      const countryCode = cleanedAddress.includes("Peru") ? "PE" : "PT";

      const geocodeResults = await new Promise((resolve, reject) => {
        geocoder.geocode(
          {
            address: cleanedAddress,
            componentRestrictions: { country: countryCode },
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
      const encodedAddress = encodeURIComponent(address);
      let apiUrl = `${url}/new-devices?date=${currentDate}&deviceLocation=true&address=${encodedAddress}&radius=${radius}&lat=${lat()}&lng=${lng()}&userId=${userId}&userName=${userName}`;

      // if (selectedServiceType[0]?.name === "GRUA" && destinationPosition) {
      //   apiUrl += `&destinationLat=${destinationPosition.lat}&destinationLng=${destinationPosition.lng}`;
      // }

      const res = await axios.get(apiUrl);

      if (res.status !== 200) {
        throw new Error("Failed to fetch devices");
      }

      if (res.status === 200 && res.data.searchId) {
        setSearchId(res.data.searchId || null);
      }

      const formattedDevice = res.data.data.map((device) => {
        return {
          id: device.id,
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
          driver: device?.driver,
          driverAvailability: device?.driverAvailability,
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
            device.lng &&
            device.driverAvailability !== "in service"
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
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

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

  const handleRowDataChange = (rowData) => {
    setSelectedRowData(rowData);
  };

  useEffect(() => {
    if (rimacCaseNumber && rimacAddress) {
      setCaseNumber(rimacCaseNumber);
      setAddress(rimacAddress);
      handlePlaceSelect({ label: rimacAddress, placeId: null });
    }
  }, [rimacCaseNumber, rimacAddress]);

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
              onChange={(event) => setCaseNumber(event.target.value)}
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
                placeOptions.find((option) => option.label === address) || {
                  label: address,
                  placeId: null,
                }
              }
              onChange={(event, newValue) => handlePlaceSelect(newValue)}
              onInputChange={handleAddressChange}
              freeSolo
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
                option.placeId === value.placeId || option.label === value.label
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

          {selectedServiceType.some((service) => service.name === "GRUA") && (
            <Grid item xs={12} sm={7}>
              <Autocomplete
                id="destination-address-autocomplete"
                options={destinationPlaceOptions}
                getOptionLabel={(option) => option.label || ""}
                value={
                  destinationPlaceOptions.find(
                    (option) => option.label === destinationAddress
                  ) || {
                    label: destinationAddress,
                    placeId: null,
                  }
                }
                onChange={(event, newValue) =>
                  handlePlaceSelect(newValue, true)
                }
                onInputChange={handleDestinationAddressChange}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Destination Address"
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
                  option.placeId === value.placeId ||
                  option.label === value.label
                }
              />
            </Grid>
          )}

          <Grid item xs={12} sm={2}>
            <Button
              variant="outlined"
              disabled={
                !address ||
                !selectedServiceType.length ||
                (selectedServiceType.some(
                  (service) => service.name === "GRUA"
                ) &&
                  !destinationAddress) ||
                loading
              }
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
              {destinationPosition &&
                selectedServiceType.some(
                  (service) => service.name === "GRUA"
                ) && (
                  <Marker
                    position={destinationPosition}
                    icon={{
                      url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png", // Different icon for destination
                      scaledSize: new window.google.maps.Size(30, 30),
                    }}
                  />
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
                    <h1>Name: {selectedDevice.name ?? selectedDevice.id}</h1>
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
            destinationPosition={destinationPosition}
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
            onRowDataChange={handleRowDataChange}
            userId={userId}
          />
        )}

        {openAssignModal && (
          <DispatchDialog
            value={{
              description: address,
              destinationDescription: destinationAddress,
            }}
            rimacCase={ifRimacCase}
            openAssignModal={openAssignModal}
            setOpenAssignModal={setOpenAssignModal}
            assignedDevices={assignedDevices}
            selectedRows={selectedDeviceIds}
            setSelectedRows={setSelectedDeviceIds}
            lat={markerPosition?.lat}
            lng={markerPosition?.lng}
            destinationLat={destinationPosition?.lat}
            destinationLng={destinationPosition?.lng}
            newAllDevices={newAllDevices}
            etaMap={etaMap}
            caseNumber={caseNumber}
            selectedRowData={selectedRowData}
            markerPosition={markerPosition}
            destinationPosition={destinationPosition}
            resetStates={resetStates}
            searchId={searchId}
          />
        )}
      </Box>
    </PageLayout>
  );
};

export default DispatchResult;
