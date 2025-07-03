import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotatedmarker";
import QueueMessages from "./components/QueueMessages";
import QueueMode from "./components/QueueMode";
import QueueSpeed from "./components/QueueSpeed";
import QueuePlay from "./components/QueuePlay";
import QueueSkipBackward from "./components/QueueSkipBackward";
import QueueSkipFarword from "./components/QueueSkipFarword";
import QueueStop from "./components/QueueStop";
import QueuePlayer from "./components/QueuePlayer";
import MessagesTable from "./components/MessagesTable";
import {
  Autocomplete,
  Button,
  CircularProgress,
  TextField,
  LinearProgress,
  Box,
  Switch,
  Tooltip,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
} from "@mui/material";
import carSVG from "../resources/images/icon/car.svg";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import axios from "axios";
import { useAppContext } from "../AppContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useDispatch, useSelector } from "react-redux";
import { sessionActions } from "../store";
import { useNavigate } from "react-router-dom";
import { nativePostMessage } from "../common/components/NativeInterface";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toast, ToastContainer } from "react-toastify";

dayjs.extend(utc);

const DeviceTrackPage = () => {
  const userId = useSelector((state) => state.session.user.id);
  const { url } = useAppContext();
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    dayjs().utc().subtract(1, "day")
  );
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [bound, setBound] = useState(false);

  const navigate = useNavigate();

  const [player, setPlayer] = useState({
    mode: "time",
    status: "play",
    speed: 10,
    play: false,
    value: 0,
    min: 0,
    max: messages.length,
    messagesOpen: false,
  });

  const togglePlayerMode = () => {
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      mode: prevPlayer.mode === "time" ? "distance" : "time",
    }));
  };

  const togglePlayerPlay = () => {
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      play: !prevPlayer.play,
    }));
  };

  const handleSpeedChange = (event) => {
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      speed: event.target.value,
    }));
  };

  const handleSliderChange = (event, newValue) => {
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      value: newValue,
    }));
  };

  const stopPlayer = () => {
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      play: false,
      value: 0,
    }));
  };

  const skipBackward = () => {
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      value: Math.max(prevPlayer.value - player.speed, prevPlayer.min),
    }));
  };

  const skipForward = () => {
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      value: Math.min(prevPlayer.value + player.speed, prevPlayer.max),
    }));
  };

  const toggleMessages = () => {
    setPlayer((prevPlayer) => ({
      ...prevPlayer,
      messagesOpen: !prevPlayer.messagesOpen,
    }));
  };

  useEffect(() => {
    let interval;
    const incrementValue = 1;

    if (player.play) {
      interval = setInterval(() => {
        setPlayer((prevPlayer) => {
          const newValue = prevPlayer.value + incrementValue;
          if (newValue >= prevPlayer.max) {
            clearInterval(interval);
            return { ...prevPlayer, value: prevPlayer.min, play: false };
          }
          return { ...prevPlayer, value: newValue };
        });
      }, 1000 / player.speed);
    }

    return () => clearInterval(interval);
  }, [player.play, player.speed, player.min, player.max]);

  var myIcon = L.icon({
    iconUrl: carSVG,
    iconSize: [24, 45],
    iconAnchor: [12, 22.5],
  });

  const RotatableMarker = ({ position, rotation }) => {
    const map = useMap();

    useEffect(() => {
      const marker = L.marker(position, { icon: myIcon }).addTo(map);
      marker.setRotationAngle(rotation);

      return () => {
        map.removeLayer(marker);
      };
    }, [map, position, rotation]);

    return null;
  };

  const PolylineWithFitBounds = ({ playerValue, minValue, maxValue }) => {
    const map = useMap();
    const initialLoad = useRef(true);
    const allPositions = messages?.map((message) => [
      message["position.latitude"],
      message["position.longitude"],
      message["position.direction"],
    ]);

    const positionsToDraw =
      playerValue === minValue || playerValue === maxValue
        ? allPositions
        : allPositions.slice(0, playerValue);

    useEffect(() => {
      if (bound) {
        if (allPositions.length) {
          const bounds = allPositions.map((pos) => [pos[0], pos[1]]);
          map.fitBounds(bounds);
          setBound(false);
        }
        initialLoad.current = false;
      }
    }, [map, allPositions, playerValue, minValue, maxValue]);

    return (
      <>
        <Polyline positions={positionsToDraw} color="red" />
        {positionsToDraw.length > 0 && (
          <RotatableMarker
            position={positionsToDraw[positionsToDraw.length - 1].slice(0, 2)}
            rotation={positionsToDraw[positionsToDraw.length - 1][2]}
          />
        )}
      </>
    );
  };

  useEffect(() => {
    fetchDevices();
  }, [userId]);

  const fetchDevices = async () => {
    try {
      setDevices([]);
      setDevicesLoading(true);

      const apiUrl =
        userId === 1
          ? `${url}/new-devices`
          : `${url}/new-devices/user/${userId}`;

      const newDevicesResponse = await axios.get(apiUrl);

      if (newDevicesResponse.status === 200) {
        const newDevices = newDevicesResponse.data.data || [];

        setDevices(newDevices);
      } else {
        throw new Error("Failed to fetch new devices");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleTrackClick = () => {
    const date = selectedDate.startOf("day").format("YYYY-MM-DD");

    fetchMessages(selectedDevice, date);
  };

  const fetchMessages = async (selectedDevice, date) => {
    try {
      setMessagesLoading(true);
      setMessages([]);
      setPlayer((prevPlayer) => ({
        ...prevPlayer,
        max: 0,
        value: 0,
        play: false,
      }));

      const apiUrl = `${url}/new-devices/device/messages/${selectedDevice.id}?date=${date}`;
      const response = await axios.get(apiUrl);

      if (response.status === 200) {
        const messagesArray = response.data.messages?.data || [];
        if (messagesArray.length === 0) {
          toast.error("No messages found.");
        } else {
          setMessages(messagesArray);
          setPlayer((prevPlayer) => ({
            ...prevPlayer,
            max: messagesArray.length,
          }));
          setBound(true);
        }
      } else {
        throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  return (
    <>
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <ToastContainer />
        <Box sx={{ width: "100%", height: "10px" }}>
          {messagesLoading && <LinearProgress />}
        </Box>
        <Box sx={{ width: "100%" }}>
          <Button
            startIcon={<ArrowBackIcon />}
            color="primary"
            variant="none"
            sx={{ fontWeight: 600, textTransform: "none" }}
            onClick={() => {
              navigate(-1);
            }}
          >
            Exit Replay
          </Button>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-evenly",
            gap: 10,
            mb: 2,
            p: 2,
          }}
        >
          <Autocomplete
            disablePortal
            id="device-autocomplete"
            options={devices}
            getOptionLabel={(option) => `${option.name} (${option.flespiId})`}
            loading={devicesLoading}
            noOptionsText={
              devicesLoading ? (
                <CircularProgress size={24} />
              ) : (
                "No available devices"
              )
            }
            sx={{ width: "100%" }}
            renderInput={(params) => <TextField {...params} label="Devices" />}
            fullWidth
            value={selectedDevice}
            onChange={(event, newValue) => setSelectedDevice(newValue)}
            onFocus={fetchDevices}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option) => {
              const displayText = `${option.name} (${option.flespiId})`;

              return (
                <Tooltip title={displayText} arrow>
                  <ListItem {...props} component="div">
                    <ListItemText primary={truncateText(displayText, 26)} />
                  </ListItem>
                </Tooltip>
              );
            }}
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              disableFuture
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue.utc())}
              shouldDisableDate={(day) => {
                // Disable today (dayjs .isSame returns true if same day)
                return day.isSame(dayjs(), "day");
              }}
              sx={{ width: "100%" }}
            />
          </LocalizationProvider>

          <Button
            sx={{ width: "100%" }}
            disabled={!selectedDevice || !selectedDate}
            variant="outlined"
            onClick={handleTrackClick}
          >
            Track
          </Button>
        </Box>
        <div style={{ flexGrow: 1, display: "flex" }}>
          <MapContainer
            style={{ flexGrow: 1, minHeight: "100px" }}
            center={[51.505, -0.09]}
            zoom={3}
            attributionControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <PolylineWithFitBounds
              playerValue={player.value}
              minValue={player.min}
              maxValue={player.max}
            />
          </MapContainer>
          {/* <FileUploadDialog
            openFileDialog={openFileDialog}
            setOpenFileDialog={setOpenFileDialog}
            setMessages={setMessages}
            setBound={setBound}
            setPlayer={setPlayer}
            setSelectedDate={setSelectedDate}
            setSelectedDevice={setSelectedDevice}
          /> */}
        </div>
        <div>
          {player.messagesOpen && (
            <MessagesTable player={player} messages={messages} />
          )}
          <div style={{ display: "flex", alignItems: "center" }}>
            <QueueMessages toggleMessages={toggleMessages} />
            <QueueMode player={player} togglePlayerMode={togglePlayerMode} />
            <QueueSpeed player={player} handleSpeedChange={handleSpeedChange} />

            <QueuePlay player={player} togglePlayerPlay={togglePlayerPlay} />
            <QueueStop player={player} stopPlayer={stopPlayer} />
            <QueueSkipBackward player={player} skipBackward={skipBackward} />
            <QueuePlayer
              player={player}
              handleSliderChange={handleSliderChange}
            />
            <QueueSkipFarword player={player} skipForward={skipForward} />
            <p style={{ textWrap: "nowrap" }}>
              {player.value.toFixed(0)} / {player.max}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeviceTrackPage;
