import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  Autocomplete,
  InputLabel,
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import useSettingsStyles from "./common/useSettingsStyles";
import CustomAutoComplete from "../common/components/CustomAutoComplete";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { fetchFlespiDeviceTypes } from "../apis/api";

const ProtocolNotification = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  let notificationType = [
    { id: 1, label: "Events" },
    { id: 2, label: "Alarms" },
  ];
  let parameterValue = [{ id: 1, label: "alarm.code" }];
  const classes = useSettingsStyles();
  const navigate = useNavigate();
  const [defaultAlarmEvent, setDefaultAlarmEvent] = useState(null);
  const [selectedNotificationType, setSelectedNotificationType] = useState("");
  const [selectedParamValue, setSelectedParamValue] = useState("");
  const [value, setValue] = useState(null);
  const [deviceTypeDD, setDeviceTypeDD] = useState([]);
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState(null);
  const [deviceTypeLoader, setDeviceTypeLoader] = useState(true);
  const [configuredItems, setConfiguredItems] = useState([]);

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

  const handleOnClick = async () => {
    const body = {
      defaultType: defaultAlarmEvent,
      notificationType: selectedNotificationType,
      parameterValue: selectedParamValue,
      deviceTypeId: selectedDeviceTypeId,
      value: value,
    };

    try {
      const { data } = await axios.post(`${url}/protocol/notification`, body);
      if (data.status) {
        toast.success(data.message);
        setTimeout(() => {
          navigate(-1);
        }, 1500);
      }
    } catch (error) {
      toast.error("Failed to create protocol notification.");
    }
  };

  const fetchConfiguredNotification = async (id) => {
    try {
      const { data } = await axios.get(`${url}/configured/notifications/${id}`);
      if (data.status) {
        setConfiguredItems(data.message);
      }
    } catch (error) {
    } finally {
      setDeviceTypeLoader(false);
    }
  };

  useEffect(() => {
    if (selectedDeviceTypeId) {
      fetchConfiguredNotification(selectedDeviceTypeId);
    }
  }, [selectedDeviceTypeId]);

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Protocol Notification"]}
    >
      <Box
        sx={{ display: "flex", justifyContent: "center", width: "100%", mt: 3 }}
      >
        <ToastContainer />
        <Box sx={{ width: "50%" }}>
          <Accordion defaultExpanded sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                {"Protocol Notifications"}
              </Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <Autocomplete
                fullWidth
                options={deviceTypeDD}
                getOptionLabel={(option) =>
                  `${option.name} (${option.protocol_name})`
                }
                value={
                  deviceTypeDD?.find(
                    (option) => option.id === selectedDeviceTypeId
                  ) || null
                }
                onChange={(_, newValue) =>
                  setSelectedDeviceTypeId(newValue ? newValue.id : null)
                }
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
                <>
                  <CustomAutoComplete
                    endpoint={`dropdown/alarms-events`}
                    label={`Default alarms/events`}
                    setDefaultAlarmEvent={setDefaultAlarmEvent}
                    filterConfiguredItems={configuredItems}
                  />
                  <Box>
                    <Select
                      fullWidth
                      value={selectedNotificationType}
                      onChange={(e) =>
                        setSelectedNotificationType(e.target.value)
                      }
                      displayEmpty
                      renderValue={(selected) =>
                        selected
                          ? selected.id === 1
                            ? "Events"
                            : "Alarms"
                          : "Select Notification Type"
                      }
                      sx={{}}
                    >
                      <MenuItem value="" disabled sx={{ color: "GrayText" }}>
                        Select Notification Type
                      </MenuItem>
                      {notificationType.map((type) => {
                        return (
                          <MenuItem key={type.id} value={type}>
                            {type.label}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </Box>
                  <Box>
                    <Select
                      fullWidth
                      value={selectedParamValue}
                      onChange={(e) => setSelectedParamValue(e.target.value)}
                      displayEmpty
                      renderValue={(selected) =>
                        selected
                          ? selected.id === 1
                            ? "alarm.code"
                            : "Alarms"
                          : "Select Parameter"
                      }
                      sx={{}}
                    >
                      <MenuItem value="" disabled sx={{ color: "GrayText" }}>
                        Select Parameter
                      </MenuItem>
                      {parameterValue.map((param) => {
                        return (
                          <MenuItem key={param.id} value={param}>
                            {param.label}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      label="Enter parameter value"
                      placeholder="parameter value"
                      variant="outlined"
                      type="number"
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </Box>
                </>
              )}
            </AccordionDetails>
          </Accordion>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 6 }}>
            <Button
              variant="outlined"
              color="primary"
              sx={{ paddingX: 4 }}
              onClick={() => {
                navigate(-1);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              sx={{ paddingX: 5 }}
              onClick={handleOnClick}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Box>
    </PageLayout>
  );
};

export default ProtocolNotification;
