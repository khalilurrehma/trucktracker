import React, { useEffect, useState } from "react";
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  IconButton,
  Box,
  TextField,
  Button,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import PageLayout from "../common/components/PageLayout";
import CollectionFab from "./components/CollectionFab";
import SettingsMenu from "./components/SettingsMenu";
import TableShimmer from "../common/components/TableShimmer";
import { useTranslation } from "../common/components/LocalizationProvider";
import axios from "axios";
import useSettingsStyles from "./common/useSettingsStyles";
import SearchHeader from "./components/SearchHeader";

const ProtocolNotifications = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }
  const t = useTranslation();
  const classes = useSettingsStyles();
  const [items, setItems] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterInput, setFilterInput] = useState("");

  useEffect(() => {
    fetchFromApi();
  }, []);

  const fetchFromApi = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${url}/protocol/notifications`);
      if (data.status) {
        let resp = data?.message;
        setItems(resp);
        setColumns(Object.keys(resp[0]));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "sharedNotifications"]}
    >
      <Table className={classes.table}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column}>
                {(column === "name" && t("sharedName")) ||
                  (column === "id" && column) ||
                  (column === "type" && t("sharedType")) ||
                  (column === "deviceType" && t("deviceTypeId")) ||
                  (column === "parameter" && t("parameter")) ||
                  (column === "Alarm Code" && t("notificationAlarmCode")) ||
                  (column === "createdAt" && t("sharedCreated")) ||
                  column}
              </TableCell>
            ))}
            <TableCell>{t("sharedAction")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading ? (
            items.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={`${column}_${index}`}>
                    {column === "createdAt"
                      ? dayjs(item[column]).format("YYYY-MM-DD HH:mm:ss")
                      : item[column]}
                  </TableCell>
                ))}
                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(item.id)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    // color="error"
                    onClick={() => handleDelete(item.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableShimmer columns={8} endAction />
          )}
        </TableBody>
      </Table>
      <CollectionFab editPath="/settings/protocol/notification" />
    </PageLayout>
  );
};

export default ProtocolNotifications;
