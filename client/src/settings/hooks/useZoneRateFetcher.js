import { useState } from "react";
import axios from "axios";

const useZoneRateFetcher = () => {
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const [zoneRates, setZoneRates] = useState({});

  const fetchZoneRate = async (
    userId,
    deviceDistrict,
    incidentDistrict,
    destinationDistrict,
    deviceId
  ) => {
    console.log(
      { deviceDistrict, incidentDistrict, destinationDistrict },
      "in fetchZoneRate"
    );

    try {
      const response = await axios.get(
        `${url}/dispatch/zone-rates/${userId}?deviceDistrict=${encodeURIComponent(
          deviceDistrict
        )}&incidentDistrict=${encodeURIComponent(
          incidentDistrict
        )}&destinationDistrict=${encodeURIComponent(destinationDistrict)}`
      );
      const data = response.data;

      setZoneRates((prev) => ({
        ...prev,
        [deviceId]: data.zoneRate?.price || "N/A",
      }));
    } catch (error) {
      console.error(`Failed to fetch zone rate for ${deviceId}:`, error);
      setZoneRates((prev) => ({ ...prev, [deviceId]: "N/A" }));
    }
  };

  return { zoneRates, fetchZoneRate };
};

export default useZoneRateFetcher;
