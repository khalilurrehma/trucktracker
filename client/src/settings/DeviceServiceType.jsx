import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { useDispatch, useSelector } from "react-redux";
import TextField from "@mui/material/TextField";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditItemView from "./components/EditItemView3";
import { useTranslation } from "../common/components/LocalizationProvider";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  details: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
}));

const DeviceServiceType = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const { id } = useParams();
  const classes = useStyles();
  const t = useTranslation();
  const userId = useSelector((state) => state.session.user.id);
  const navigate = useNavigate();

  const [name, setName] = useState();

  const validate = () => name;

  const fetchById = async (id) => {
    try {
      const { data } = await axios.get(`${url}/device/service-type/${id}`);
      if (data.status) {
        setName(data.message.name);
      }
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  useEffect(() => {
    if (id) {
      fetchById(id);
    }
  }, [id]);

  const handleSave = async () => {
    const body = {
      name,
      userId,
    };

    try {
      const { data } = id
        ? await axios.put(`${url}/device/service-type/${id}`, body)
        : await axios.post(`${url}/device/service-type`, body);
      if (data.status) {
        toast.success(data.message);
        setTimeout(() => {
          navigate(-1);
        }, 1000);
      }
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Service Type"]}
    >
      <ToastContainer />
      <Box sx={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
        <Accordion defaultExpanded sx={{ width: "50%" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">{t("sharedRequired")}</Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.details}>
            <TextField
              value={name || ""}
              onChange={(event) => setName(event.target.value)}
              label={t("sharedName")}
            />
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box
        sx={{ marginTop: 2, display: "flex", justifyContent: "center", gap: 2 }}
      >
        <Button
          variant="outlined"
          color="secondary"
          sx={{ paddingX: 4 }}
          onClick={() => navigate(-1)}
        >
          {t("sharedCancel")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          sx={{ paddingX: 4 }}
          onClick={() => handleSave()}
          disabled={!name || (typeof validate === "function" && !validate())}
        >
          {t("sharedSave")}
        </Button>
      </Box>
    </PageLayout>
  );
};

export default DeviceServiceType;
