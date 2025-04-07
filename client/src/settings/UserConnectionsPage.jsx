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
import NewLinkField from "../common/components/NewLinkField";
import { toast, ToastContainer } from "react-toastify";

const UserConnectionsPage = () => {
  const classes = useSettingsStyles();
  const t = useTranslation();

  const { id, subaccountId } = useParams();

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "settingsUser", "sharedConnections"]}
    >
      <ToastContainer />
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
              baseId={id}
              keyBase="userId"
              keyLink="deviceId"
              label={t("deviceTitle")}
              // flespiUpdatePermissionUrl={`subaccount/${subaccountId}/${id}/permission/devices`}
              // flespiRemovePermissionUrl={`subaccount/${subaccountId}/${id}/remove/permission/devices`}
              component={1}
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
              component={1}
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
              component={1}
            />
            <NewLinkField
              newendpoint="new-maintenances"
              endpointAll="/api/maintenance?all=true"
              endpoint="/api/maintenance"
              endpointLinked={`/api/maintenance?userId=${id}`}
              baseId={id}
              keyBase="userId"
              keyLink="maintenanceId"
              label={"Custom Calculators"}
              component={0}
              calcEndpointAll={"calcs/custom/all"}
              calcAssignEndpoint={`subaccount/assign/calculator/${subaccountId}/${id}`}
              calcUnassignEndpoint={`subaccount/remove/calculator/${subaccountId}/${id}`}
              assignedCalcsEndpoint={`calc/company/custom/assigned/${id}`}
              traccarId={id}
              flespiId={subaccountId}
            />
            {/* <LinkField
              endpointAll="/api/notifications?all=true"
              endpoint="/api/notifications"
              endpointLinked={`/api/notifications?userId=${id}`}
              baseId={id}
              keyBase="userId"
              keyLink="notificationId"
              titleGetter={(it) => formatNotificationTitle(t, it, true)}
              label={t("sharedNotifications")}
            />
            <NewLinkField
              newendpoint="new-calendars"
              endpointAll="/api/calendars?all=true"
              endpoint="/api/calendars"
              endpointLinked={`/api/calendars?userId=${id}`}
              baseId={id}
              keyBase="userId"
              keyLink="calendarId"
              label={t("sharedCalendars")}
            />
            <NewLinkField
              newendpoint="new-attributes"
              endpointAll="/api/attributes/computed?all=true"
              endpoint="/api/attributes/computed"
              endpointLinked={`/api/attributes/computed?userId=${id}`}
              baseId={id}
              keyBase="userId"
              keyLink="attributeId"
              titleGetter={(it) => it.description}
              label={t("sharedComputedAttributes")}
            />
            <NewLinkField
              newendpoint="new-drivers"
              endpointAll="/api/drivers?all=true"
              endpoint="/api/drivers"
              endpointLinked={`/api/drivers?userId=${id}`}
              baseId={id}
              keyBase="userId"
              keyLink="driverId"
              label={t("sharedDrivers")}
            />
            <NewLinkField
              newendpoint="new-commands"
              endpointAll="/api/commands?all=true"
              endpoint="/api/commands"
              endpointLinked={`/api/commands?userId=${id}`}
              baseId={id}
              keyBase="userId"
              keyLink="commandId"
              titleGetter={(it) => it.description}
              label={t("sharedSavedCommands")}
            />
            <NewLinkField
              newendpoint="new-maintenances"
              endpointAll="/api/maintenance?all=true"
              endpoint="/api/maintenance"
              endpointLinked={`/api/maintenance?userId=${id}`}
              baseId={id}
              keyBase="userId"
              keyLink="maintenanceId"
              label={t("sharedMaintenance")}
            /> */}
          </AccordionDetails>
        </Accordion>
      </Container>
    </PageLayout>
  );
};

export default UserConnectionsPage;
