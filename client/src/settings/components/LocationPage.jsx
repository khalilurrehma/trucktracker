import React, { useEffect, useState } from "react";
import PageLayout from "../../common/components/PageLayout";
import SettingsMenu from "./SettingsMenu";
import { useParams } from "react-router-dom";

const LocationPage = () => {
  const { lat, long } = useParams();

  useEffect(() => {
    console.log(lat, long);
  });
  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "configShifts"]}
    >
      <div className="p-4 rounded-lg">
        <iframe
          className="h-[95vh]"
          title="Driver Location Map"
          width="100%"
          height=""
          src={`https://www.google.com/maps?q=${lat},${long}&output=embed`}
        />
      </div>
    </PageLayout>
  );
};

export default LocationPage;
