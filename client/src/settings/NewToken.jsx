import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Typography,
  OutlinedInput,
  FormControl,
  InputAdornment,
  IconButton,
  Button,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useTranslation } from "../common/components/LocalizationProvider";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CachedIcon from "@mui/icons-material/Cached";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import dayjs from "dayjs";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TextField } from "@mui/material";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  container: {
    marginTop: theme.spacing(2),
  },
  buttons: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: "flex",
    justifyContent: "space-evenly",
    "& > *": {
      flexBasis: "33%",
    },
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
  tokenActions: {
    display: "flex",
    flexDirection: "column",
  },
  formControl: {
    "&:hover": {
      background: "#fff",
      border: "1px solid #ccc",
    },
  },
}));
const NewToken = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);

  const classes = useStyles();
  const t = useTranslation();

  const [selectedDate, setSelectedDate] = useState(null);
  const [tokenText, setTokenText] = useState("");
  const [secondInputValue, setSecondInputValue] = useState("");
  const [access, setAccess] = useState(0);

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleAccessChange = (newAccess) => {
    setAccess(newAccess);
  };

  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const handleCacheClick = () => {
    if (selectedDate) {
      const unixTimestamp = dayjs(selectedDate).endOf("day").unix();
      const requestData = {
        expire: unixTimestamp,
        cid: data.flespiId,
        access_type: access,
        userId: data.traccarId,
        email: data.email,
      };

      axios
        .post(`${url}/uft`, requestData)
        .then((response) => {
          setTokenText(response.data.data.key);
          // toast.success("Flespi Token generate successfully.");
        })
        .catch((error) => {
          console.error("API Request Error:", error);
        });
    } else {
      toast.error("Please select a date first.");
    }
  };

  const handleCopyClick = () => {
    navigator.clipboard.writeText(tokenText);
  };

  const handleSecondInputChange = (event) => {
    setSecondInputValue(event.target.value);
  };

  const handleFirstInputChange = (event) => {
    setTokenText(event.target.value);
  };

  const saveToken = (
    apiUrl,
    endpoint,
    requestData,
    successMessage,
    errorMessage
  ) => {
    axios
      .post(`${apiUrl}/${endpoint}`, requestData)
      .then((response) => {
        toast.success(successMessage);
        navigate(-1);
      })
      .catch((error) => {
        console.error("API Request Error:", error);
        toast.error(errorMessage);
      });
  };

  const handleTarracarSaveClick = () => {
    const traccarRequestData = {
      userId: data?.traccarId,
      traccar_token: secondInputValue,
    };

    // const flespiRequestData = {
    //   access_type: access,
    //   userId: data?.traccarId,
    //   email: data?.email,
    //   cid: data.flespiId,
    //   token: tokenText,
    // };

    saveToken(
      url,
      "traccar-token",
      traccarRequestData,
      "NexTop Token Saved Successfully!",
      "Error Saving NexTop Token!"
    );
  };

  const handleFlespiSaveClick = () => {
    // const traccarRequestData = {
    //   userId: data?.traccarId,
    //   traccar_token: secondInputValue,
    // };
    const unixTimestamp = dayjs(selectedDate).endOf("day").unix();

    const MAX_TIMESTAMP = 2147483647;
    const validTimestamp = Math.min(unixTimestamp, MAX_TIMESTAMP);

    const flespiRequestData = {
      expire: validTimestamp,
      access_type: access,
      userId: data?.traccarId,
      email: data?.email,
      cid: data.flespiId,
      token: tokenText,
    };

    saveToken(
      url,
      "uft2",
      flespiRequestData,
      "Flespi Token Saved Successfully!",
      "Error Saving Flespi Token!"
    );
  };

  useEffect(() => {
    axios
      .get(`${url}/subaccount/${id}`)
      .then((response) => {
        const { status, message: responseData } = response.data;

        if (status) {
          setData(responseData);
        } else {
          // navigate("/settings/Nusers");
        }
      })
      .catch((error) => {
        console.error("Error fetching subaccount data:", error);
      });
  }, [id, navigate]);

  const traccarUserLogin = async () => {
    // 168
    const response = await axios.get("http://161.97.136.219:8082/api/users");
    console.log(response);

    // const response = await fetch(`/api/session/7`);
    // if (response.ok) {
    //   const user = await response.json();
    //   console.log("user :", user);
    // } else {
    //   throw Error(await response.text());
    // }
  };

  useEffect(() => {
    if (data) {
      axios
        .get(`${url}/traccar-token/${data.traccarId}`)
        .then((response) => {
          //   const { status } = response.data;

          if (response) {
            // console.log("traccar-token response api :", response.data);
            if (response.data?.data[0]?.token) {
              setSecondInputValue(response.data?.data[0]?.token);
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching subaccount data:", error);
        });
    }
    if (data) {
      axios
        .get(`${url}/uft/${data.traccarId}`)
        .then((response) => {
          if (response.status === 200) {
            setTokenText(response.data.data.token);
            setAccess(response.data.data.access_type);
          }
        })
        .catch((error) => {
          console.error("Error fetching subaccount data:", error);
        });
    }
  }, [data]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "settingsUser"]}
    >
      <ToastContainer />
      <Container maxWidth="xs" className={classes.container}>
        <Accordion defaultExpanded={true}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">F {t("userToken")}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label={t("userExpirationTime")}
                minDate={dayjs().add(1, "day")}
                disablePast
                value={selectedDate}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Button
                variant={access === 0 ? "contained" : "outlined"}
                type="button"
                sx={{ width: "50%", borderRadius: "25px 0 0 25px" }}
                onClick={() => handleAccessChange(0)}
              >
                Standard
              </Button>
              <Button
                variant={access === 1 ? "contained" : "outlined"}
                type="button"
                sx={{ width: "50%", borderRadius: "0 25px 25px 0" }}
                onClick={() => handleAccessChange(1)}
              >
                Master
              </Button>
            </div>
            <FormControl>
              <OutlinedInput
                multiline
                rows={6}
                readOnly={false}
                type="text"
                value={tokenText}
                onChange={handleFirstInputChange}
                endAdornment={
                  <InputAdornment position="end">
                    <div className={classes.tokenActions}>
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={handleCacheClick}
                      >
                        <CachedIcon fontSize="small" />
                      </IconButton>
                      {tokenText ? (
                        <>
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={handleCopyClick}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={handleCopyClick}
                          >
                            <ContentCopyIcon
                              fontSize="small"
                              color="disabled"
                            />
                          </IconButton>
                        </>
                      )}
                    </div>
                  </InputAdornment>
                }
              />
            </FormControl>
            <Button
              variant="contained"
              type="button"
              onClick={handleFlespiSaveClick}
            >
              Save
            </Button>
          </AccordionDetails>
        </Accordion>
        <Accordion defaultExpanded={true}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">T {t("userToken")}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <FormControl>
              <OutlinedInput
                multiline
                rows={6}
                readOnly={false}
                type="text"
                onChange={handleSecondInputChange}
                value={secondInputValue}
              />
            </FormControl>
            <Button
              variant="contained"
              type="button"
              onClick={handleTarracarSaveClick}
            >
              Save
            </Button>
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
};

export default NewToken;
