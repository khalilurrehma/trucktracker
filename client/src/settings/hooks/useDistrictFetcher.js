import { useState } from "react";

// Custom hook to manage districts
const useDistrictFetcher = () => {
  const [districts, setDistricts] = useState({});

  const fetchDistrict = async (lat, lng, deviceId) => {
    try {
      const districtName = await getDistrictFromCoordinates(lat, lng);
      setDistricts((prev) => ({ ...prev, [deviceId]: districtName }));
      return districtName;
    } catch (error) {
      console.error("Error fetching district:", error);
      setDistricts((prev) => ({ ...prev, [deviceId]: "Unknown" }));
      return "Unknown";
    }
  };

  const getDistrictFromCoordinates = async (lat, lng) => {
    // const apiKey = import.meta.env.VITE_GOOGLE_MAP_API;
    const url = `http://198.7.113.174/nominatim/reverse?lat=${lat}&lon=${lng}&format=json`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      const { suburb } = data.address;

      console.log(suburb);

      let districtName = "unknown";

      return suburb ? suburb : districtName;
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      return "Unknown";
    }
  };

  return { districts, fetchDistrict };
};

export default useDistrictFetcher;
