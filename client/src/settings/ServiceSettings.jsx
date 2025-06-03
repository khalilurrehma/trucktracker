import React, { useState } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { Box, Button } from "@mui/material";
import { useTranslation } from "../common/components/LocalizationProvider";
import DeviceServiceTypes from "./DeviceServiceTypes";
import ServiceTypesSubServices from "./ServiceTypesSubServices";
import AssignedDevicesServices from "./AssignedDevicesServices";
import CaseStages from "./CaseStages";
import SubservicePrices from "./SubservicePrices";

const ServiceSettings = () => {
  const t = useTranslation();
  const [component, setComponent] = useState(1);

  const handleComponentChange = (newValue) => {
    setComponent(newValue);
  };

  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Service Settings"]}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "center",
          gap: 4,
          borderBottom: 2,
          borderColor: "divider",
        }}
      >
        <Button
          sx={{
            fontSize: 16,
            textTransform: "none",
            color: component === 1 ? "royalblue" : "text.primary",
          }}
          onClick={() => handleComponentChange(1)}
        >
          {t("settingsVehicleServiceType")}
        </Button>
        <Button
          sx={{
            fontSize: 16,
            textTransform: "none",
            color: component === 2 ? "royalblue" : "text.primary",
          }}
          onClick={() => handleComponentChange(2)}
        >
          {t("settingsServiceTypeSubServices")}
        </Button>
        <Button
          sx={{
            fontSize: 16,
            textTransform: "none",
            color: component === 3 ? "royalblue" : "text.primary",
          }}
          onClick={() => handleComponentChange(3)}
        >
          {t("settingsAssignService")}
        </Button>
        <Button
          sx={{
            fontSize: 16,
            textTransform: "none",
            color: component === 4 ? "royalblue" : "text.primary",
          }}
          onClick={() => handleComponentChange(4)}
        >
          {t("operationsSubprocesses")}
        </Button>
        <Button
          sx={{
            fontSize: 16,
            textTransform: "none",
            color: component === 5 ? "royalblue" : "text.primary",
          }}
          onClick={() => handleComponentChange(5)}
        >
          Subservice prices
          {/* {t("operationsSubprocesses")} */}
        </Button>
      </Box>

      {component === 1 && <DeviceServiceTypes />}
      {component === 2 && <ServiceTypesSubServices />}
      {component === 3 && <AssignedDevicesServices />}
      {component === 4 && <CaseStages />}
      {component === 5 && <SubservicePrices />}
    </PageLayout>
  );
};

export default ServiceSettings;
