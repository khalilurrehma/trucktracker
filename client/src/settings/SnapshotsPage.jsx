import React from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";

const SnapshotsPage = () => {
  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs2={["settingsTitle", "Snapshots"]}
    ></PageLayout>
  );
};

export default SnapshotsPage;
