import React from "react";
import PageLayout from "../common/components/PageLayout";
import SettingsMenu from "./components/SettingsMenu";
import SpeedometerGauge from "./components/SpeedometerGauge";
import VehicleOrientation from "./components/VehicleOrientation";
import StatusBar from "./components/StatusBar";
import TelemetryDataGrid from "./components/TelemetryDataGrid";
import { useTelemetryData } from "./hooks/useTelemetryData";
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMap,
  Marker,
} from "react-leaflet";
import LiveMap from "./components/LiveMap";

const DeviceTelemetry = () => {
  const { data, activeFields, isOnline } = useTelemetryData();

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Top Section - Main Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-80">
        {/* Speedometer */}
        <div className="flex items-center justify-center">
          <SpeedometerGauge
            speed={data.position.speed}
            maxSpeed={240}
            unit="km/h"
          />
        </div>

        <div className="lg:col-span-1 rounded-lg overflow-hidden">
          <LiveMap
            latitude={data.position.latitude}
            longitude={data.position.longitude}
          />
        </div>

        {/* Vehicle Orientation */}
        <div className="flex items-center justify-center">
          <VehicleOrientation
            direction={data.position.direction}
            speed={data.position.speed}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        deviceName={data.device.name}
        deviceId={data.device.id.toString()}
        timestamp={data.server.timestamp}
        isOnline={isOnline}
        peer={data.peer}
      />

      {/* Telemetry Data Grid */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">
          Telemetry Data
        </h2>
        <TelemetryDataGrid data={data} activeFields={activeFields} />
      </div>
    </div>
  );
};

export default DeviceTelemetry;
