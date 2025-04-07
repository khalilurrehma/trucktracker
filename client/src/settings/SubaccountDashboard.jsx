import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { useParams } from "react-router-dom";
import { subaccountCounter } from "../apis/api";
import {
  Card,
  Grid,
  CardContent,
  Typography,
  Divider,
  Box,
  CircularProgress,
  Collapse,
  List,
  ListItem,
} from "@mui/material";
import ExpandableCard from "./components/ExpandAbleCard";

const SubaccountDashboard = () => {
  const { id, name } = useParams();

  const [devices, setDevices] = useState(null);
  const [groups, setGroups] = useState(null);
  const [calcs, setCalcs] = useState(null);
  const [realms, setRealms] = useState(null);
  const [geofences, setGeofences] = useState(null);

  useEffect(() => {
    fetchCounters(id);
  }, [id]);

  const fetchCounters = async (subaccountId) => {
    try {
      const response = await subaccountCounter(subaccountId);

      setDevices(response.devices);
      setGroups(response.groups);
      setCalcs(response.calcs);
      setRealms(response.realms);
      setGeofences(response.geofences);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "settingsUser"]}
    >
      <Typography variant="h4" sx={{ paddingLeft: 3, paddingTop: 3 }}>
        {name}
      </Typography>
      <Grid container spacing={3} sx={{ padding: 3 }}>
        <Grid item md={3}>
          <ExpandableCard
            title="Devices"
            count={devices?.count}
            countLimit={devices?.count_limit}
            apiUrl={`subaccount/counter/items/${id}/devices`}
          />
        </Grid>
        <Grid item md={3}>
          <ExpandableCard
            title="Groups"
            count={groups?.count}
            countLimit={groups?.count_limit}
            apiUrl={`subaccount/counter/items/${id}/groups`}
          />
        </Grid>
        <Grid item md={3}>
          <ExpandableCard
            title="Calculators"
            count={calcs?.count}
            countLimit={calcs?.count_limit}
            apiUrl={`subaccount/counter/items/${id}/calcs`}
          />
        </Grid>
        <Grid item md={3}>
          <ExpandableCard
            title="Users"
            count={realms?.count}
            countLimit={realms?.count_limit}
            expection={"realms"}
            apiUrl={`subaccount/counter/realm/users/${id}`}
          />
        </Grid>
        <Grid item md={3}>
          <ExpandableCard
            title="Geofences"
            count={geofences?.count}
            countLimit={geofences?.count_limit}
            apiUrl={`subaccount/counter/items/${id}/geofences`}
          />
        </Grid>
      </Grid>
    </PageLayout>
  );
};

export default SubaccountDashboard;
