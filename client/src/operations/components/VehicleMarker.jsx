// src/operations/components/VehicleMarker.jsx
import TruckMarker from "./TruckMarker";
import CarMarker from "./CarMarker";
import BikeMarker from "./BikeMarker";
import DumperMarker from "./DumperMarker";

export default function VehicleMarker({ type, ...props }) {
  switch (type) {
    case "truck":
      return <TruckMarker {...props} />;
    case "car":
      return <CarMarker {...props} />;
    case "bicycle":
      return <BikeMarker {...props} />;
    case "bike":
      return <BikeMarker {...props} />;
    case "dumper":
      return <DumperMarker {...props} />;
    default:
      return <TruckMarker {...props} />;
  }
}
