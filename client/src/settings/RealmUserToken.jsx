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
  Drawer,
  Box,
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
const RealmUserToken = () => {
  const navigate = useNavigate();
  const { id, realmId } = useParams();
  const [data, setData] = useState(null);

  const classes = useStyles();
  const t = useTranslation();

  const [selectedDate, setSelectedDate] = useState(null);
  const [tokenText, setTokenText] = useState("");
  const [secondInputValue, setSecondInputValue] = useState("");
  const [access, setAccess] = useState(0);

  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const handleSecondInputChange = (event) => {
    setSecondInputValue(event.target.value);
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
      userId: data?.id,
      traccar_token: secondInputValue,
    };

    saveToken(
      url,
      "traccar-token",
      traccarRequestData,
      "NexTop Token Saved Successfully!",
      "Error Saving NexTop Token!"
    );
  };

  useEffect(() => {
    axios
      .get(`${url}/realm/${realmId}/acc/user/${id}`)
      .then((response) => {
        const { status, message: responseData } = response.data;
        if (status) {
          const traccar_body = JSON.parse(responseData[0]?.traccar_user_body);

          setData(traccar_body);
        } else {
          // navigate("/settings/Nusers");
        }
      })
      .catch((error) => {
        console.error("Error fetching realm-user data:", error);
      });
  }, [id, realmId, navigate]);

  useEffect(() => {
    if (data) {
      axios
        .get(`${url}/traccar-token/${data.id}`)
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
            <Box sx={{ display: "flex", justifyContent: "center", gap: 6 }}>
              <Button
                variant="outlined"
                type="button"
                onClick={() => navigate(-1)}
                sx={{ paddingX: 6 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                type="button"
                onClick={handleTarracarSaveClick}
                sx={{ paddingX: 6 }}
              >
                Save
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
};

export default RealmUserToken;
