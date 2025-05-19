import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Autocomplete,
  TextField,
  Chip,
} from "@mui/material";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import carPng from "../images/car-4-48.png";
import { useSelector } from "react-redux";
import PageLayout from "../common/components/PageLayout";
import OperationsMenu from "../settings/components/OperationsMenu";
import axios from "axios";
import {
  formatTime,
  generateCaseNumber,
  getDistanceFromLatLonInMeters,
} from "../settings/common/New.Helper";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DispatchResultTable from "./components/DispatchResultTable";
import DispatchDialog from "./components/DispatchDialog";
import dayjs from "dayjs";
import { useTranslation } from "../common/components/LocalizationProvider";

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
  const centerDefault = [-77.0428, -12.0464];
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState(4);
  const [peruTime, setPeruTime] = useState(new Date());
  const [serviceTypes, setServiceTypes] = useState([]);
  const [newAllDevices, setNewAllDevices] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState([]);
  const [filteredDeviceIds, setFilteredDeviceIds] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(null);
  const [caseNumber, setCaseNumber] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mapCenter, setMapCenter] = useState(centerDefault);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [radius, setRadius] = useState(3000);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assignedDevices, setAssignedDevices] = useState([]);
  const [devicesInRadius, setDevicesInRadius] = useState([]);

  const positionsObj = useSelector((state) => state.session.positions) || {};
  const positions = Array.isArray(positionsObj)
    ? positionsObj
    : Object.values(positionsObj);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: centerDefault,
      zoom: mapZoom,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("radius-circle", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "radius-circle",
        type: "fill",
        source: "radius-circle",
        paint: {
          "fill-color": "#FF0000",
          "fill-opacity": 0.2,
        },
      });
      map.addLayer({
        id: "radius-circle-outline",
        type: "line",
        source: "radius-circle",
        paint: {
          "line-color": "#FF0000",
          "line-width": 1,
        },
      });
      setMapLoaded(true);
    });

    map.on("zoom", () => {
      setMapZoom(map.getZoom());
    });

    return () => {
      map.remove();
    };
  }, []);

  const fetchNewAllDevices = async () => {
    const currentDate = dayjs().format("YYYY-MM-DD");
    try {
      const apiUrl = `${url}/new-devices?date=${currentDate}`;
      const res = await axios.get(apiUrl);
      if (res.status === 200) {
        const formattedDevice = res.data.data.map((device) => ({
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
        }));
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
      setFilteredDeviceIds([]);
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

  useEffect(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      const newPosition = [lng, lat];
      setMapCenter(newPosition);
      setMarkerPosition(newPosition);
      if (mapRef.current && mapLoaded) {
        mapRef.current.setCenter(newPosition);

        if (markersRef.current.incident) {
          markersRef.current.incident.remove();
        }
        markersRef.current.incident = new maplibregl.Marker()
          .setLngLat(newPosition)
          .addTo(mapRef.current);

        const circleGeoJSON = createCircleGeoJSON(lng, lat, radius);
        mapRef.current.getSource("radius-circle")?.setData(circleGeoJSON);
      }
    } else {
      setMapCenter(centerDefault);
      setMarkerPosition(null);
      if (mapRef.current && mapLoaded) {
        mapRef.current.setCenter(centerDefault);
        if (markersRef.current.incident) {
          markersRef.current.incident.remove();
          markersRef.current.incident = null;
        }
        mapRef.current.getSource("radius-circle")?.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  }, [latitude, longitude, mapLoaded, radius]);

  useEffect(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!isNaN(lat) && !isNaN(lng) && filteredDeviceIds.length > 0) {
      const inRadius = positions.filter((pos) => {
        if (!filteredDeviceIds.includes(pos.deviceId)) return false;
        const distance = getDistanceFromLatLonInMeters(
          pos.latitude,
          pos.longitude,
          lat,
          lng
        );
        return distance <= radius;
      });
      setDevicesInRadius(inRadius);
    } else {
      setDevicesInRadius([]);
    }
  }, [latitude, longitude, radius, filteredDeviceIds, positions]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    Object.values(markersRef.current)
      .filter((marker) => marker !== markersRef.current.incident)
      .forEach((marker) => marker.remove());

    devicesInRadius.forEach((pos) => {
      const el = document.createElement("div");
      el.style.backgroundImage = `url(${carPng})`;
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.backgroundSize = "contain";
      el.style.cursor = "pointer";

      const popup = new maplibregl.Popup().setHTML(`
        <div style="font-family: Arial; padding: 8px;">
          <h3>${pos.attributes?.["device.name"] ?? pos.deviceId}</h3>
          <p>Fix Time: ${new Date(pos.fixTime).toLocaleString()}</p>
          <p>
            Address: <a
              href="https://www.google.com/maps/search/?api=1&query=${
                pos.latitude
              },${pos.longitude}"
              target="_blank"
              rel="noopener noreferrer"
            >Show Address</a>
          </p>
          <p>Speed: ${(pos.speed || 0).toFixed(2)} km/h</p>
          <p>Distance: ${((pos.totalDistance || 0) / 1000).toFixed(2)} km</p>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pos.longitude, pos.latitude])
        .setPopup(selectedDeviceId === pos.deviceId ? popup : null)
        .addTo(mapRef.current);

      el.addEventListener("click", () => {
        setSelectedDeviceId(pos.deviceId);
      });

      markersRef.current[pos.deviceId] = marker;
    });

    if (selectedDeviceId) {
      const selectedPos = devicesInRadius.find(
        (pos) => pos.deviceId === selectedDeviceId
      );
      if (selectedPos && markersRef.current[selectedDeviceId]) {
        const popup = new maplibregl.Popup().setHTML(`
          <div style="font-family: Arial; padding: 8px;">
            <h3>${
              selectedPos.attributes?.["device.name"] ?? selectedDeviceId
            }</h3>
            <p>Fix Time: ${new Date(selectedPos.fixTime).toLocaleString()}</p>
            <p>
              Address: <a
                href="https://www.google.com/maps/search/?api=1&query=${
                  selectedPos.latitude
                },${selectedPos.longitude}"
                target="_blank"
                rel="noopener noreferrer"
              >Show Address</a>
            </p>
            <p>Speed: ${(selectedPos.speed || 0).toFixed(2)} km/h</p>
            <p>Distance: ${((selectedPos.totalDistance || 0) / 1000).toFixed(
              2
            )} km</p>
          </div>
        `);
        markersRef.current[selectedDeviceId].setPopup(popup);
      }
    }
  }, [devicesInRadius, selectedDeviceId, mapLoaded]);

  useEffect(() => {
    if (!selectedDeviceId && mapRef.current && mapLoaded) {
      Object.values(markersRef.current).forEach((marker) => {
        if (marker.getPopup()) {
          marker.setPopup(null);
        }
      });
    }
  }, [selectedDeviceId, mapLoaded]);

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

  const createCircleGeoJSON = (lng, lat, radiusInMeters) => {
    const points = 64;
    const coords = { latitude: lat, longitude: lng };
    const km = radiusInMeters / 1000;
    const ret = [];
    const distanceX =
      km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
    const distanceY = km / 110.574;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [ret] },
        },
      ],
    };
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
          <Grid item xs={12} sm={3}>
            <TextField
              label="Latitude"
              fullWidth
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              type="number"
              inputProps={{ step: "any" }}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Longitude"
              fullWidth
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              type="number"
              inputProps={{ step: "any" }}
              variant="outlined"
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
        </Grid>

        <Box
          ref={mapContainerRef}
          sx={{ mt: 3, width: "100%", height: "500px" }}
        />

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
            markerPosition={
              markerPosition
                ? { lat: markerPosition[1], lng: markerPosition[0] }
                : null
            }
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
            value={{ description: `${latitude}, ${longitude}` }}
            openAssignModal={openAssignModal}
            setOpenAssignModal={setOpenAssignModal}
            assignedDevices={assignedDevices}
            selectedRows={selectedDeviceIds}
            setSelectedRows={setSelectedDeviceIds}
            lat={markerPosition ? markerPosition[1] : null}
            lng={markerPosition ? markerPosition[0] : null}
          />
        )}
      </Box>
    </PageLayout>
  );
};

export default DispatchResult;
