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

  const getDistrictFromCoordinates = async (lat, lng, retries = 2) => {
    const url = `https://maps.nextop.pt/nominatim/reverse?lat=${lat}&lon=${lng}&format=json`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        console.log(
          "Nominatim API Response Status:",
          response.status,
          response.statusText
        );

        if (!response.ok) {
          console.error(
            "Nominatim API Error:",
            response.status,
            response.statusText
          );
          if (attempt === retries) {
            throw new Error(`Network response was not ok: ${response.status}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        const data = await response.json();
        console.log("Nominatim API Response Data:", data);

        const address = data.address || {};
        const districtName =
          address.suburb ||
          address.neighbourhood ||
          address.city_district ||
          address.town ||
          address.city ||
          "Unknown";

        console.log("Selected districtName:", districtName);
        return districtName;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error, { lat, lng, url });
        if (attempt === retries) {
          return "Unknown";
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return "Unknown";
  };

  return { districts, fetchDistrict };
};

export default useDistrictFetcher;
