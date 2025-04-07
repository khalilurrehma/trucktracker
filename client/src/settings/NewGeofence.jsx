import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Button,
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
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const geofenceAttributes = useGeofenceAttributes(t);

  const { traccarUser, traccarToken, subaccount } = useAppContext();
  const [item, setItem] = useState();

  useEffect(() => {
    setItem({
      ...item,
      userId: traccarUser?.id,
      subaccount_cid: subaccount,
      isSuperAdmin: traccarUser?.superAdmin || false,
      traccarUserToken: traccarToken?.token,
    });
  }, [traccarUser, traccarToken]);

  const validate = () => item && item.name && item.area;

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
