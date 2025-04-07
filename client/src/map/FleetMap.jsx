import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import carPng from "../images/car-4-48.png";
import { useEffect, useState } from "react";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = {
  lat: 24.8607, // Default to Karachi (Change as needed)
  lng: 67.0011,
};

function FlespiMapView({ selectedLocation }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API, // Replace with your API key
  });

  const [map, setMap] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(defaultCenter);

  useEffect(() => {
    if (
      selectedLocation &&
      typeof selectedLocation.latitude === "number" &&
      typeof selectedLocation.longitude === "number"
    ) {
      setMarkerPosition({
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
      });
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (map) {
      if (selectedLocation) {
        map.setCenter(markerPosition);
      } else {
        map.setCenter(defaultCenter);
      }
    }
  }, [map, selectedLocation, markerPosition]);

  return (
    <div>
      {!isLoaded ? (
        <p>Loading Maps...</p>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={16}
          center={selectedLocation || defaultCenter}
          onLoad={(map) => setMap(map)}
        >
          {selectedLocation && (
            <Marker
              position={markerPosition}
              label={{
                text: selectedLocation.deviceName,
                color: "black",
                fontSize: "14px",
                fontWeight: "bold",
              }}
              icon={{
                url: carPng,
                scaledSize: new window.google.maps.Size(40, 40),
                labelOrigin: new window.google.maps.Point(20, -10),
              }}
            />
          )}
        </GoogleMap>
      )}
    </div>
  );
}

export default FlespiMapView;
