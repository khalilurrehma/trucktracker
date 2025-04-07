import React, { useEffect, useState } from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import { useParams } from "react-router-dom";
import axios from "axios";
import DynamicCalcBody from "./CalculatorComponents/DynamicCalcBody";

const ViewCalculator = () => {
  const { id, name } = useParams();
  let url;

  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const [calc, setCalc] = useState({});

  useEffect(() => {
    if (id) {
      fetchFromApi(id);
    }
  }, [id, name]);

  const fetchFromApi = async (calcId) => {
    try {
      const { data } = await axios.get(`${url}/calcs/${calcId}`);
      if (data.status) {
        setCalc(data.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  return (
    <PageLayout
      menu={<SettingsMenu />}
      breadcrumbs={["settingsTitle", "settingsUser"]}
    >
      <DynamicCalcBody calculator={calc.calcs_body} />
    </PageLayout>
  );
};

export default ViewCalculator;
