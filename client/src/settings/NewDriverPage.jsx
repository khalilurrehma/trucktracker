import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Typography,
  Box,
  Button,
  InputAdornment,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { toast, ToastContainer } from "react-toastify";
import { makeStyles } from "@mui/styles";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchDriverById, saveDriver, updateDriverById } from "../apis/api";
import GoogleMapComponent from "../reports/components/GoogleMapComponent";
import LocationSearchingIcon from "@mui/icons-material/LocationSearching";
import { useAppContext } from "../AppContext";

const useStyles = makeStyles({
  details: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
});

const NewDriverPage = () => {
  const classes = useStyles();
  const { traccarUser, traccarToken } = useAppContext();
  const [item, setItem] = useState({ attributes: {}, location: {} });
  const [searchAddress, setSearchAddress] = useState("");
  const [initialAddress, setInitialAddress] = useState("");
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const navigate = useNavigate();
  const userId = useSelector((state) => state.session.user.id);
  const { id } = useParams();
  const queryLocation = useLocation();
  const queryParams = new URLSearchParams(queryLocation.search);
  const field = queryParams.get("field");

  const handleSubmit = async () => {
    let response;
    const data = {
      name: item.name,
      userId,
      isSuperAdmin: traccarUser?.superAdmin || false,
      traccarUserToken: traccarToken?.token,
      uniqueId: item.uniqueId,
      attributes: item.attributes,
      location: item.location,
      password: item.password,
    };

    try {
      response = id ? await updateDriverById(id, data) : await saveDriver(data);

      if (response.status === true) {
        toast.success(response.message);
        navigate("/settings/new-drivers");
      }
    } catch (error) {
      if (error.message) {
        toast.error(error.message);
      }
    }
  };

  useEffect(() => {
    if (id) {
      fetchDriverData();
    }
  }, [id]);

  const fetchDriverData = async () => {
    try {
      const response = await fetchDriverById(id);

      response.map((item) => {
        setItem({
          name: item.name,
          uniqueId: item.uniqueId,
          attributes: JSON.parse(item.attributes),
          location: JSON.parse(item.location),
        });
      });
    } catch (error) {
      console.error("Error fetching driver data:", error);
    }
  };

  const pinLocationfromSearch = () => {
    setInitialAddress(searchAddress);
  };

  const bringDriverLocation = (address) => {
    if (!address || !address.lat || !address.lng) return null;

    setLocation({
      latitude: address.lat,
      longitude: address.lng,
    });
  };

  useEffect(() => {
    if (!location.latitude || !location.longitude) return;

    setItem((prevItem) => ({
      ...prevItem,
      location,
    }));
    setSearchAddress("");
    setLocation("");
  }, [location]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "configShifts"]}
    >
      <ToastContainer />
      <Box
        sx={{
          width: "40%",
          margin: "0 auto",
          marginTop: "12px",
        }}
      >
        <Accordion defaultExpanded={field ? false : true}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Required</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <TextField
              value={item.name || ""}
              onChange={(event) =>
                setItem({ ...item, name: event.target.value })
              }
              label="Name"
            />
            <TextField
              value={item.uniqueId || ""}
              onChange={(event) =>
                setItem({ ...item, uniqueId: event.target.value })
              }
              label="RFID Card"
            />
            <TextField
              value={item.attributes?.surname || ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  attributes: {
                    ...item.attributes,
                    surname: event.target.value,
                  },
                })
              }
              label="Sur Name"
            />
            <TextField
              value={item.attributes?.grade || ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  attributes: {
                    ...item.attributes,
                    grade: event.target.value,
                  },
                })
              }
              label="Grade"
            />
            <TextField
              value={item.attributes?.internalCode || ""}
              type="number"
              onChange={(event) =>
                setItem({
                  ...item,
                  attributes: {
                    ...item.attributes,
                    internalCode: event.target.value,
                  },
                })
              }
              label="Internal Code"
            />
            <TextField
              value={item.attributes?.licenceId || ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  attributes: {
                    ...item.attributes,
                    licenceId: event.target.value,
                  },
                })
              }
              label="LicenceId"
            />
            <TextField
              value={item.attributes?.DNI || ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  attributes: {
                    ...item.attributes,
                    DNI: event.target.value,
                  },
                })
              }
              label="DNI"
            />
            <TextField
              value={item.attributes?.phone || ""}
              type="number"
              onChange={(event) =>
                setItem({
                  ...item,
                  attributes: {
                    ...item.attributes,
                    phone: event.target.value,
                  },
                })
              }
              label="Phone"
            />
            <TextField
              value={item.attributes?.email || ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  attributes: {
                    ...item.attributes,
                    email: event.target.value,
                  },
                })
              }
              label="Email"
            />
            <TextField
              value={item.password || ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  password: event.target.value,
                })
              }
              label="Password"
              type="password"
            />
            <TextField
              value={item.attributes?.station || ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  attributes: {
                    ...item.attributes,
                    station: event.target.value,
                  },
                })
              }
              label="Station"
            />
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Location</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <TextField
              onChange={(event) => setSearchAddress(event.target.value)}
              label="Search Location"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="start">
                    <LocationSearchingIcon
                      sx={{ color: "red", cursor: "pointer" }}
                      onClick={pinLocationfromSearch}
                    />
                  </InputAdornment>
                ),
              }}
            />
            <GoogleMapComponent
              initialAddress={initialAddress}
              styles={{ width: "100%", height: "200px" }}
              onAddressChange={bringDriverLocation}
            />
          </AccordionDetails>
        </Accordion>
      </Box>
      <div className="flex justify-center mt-6 gap-6">
        <Button
          variant="outlined"
          sx={{ padding: "20px" }}
          onClick={() => navigate(-1)}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          sx={{ padding: "20px" }}
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </div>
    </PageLayout>
  );
};

export default NewDriverPage;
