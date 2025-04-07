import React, { useEffect, useState } from "react";
import GoogleMapComponent from "./GoogleMapComponent";

const LiveLocationMap = ({ device, lat, long, deviceLocation }) => {
  const [initialAddress, setInitialAddress] = useState("");
  const [driverAuthLocation, setDriverAuthLocation] = useState({
    lat: 0,
    lng: 0,
  });

  useEffect(() => {
    if (lat && long) {
      const parsedLat = parseFloat(lat);
      const parsedLong = parseFloat(long);

      if (!isNaN(parsedLat) && !isNaN(parsedLong)) {
        setDriverAuthLocation({ lat: parsedLat, lng: parsedLong });
      } else {
        console.error("Invalid latitude or longitude");
      }
    }
  }, [lat, long]);

  const isValidLocation =
    driverAuthLocation.lat !== 0 &&
    driverAuthLocation.lng !== 0 &&
    deviceLocation.latitude !== 0 &&
    deviceLocation.longitude !== 0;

  return (
    <div>
      {isValidLocation && (
        <GoogleMapComponent
          styles={{ height: "500px" }}
          center={driverAuthLocation}
          radius={100}
          devicePosition={deviceLocation}
        />
      )}
      {!isValidLocation && <div>Loading map...</div>}
    </div>
  );
};

export default LiveLocationMap;
