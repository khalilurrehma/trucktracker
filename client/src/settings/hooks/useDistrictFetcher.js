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
    const apiKey = import.meta.env.VITE_GOOGLE_MAP_API;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch district");
      }

      const data = await response.json();

      if (data.status !== "OK") {
        throw new Error(`Google Maps API error: ${data.status}`);
      }

      let districtName = "Unknown";
      for (const result of data.results) {
        for (const component of result.address_components) {
          if (
            component.types.includes("sublocality") ||
            component.types.includes("administrative_area_level_2")
          ) {
            districtName = component.long_name;
            break;
          }
        }
        if (
          result.address_components.some(
            (comp) =>
              (comp.types.includes("locality") && comp.long_name === "Lima") ||
              (comp.types.includes("administrative_area_level_1") &&
                comp.long_name === "Lima")
          )
        ) {
          break;
        }
      }

      return districtName;
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      return "Unknown";
    }
  };

  return { districts, fetchDistrict };
};

export default useDistrictFetcher;
