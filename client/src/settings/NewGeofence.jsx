import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditItemView from "./components/EditItemView3";
import EditAttributesAccordion from "./components/EditAttributesAccordion";
import { useTranslation } from "../common/components/LocalizationProvider";
import useGeofenceAttributes from "../common/attributes/useGeofenceAttributes";
import SettingsMenu from "./components/SettingsMenu";
import SelectField from "../common/components/SelectField";
// import { geofencesActions } from "../store";
import { useAppContext } from "../AppContext";
import axios from "axios";

const useStyles = makeStyles((theme) => ({
  details: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
}));

const NewGeofencePage = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const geofenceAttributes = useGeofenceAttributes(t);

  const { traccarUser, traccarToken, subaccount } = useAppContext();
  const userId = useSelector((state) => state.session.user.id);
  const [item, setItem] = useState();
  const [geofencesTypes, setGeofencesTypes] = useState();

  useEffect(() => {
    setItem({
      ...item,
      userId: traccarUser?.id,
      subaccount_cid: subaccount,
      isSuperAdmin: traccarUser?.superAdmin || false,
      traccarUserToken: traccarToken?.token,
    });
  }, [traccarUser, traccarToken]);

  useEffect(() => {
    fetchGeofencesTypes();
  }, [userId]);

  const fetchGeofencesTypes = async () => {
    try {
      const { data } =
        userId === 1
          ? await axios.get(`${url}/geofence/geofences-types`)
          : await axios.get(`${url}/geofence/geofences-types/${userId}`);

      if (data.status) {
        setGeofencesTypes(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const validate = () => item && item.name && item.area && item.geofenceType;

  return (
    <EditItemView
      endpoint="new-geofences"
      item={item}
      setItem={setItem}
      validate={validate}
      //   onItemSaved={onItemSaved}
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "sharedGeofence"]}
    >
      {item && (
        <>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t("sharedRequired")}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.name || ""}
                onChange={(event) =>
                  setItem({ ...item, name: event.target.value })
                }
                label={t("sharedName")}
              />
              <FormControl fullWidth>
                <InputLabel id="geofence-type-label">Geofence Type</InputLabel>
                <Select
                  labelId="geofence-type-label"
                  value={item.geofenceType || ""}
                  onChange={(event) =>
                    setItem({ ...item, geofenceType: event.target.value })
                  }
                  label="Geofence Type"
                >
                  {geofencesTypes?.map((type) => (
                    <MenuItem key={type.id} value={type}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t("sharedExtra")}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                value={item.description || ""}
                onChange={(event) =>
                  setItem({ ...item, description: event.target.value })
                }
                label={t("sharedDescription")}
              />
              <SelectField
                value={item.calendarId || 0}
                onChange={(event) =>
                  setItem({ ...item, calendarId: Number(event.target.value) })
                }
                endpoint="/api/calendars"
                label={t("sharedCalendar")}
              />
            </AccordionDetails>
          </Accordion>
          <EditAttributesAccordion
            attributes={item.attributes}
            setAttributes={(attributes) => setItem({ ...item, attributes })}
            definitions={geofenceAttributes}
          />
        </>
      )}
    </EditItemView>
  );
};

export default NewGeofencePage;
