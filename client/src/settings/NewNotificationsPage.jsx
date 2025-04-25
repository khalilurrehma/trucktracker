import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  Button,
  Paper,
  Box,
  Autocomplete,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  Typography,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffectAsync } from "../reactHelper";
import { prefixString } from "../common/util/stringUtils";
import { formatBoolean } from "../common/util/formatter";
import { useTranslation } from "../common/components/LocalizationProvider";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import CollectionFab from "./components/CollectionFab";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CollectionActions from "./components/CollectionActions";
import TableShimmer from "../common/components/TableShimmer";
import SearchHeader, { filterByKeyword } from "./components/SearchHeader";
import useSettingsStyles from "./common/useSettingsStyles";
import axios from "axios";
import { useAppContext } from "../AppContext";

const AlertNotificationTable = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslation();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${url}/subscribed/notifications`);
      if (data.status) {
        setItems(data.message);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchKeyword.toLowerCase()) &&
      (channelFilter ? item.channels.includes(channelFilter) : true)
  );

  return (
    <Box p={3}>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label={t("sharedSearchByName")}
          variant="outlined"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ width: "30%" }}
        />
        <Button
          variant="outlined"
          onClick={fetchNotifications}
          disabled={loading}
        >
          {loading ? t("sharedFetching") : t("sharedFetchData")}
        </Button>
      </Box>

      <TableContainer component={Box}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>MQTT Topic</TableCell>
              <TableCell>Audio Filename</TableCell>
              <TableCell>Channels</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.mqtt_topic}</TableCell>
                <TableCell>{item.audio_filename}</TableCell>
                <TableCell>{item.channels}</TableCell>
                <TableCell sx={{ display: "flex", gap: "8px" }}>
                  <Tooltip title={"Edit Item"}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        // handleDelete(item.id);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={"Delete Item"}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        // handleDelete(item.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const ProtocolNotificationTable = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useTranslation();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${url}/subscribed/protocol/notifications`
      );

      if (data.status) {
        setItems(data.message);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredItems = items?.filter((item) =>
    item.notification_name?.toLowerCase()?.includes(searchKeyword.toLowerCase())
  );

  return (
    <Box p={3}>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label={t("sharedSearchByName")}
          variant="outlined"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ width: "30%" }}
        />
        <Button
          variant="outlined"
          onClick={fetchNotifications}
          disabled={loading}
        >
          {loading ? t("sharedFetching") : t("sharedFetchData")}
        </Button>
      </Box>

      <TableContainer component={Box}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Notification Name</TableCell>
              <TableCell>Alarm Code</TableCell>
              <TableCell>Device Type Id</TableCell>
              <TableCell>Audio Filename</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => {
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.notification_name}</TableCell>
                  <TableCell>{item.notification_code}</TableCell>
                  <TableCell>{item.device_type_id}</TableCell>
                  <TableCell>{item.audio_filename}</TableCell>
                  <TableCell sx={{ display: "flex", gap: "8px" }}>
                    <Tooltip title={"Edit Item"}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          // handleDelete(item.id);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={"Delete Item"}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          // handleDelete(item.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const NewNotificationsPage = () => {
  const { traccarUser } = useAppContext();
  const t = useTranslation();
  const classes = useSettingsStyles();
  const formType = [
    { id: 1, label: "Alert Calculator - Notifications" },
    { id: 2, label: "Protocol Configuration - Notifications" },
  ];
  const [selectedFormType, setSelectedFormType] = useState("");

  const handleChangeTable = () => {
    if (selectedFormType === 1) {
      setSelectedFormType(2);
    } else if (selectedFormType === 2) {
      setSelectedFormType(1);
    }
  };
  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "sharedNotifications"]}
    >
      {!selectedFormType && (
        <Box sx={{ mt: 4, paddingX: 24 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">{t("sharedSelectTableView")}</Typography>
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
      )}
      {selectedFormType && (
        <Button variant="outlined" onClick={handleChangeTable}>
          {t("sharedChangeTableView")}
        </Button>
      )}
      {selectedFormType === 1 && <AlertNotificationTable />}
      {selectedFormType === 2 && <ProtocolNotificationTable />}
      {traccarUser?.superAdmin && (
        <CollectionFab editPath="/settings/notification" />
      )}
    </PageLayout>
  );
};

export default NewNotificationsPage;
