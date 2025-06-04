import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import { useDispatch, useSelector } from "react-redux";
import SettingsMenu from "./components/SettingsMenu";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  Tooltip,
  TextField,
  Autocomplete,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditItemView from "./components/EditItemView3";
import { useTranslation } from "../common/components/LocalizationProvider";
import { useNavigate, useParams } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  details: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
}));
const ServiceTypesSubService = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const [serviceTypes, setServiceTypes] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState(null);
  const [name, setName] = useState();

  const { id } = useParams();
  const classes = useStyles();
  const t = useTranslation();
  const userId = useSelector((state) => state.session.user.id);
  const navigate = useNavigate();

  const fetchFromApi = async () => {
    try {
      const { data } =
        userId === 1
          ? await axios.get(`${url}/all/device/service-types`)
          : await axios.get(`${url}/all/device/service-types/user/${userId}`);
      if (data.status) {
        setServiceTypes(data.message);
      }
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  useEffect(() => {
    fetchFromApi();
  }, []);

  const handleSave = async () => {
    if (!name) {
      toast.error(t("Name is required"));
      return;
    }
    const body = {
      name,
      user_id: userId,
      service_type: selectedServiceType.id,
    };

    try {
      const { data } = id
        ? await axios.put(`${url}/service-type/subservice/${id}`, body)
        : await axios.post(`${url}/service-type/subservice`, body);

      if (data.status) {
        toast.success(data.message);
        setTimeout(() => {
          navigate(-1);
        }, 1000);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (error) {
      const errMsg =
        error.response?.data?.message || "Failed to save service type";
      toast.error(errMsg);
    }
  };

  const fetchById = async (id) => {
    try {
      const { data } = await axios.get(`${url}/service-type/subservice/${id}`);
      if (data.status) {
        const subservice = data.message;
        setName(subservice.name);

        const relatedServiceType = serviceTypes.find(
          (st) => st.id === subservice.service_type
        );
        setSelectedServiceType(relatedServiceType);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch subservice"
      );
    }
  };

  useEffect(() => {
    if (id && serviceTypes.length > 0) {
      fetchById(id);
    }
  }, [id, serviceTypes]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Sub Services"]}
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

            <Typography variant="subtitle2" sx={{}}>
              {t("settingsVehicleServiceType")}
            </Typography>

            <Autocomplete
              value={selectedServiceType}
              onChange={(event, newValue) => setSelectedServiceType(newValue)}
              options={serviceTypes}
              getOptionLabel={(option) => option.name || ""}
              renderInput={(params) => (
                <TextField {...params} label={t("selectServiceType")} />
              )}
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

export default ServiceTypesSubService;
