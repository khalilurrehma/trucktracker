import React, { useEffect, useState } from "react";

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Button,
  TextField,
  Box,
  Select,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UploadFileIcon from "@mui/icons-material/Upload";
import {
  useTranslation,
  useTranslationKeys,
} from "../common/components/LocalizationProvider";
import EditItemView from "./components/EditItemView3";
import { prefixString, unprefixString } from "../common/util/stringUtils";
import SelectField from "../common/components/SelectField";
import SettingsMenu from "./components/SettingsMenu";
import { useCatch } from "../reactHelper";
import useSettingsStyles from "./common/useSettingsStyles";
import NewSelectField from "../common/components/NewSelectField";
import { toast, ToastContainer } from "react-toastify";
import PageLayout from "../common/components/PageLayout";
import { fetchFlespiDeviceTypes } from "../apis/api";
import axios from "axios";

const NewNotificationPage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const formType = [
    { id: 1, label: "Alert Calculator - Notifications" },
    { id: 2, label: "Protocol Configuration" },
  ];

  const [item, setItem] = useState();
  const [selectedFormType, setSelectedFormType] = useState("");
  const [deviceTypeDD, setDeviceTypeDD] = useState([]);
  const [deviceTypeLoader, setDeviceTypeLoader] = useState(true);
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState(null);
  const [configuredItems, setConfiguredItems] = useState([]);
  const [selectedConfiguredItems, setSelectedConfiguredItems] = useState([]);

  useEffect(() => {
    getDeviceTypeDropDown();
  }, []);

  const getDeviceTypeDropDown = async () => {
    try {
      const response = await fetchFlespiDeviceTypes();
      setDeviceTypeDD(response);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchConfiguredProtocolNotification = async (id) => {
    try {
      const { data } = await axios.get(`${url}/configured/protocol/${id}`);

      if (data.status) {
        setConfiguredItems(data.message);
        setDeviceTypeLoader(false);
      }
    } catch (error) {
      if (error.status === 404) {
        toast.error(error.response.data.message);
      }
    }
  };

  useEffect(() => {
    if (selectedDeviceTypeId) {
      fetchConfiguredProtocolNotification(selectedDeviceTypeId);
    }
  }, [selectedDeviceTypeId]);

  const validate = () =>
    selectedFormType === 1
      ? item && item.type
      : item && selectedDeviceTypeId && selectedConfiguredItems;

  const PageLoad = () => {
    return (
      <PageLayout
        menu={<SettingsMenu />}
        breadcrumbs2={["settingsTitle", "Notifications"]}
      >
        <Box sx={{ mt: 4, paddingX: 24 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Select Form Type</Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <Select
                value={selectedFormType}
                onChange={(e) => setSelectedFormType(e.target.value)}
                fullWidth
                displayEmpty
              >
                <MenuItem value="" disabled>
                  Select an option
                </MenuItem>
                {formType.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </AccordionDetails>
          </Accordion>
        </Box>
      </PageLayout>
    );
  };

  return (
    <>
      {!selectedFormType && <PageLoad />}
      {selectedFormType === 1 && (
        <EditItemView
          endpoint="subscribe/notification"
          item={item}
          setItem={setItem}
          validate={validate}
          menu={<SettingsMenu />}
          breadcrumbs={["settingsTitle", "sharedNotification"]}
        >
          {item && (
            <>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    {t("sharedRequired")}
                  </Typography>
                </AccordionSummary>
                <ToastContainer />
                <AccordionDetails className={classes.details}>
                  <NewSelectField
                    value={item.type}
                    onChange={(e) => setItem({ ...item, type: e.target.value })}
                    endpoint="/notifications"
                    keyGetter={(it) => it.type}
                    titleGetter={(it) => t(prefixString("event", it.type))}
                    label={t("sharedType")}
                  />
                  <SelectField
                    multiple
                    value={
                      item.notificators ? item.notificators.split(/[, ]+/) : []
                    }
                    onChange={(e) =>
                      setItem({ ...item, notificators: e.target.value.join() })
                    }
                    endpoint="/api/notifications/notificators"
                    keyGetter={(it) => it.type}
                    titleGetter={(it) =>
                      t(prefixString("notificator", it.type))
                    }
                    label={t("notificationNotificators")}
                  />
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                  >
                    {"Select Audio File"}
                    <input
                      type="file"
                      accept="audio/mp3"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files[0];

                        if (!file) return;

                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("File size must be under 2MB");
                          return;
                        }

                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onloadend = () => {
                          setItem({ ...item, audioFile: file });
                        };
                      }}
                    />
                  </Button>

                  {item.audioFile && (
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {"Selected File"}: {item.audioFile.name}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </EditItemView>
      )}
      {selectedFormType === 2 && (
        <EditItemView
          endpoint="subscribe/protocol/notification"
          item={item}
          setItem={setItem}
          validate={validate}
          menu={<SettingsMenu />}
          breadcrumbs={["settingsTitle", "sharedNotification"]}
        >
          {item && (
            <>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    {`Subscribe Protocol Notifications`}
                  </Typography>
                </AccordionSummary>
                <ToastContainer />
                <AccordionDetails className={classes.details}>
                  <Autocomplete
                    fullWidth
                    options={deviceTypeDD}
                    getOptionLabel={(option) =>
                      `${option?.name} (${option?.protocol_name})`
                    }
                    value={
                      deviceTypeDD?.find(
                        (option) => option.id === selectedDeviceTypeId
                      ) || null
                    }
                    onChange={(_, newValue) => {
                      setSelectedDeviceTypeId(newValue ? newValue.id : null);
                      setItem({
                        ...item,
                        device_type_id: newValue ? newValue.id : null,
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search Model"
                        placeholder="Type to search..."
                      />
                    )}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value?.id
                    }
                  />

                  {!deviceTypeLoader && (
                    <Box>
                      <Select
                        fullWidth
                        value={selectedConfiguredItems}
                        onChange={(e) => {
                          setSelectedConfiguredItems(e.target.value);
                          setItem({
                            ...item,
                            configured_items: e.target.value,
                          });
                        }}
                        displayEmpty
                        sx={{ mb: 2 }}
                      >
                        <MenuItem value="" disabled sx={{ color: "GrayText" }}>
                          Available Options
                        </MenuItem>
                        {configuredItems?.map((type) => {
                          return (
                            <MenuItem key={type.id} value={type}>
                              {type.notification_name}
                            </MenuItem>
                          );
                        })}
                      </Select>

                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileIcon />}
                      >
                        {"Select Audio File"}
                        <input
                          type="file"
                          accept="audio/mp3"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files[0];

                            if (!file) return;

                            if (file.size > 2 * 1024 * 1024) {
                              toast.error("File size must be under 2MB");
                              return;
                            }

                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onloadend = () => {
                              setItem({ ...item, audioFile: file });
                            };
                          }}
                        />
                      </Button>

                      {item.audioFile && (
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          {"Selected File"}: {item.audioFile.name}
                        </Typography>
                      )}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </EditItemView>
      )}
    </>
  );
};

export default NewNotificationPage;
