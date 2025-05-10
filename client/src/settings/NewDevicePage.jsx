import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Autocomplete,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DropzoneArea } from "react-mui-dropzone";
import EditItemView from "./components/EditItemView3";
import EditAttributesAccordion from "./components/EditAttributesAccordion";
import SelectField from "../common/components/SelectField";
import deviceCategories from "../common/util/deviceCategories";
import { useTranslation } from "../common/components/LocalizationProvider";
import useDeviceAttributes from "../common/attributes/useDeviceAttributes";
import { useAdministrator } from "../common/util/permissions";
import SettingsMenu from "./components/SettingsMenu";
import useCommonDeviceAttributes from "../common/attributes/useCommonDeviceAttributes";
import { useCatch } from "../reactHelper";
import axios from "axios";
// import { extractUniqueDeviceTypes } from "../common/util/common";
import { useAppContext } from "../AppContext";
import { fetchFlespiDeviceTypes } from "../apis/api";
import { useSelector } from "react-redux";
// import NumberSelectField from "./components/NumberSelectField";

const useStyles = makeStyles((theme) => ({
  details: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
}));

const NewDevicePage = () => {
  const { traccarUser, flespiToken, traccarToken } = useAppContext();

  const userName = useSelector((state) => state.session.user.name);

  const classes = useStyles();
  const t = useTranslation();

  const admin = useAdministrator();

  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const deviceAttributes = useDeviceAttributes(t);

  const [item, setItem] = useState();
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [servicesTypes, setServicesTypes] = useState([]);

  useEffect(() => {
    setItem({
      ...item,
      userId: traccarUser?.id,
      isSuperAdmin: traccarUser?.superAdmin || false,
      flespiUserToken: flespiToken?.token,
      traccarUserToken: traccarToken?.token,
      userName,
    });
  }, [flespiToken, traccarUser, traccarToken]);

  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const fetchDevices = async () => {
    try {
      const response = await fetchFlespiDeviceTypes();

      if (response) {
        setDeviceTypes(response);
      } else {
        throw new Error("Failed to fetch data from the API");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchGroups = async () => {
    try {
      const apiUrl = `${url}/new-groups`;

      const [newGroupsResponse, permissionGroupsResponse] = await Promise.all([
        axios.get(apiUrl),
        fetch("/api/groups"),
      ]);

      if (newGroupsResponse.status === 200 && permissionGroupsResponse.ok) {
        const newGroups = newGroupsResponse.data.data;

        const permissionGroups = await permissionGroupsResponse.json();
        const matchedGroups = findMatchingGroups(newGroups, permissionGroups);
        // console.log("matched groups :", matchedGroups);
        // setGroups(newGroups); // for test
        setGroups(matchedGroups); // for build
      } else {
        throw new Error("Failed to fetch data from one of the APIs");
      }
    } catch (error) {
      console.error(error);
    } finally {
      // setLoading(false);
    }
  };

  const fetchServiceType = async () => {
    try {
      const { data } = await axios.get(`${url}/all/device/service-types`);

      if (data.status) {
        setServicesTypes(data.message);
      }
    } catch (error) {
      console.error("Error fetching geofences types:", error);
    }
  };

  const findMatchingGroups = (newGroups, permissionGroups) => {
    return newGroups?.filter((newGroup) => {
      return permissionGroups?.some(
        (permissionGroup) => permissionGroup.id === newGroup.traccarId
      );
    });
  };

  const validate = () => {
    const isValidDeviceTypeId = /^[0-9]{15}$/.test(item.uniqueId);

    return (
      // item
      item && item.name && item.uniqueId && item.device_type_id
      // &&
      // isValidDeviceTypeId
    );
  };

  useEffect(() => {
    fetchDevices();
    fetchGroups();
    fetchServiceType();
  }, []);

  return (
    <EditItemView
      endpoint="new-devices"
      item={item}
      setItem={setItem}
      validate={validate}
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "sharedDevice"]}
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
              <Autocomplete
                options={deviceTypes}
                getOptionLabel={(option) =>
                  `${option.name} (${option.protocol_name})`
                }
                value={
                  deviceTypes?.find(
                    (option) => option.id === item.device_type_id
                  ) || null
                }
                onChange={(event, newValue) =>
                  setItem({ ...item, device_type_id: newValue?.id || null })
                }
                // getOptionSelected={(option, value) => option.device_type_id === value.id}
                renderInput={(params) => (
                  <TextField {...params} label={"Device Type"} />
                )}
              />
              <TextField
                value={item.uniqueId || ""}
                onChange={(event) => {
                  setItem({
                    ...item,
                    uniqueId: event.target.value,
                  });
                }}
                label={t("deviceIdentifier")}
                helperText={t("deviceIdentifierHelp")}
              />
              <TextField
                value={item.password || ""}
                onChange={(event) => {
                  setItem({
                    ...item,
                    password: event.target.value,
                  });
                }}
                label="Password"
              />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Backups</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <TextField
                type="number"
                value={item.media_ttl || ""}
                onChange={(event) => {
                  const newValue = parseInt(event.target.value, 10) || "";
                  const clampedValue = Math.min(newValue, 3650);
                  setItem({ ...item, media_ttl: clampedValue });
                }}
                label="Media ttl (Days)"
                inputProps={{ max: 3650 }}
              />
              <TextField
                type="number"
                value={item.messages_ttl || ""}
                onChange={(event) => {
                  const newValue = parseInt(event.target.value, 10) || "";
                  const clampedValue = Math.min(newValue, 3650);
                  setItem({ ...item, messages_ttl: clampedValue });
                }}
                label="Messages ttl (Days)"
                inputProps={{ max: 3650 }}
              />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t("sharedExtra")}</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              {/* <SelectField
                value={item.groupId || 0}
                onChange={(event) => setItem({ ...item, groupId: Number(event.target.value) })}
                endpoint="/api/groups"
                label={t('groupParent')}
              /> */}
              <Autocomplete
                options={groups}
                getOptionLabel={(option) => `${option?.name}(${option?.id})`}
                value={
                  groups?.find((option) => option.traccarId === item.groupId) ||
                  null
                }
                onChange={(event, newValue) =>
                  setItem({ ...item, groupId: newValue?.traccarId || null })
                }
                // getOptionSelected={(option, value) => option.traccarId === value.id}
                renderInput={(params) => (
                  <TextField {...params} label={t("groupParent")} />
                )}
              />
              <Autocomplete
                options={servicesTypes}
                getOptionLabel={(option) => option.name}
                value={
                  servicesTypes.find((opt) => opt.id === item.service_type) ||
                  null
                }
                onChange={(event, newValue) => {
                  setItem({
                    ...item,
                    service_type: newValue?.id,
                    serviceType: newValue || null,
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("settingsVehicleServiceType")}
                  />
                )}
              />

              <TextField
                value={item.cost_by_km || ""}
                onChange={(event) =>
                  setItem({ ...item, cost_by_km: event.target.value })
                }
                label={t("sharedCostByKm")}
              />
              <TextField
                value={item.phone || ""}
                onChange={(event) =>
                  setItem({ ...item, phone: event.target.value })
                }
                label={t("sharedPhone")}
              />
              <TextField
                value={item.model || ""}
                onChange={(event) =>
                  setItem({ ...item, model: event.target.value })
                }
                label={t("deviceModel")}
              />
              <TextField
                value={item.contact || ""}
                onChange={(event) =>
                  setItem({ ...item, contact: event.target.value })
                }
                label={t("deviceContact")}
              />
              <SelectField
                value={item.category || "default"}
                emptyValue={null}
                onChange={(event) =>
                  setItem({ ...item, category: event.target.value })
                }
                data={deviceCategories.map((category) => ({
                  id: category,
                  name: t(
                    `category${category.replace(/^\w/, (c) => c.toUpperCase())}`
                  ),
                }))}
                label={t("deviceCategory")}
              />
              <SelectField
                value={item.calendarId || 0}
                onChange={(event) =>
                  setItem({ ...item, calendarId: Number(event.target.value) })
                }
                endpoint="/api/calendars"
                label={t("sharedCalendar")}
              />
              <TextField
                label={t("userExpirationTime")}
                type="date"
                value={
                  (item.expirationTime &&
                    dayjs(item.expirationTime)
                      .locale("en")
                      .format("YYYY-MM-DD")) ||
                  "2099-01-01"
                }
                onChange={(e) =>
                  setItem({
                    ...item,
                    expirationTime: dayjs(e.target.value, "YYYY-MM-DD")
                      .locale("en")
                      .format(),
                  })
                }
                disabled={!admin}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.disabled}
                    onChange={(event) =>
                      setItem({ ...item, disabled: event.target.checked })
                    }
                  />
                }
                label={t("sharedDisabled")}
                disabled={!admin}
              />
            </AccordionDetails>
          </Accordion>
          <EditAttributesAccordion
            attributes={item.attributes}
            setAttributes={(attributes) => setItem({ ...item, attributes })}
            definitions={{ ...commonDeviceAttributes, ...deviceAttributes }}
          />
        </>
      )}
    </EditItemView>
  );
};

export default NewDevicePage;
