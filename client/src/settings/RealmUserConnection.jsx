import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkField from "../common/components/LinkField";
import { useTranslation } from "../common/components/LocalizationProvider";
import SettingsMenu from "./components/SettingsMenu";
import { formatNotificationTitle } from "../common/util/formatter";
import PageLayout from "../common/components/PageLayout";
import useSettingsStyles from "./common/useSettingsStyles";
import NewLinkField from "../common/components/NewLinkField2";
import { toast, ToastContainer } from "react-toastify";
import { useAppContext } from "../AppContext";

const RealmUserConnection = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();
  const { traccarUser } = useAppContext();

  const { realmId, realmuserId, id } = useParams();

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "settingsUser", "sharedConnections"]}
    >
      <ToastContainer />
      {traccarUser?.id && (
        <Container maxWidth="xs" className={classes.container}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                {t("sharedConnections")}
              </Typography>
            </AccordionSummary>
            <AccordionDetails className={classes.details}>
              <NewLinkField
                newendpoint="new-devices"
                endpointAll="/api/devices?all=true"
                endpoint="/api/devices"
                endpointLinked={`/api/devices?userId=${id}`}
                baseId={parseInt(id)}
                keyBase="userId"
                keyLink="deviceId"
                label={t("deviceTitle")}
                flespiAddUrl={`realm/${realmId}/user/${realmuserId}/permission/devices`}
                flespiRemoveUrl={`realm/${realmId}/user/${realmuserId}/remove/permission/devices`}
                type={"devices"}
                componentType={1}
              />
              <NewLinkField
                newendpoint="new-groups"
                endpointAll="/api/groups?all=true"
                endpoint="/api/groups"
                endpointLinked={`/api/groups?userId=${id}`}
                baseId={id}
                keyBase="userId"
                keyLink="groupId"
                label={t("settingsGroups")}
                flespiAddUrl={`realm/${realmId}/user/${realmuserId}/permission/groups`}
                flespiRemoveUrl={`realm/${realmId}/user/${realmuserId}/remove/permission/groups`}
                type={"groups"}
                componentType={1}
              />
              <NewLinkField
                newendpoint="new-geofences"
                endpointAll="/api/geofences?all=true"
                endpoint="/api/geofences"
                endpointLinked={`/api/geofences?userId=${id}`}
                baseId={id}
                keyBase="userId"
                keyLink="geofenceId"
                label={t("sharedGeofences")}
                flespiAddUrl={`realm/${realmId}/user/${realmuserId}/permission/geofences`}
                flespiRemoveUrl={`realm/${realmId}/user/${realmuserId}/remove/permission/geofences`}
                type={"geofences"}
                componentType={1}
              />
              <NewLinkField
                newendpoint="new-maintenances"
                endpointAll="/api/maintenance?all=true"
                endpoint="/api/maintenance"
                endpointLinked={`/api/maintenance?userId=${id}`}
                calcEndPoint={`calcs/traccarId`}
                linkedCalc={`calcs/linked/realm/${realmId}/user/${realmuserId}/${traccarUser?.id}`}
                // traccarUser
                companyTraccarId={traccarUser?.id}
                baseId={id}
                keyBase="userId"
                keyLink="maintenanceId"
                label={"Calculators"}
                flespiAddUrl={`realm/${realmId}/user/${realmuserId}/permission/calculators`}
                flespiRemoveUrl={`realm/${realmId}/user/${realmuserId}/remove/permission/calculators`}
                componentType={2}
              />
            </AccordionDetails>
          </Accordion>
        </Container>
      )}
    </PageLayout>
  );
};

export default RealmUserConnection;
