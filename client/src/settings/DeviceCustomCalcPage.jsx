import React, { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Container,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslation } from "../common/components/LocalizationProvider";
import SettingsMenu from "./components/SettingsMenu";
import PageLayout from "../common/components/PageLayout";
import useSettingsStyles from "./common/useSettingsStyles";
import { ToastContainer } from "react-toastify";
import { useAppContext } from "../AppContext";
import DeviceLinkField from "../common/components/DeviceLinkField";
import { useSelector } from "react-redux";

const DeviceCustomCalcPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = searchParams.get("auth");
  const id = searchParams.get("id");
  const { deviceId } = useParams();
  const userId = useSelector((state) => state.session.user.id);
  const classes = useSettingsStyles();
  const t = useTranslation();
  const { traccarUser } = useAppContext();

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Custom Calculators - Devices"]}
    >
      <ToastContainer />
      {traccarUser && (
        <Container maxWidth="xs" className={classes.container}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                {t("sharedConnections")}
              </Typography>
            </AccordionSummary>

            <AccordionDetails className={classes.details}>
              {userId !== 1 && (
                <DeviceLinkField
                  newendpoint={`calcs/company/custom/${userId}`}
                  endpointAll="/api/devices?all=true"
                  endpoint="/api/devices"
                  endpointLinked={`calcs/custom/assigned/devices/${deviceId}/${userId}`}
                  keyBase="userId"
                  keyLink="deviceId"
                  label={"Calculator"}
                  flespiAddUrl={`permission/device/custom/calculator/assign/${userId}`}
                  flespiRemoveUrl={`permission/device/custom/calculator/remove/${userId}`}
                />
              )}
              {userId === 1 && (
                <DeviceLinkField
                  newendpoint="calcs"
                  endpointAll="/api/devices?all=true"
                  endpoint="/api/devices"
                  endpointLinked={`/calcs/custom/admin/assigned/devices/${deviceId}`}
                  keyBase="userId"
                  keyLink="deviceId"
                  label={"Calculator"}
                  flespiAdminAddUrl={`permssion/admin/device/custom/calculator/assign`}
                  flespiAdminRemoveUrl={`permssion/admin/device/custom/calculator/remove`}
                  auth={auth}
                />
              )}
            </AccordionDetails>
          </Accordion>
        </Container>
      )}
    </PageLayout>
  );
};

export default DeviceCustomCalcPage;
