import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import carSVG from "../../resources/images/icon/car.svg";

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng]);
  return null;
};

const LiveMap = ({ latitude, longitude, direction }) => {
  const [smoothDirection, setSmoothDirection] = useState(direction);

  useEffect(() => {
    let animationFrame;
    const animate = () => {
      setSmoothDirection((prev) => {
        const diff = ((direction - prev + 540) % 360) - 180;
        const step = Math.sign(diff) * Math.min(Math.abs(diff), 5);
        return prev + step;
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [direction]);

  const dynamicIcon = new L.DivIcon({
    html: `<img src="${carSVG}" style="width:32px; height:32px; transform: rotate(${smoothDirection}deg); transform-origin: center;" />`,
    iconSize: [32, 32],
    className: "",
  });

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      scrollWheelZoom={false}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} icon={dynamicIcon} />
      <RecenterMap lat={latitude} lng={longitude} />
    </MapContainer>
  );
};

export default LiveMap;
