import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ZonesSidebar from "../components/operations/ZonesSidebar";
import AlertsPanel from "../components/operations/AlertsPanel";
import OperationDetailMap from "../components/maps/OperationDetailMap";
import { getOperationById } from "../../apis/operationApi";
import { getZonesByOperationId } from "../../apis/zoneApi";
import { useAppContext } from "../../AppContext";

const OperationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedZoneId, setSelectedZoneId] = useState();
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [operation, setOperation] = useState(null);
  const [zones, setZones] = useState([]);
  const [mapCenter, setMapCenter] = useState([-76.9, -15.5]);
  const [operationPolygon, setOperationPolygon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const {
    mqttMessages = [],
    mqttReportsEvents = [],
    mqttDriverBehaivor = [],
    mqttOperationStats = [],
    mqttDeviceLiveLocation = [],
    mqttDeviceDin = [],
    mqttDeviceIgnitionStatus = [],
    mqttDeviceConnected = [],
    mqttCalculatorIntervals = [],
    mqttGeofences = [],
    subprocessEvents = [],
    liveSuggestedServices = [],
    liveRimacCases = [],
  } = useAppContext() || {};

  const normalizeGeometry = (value) => {
    if (!value) return null;
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    if (raw.type === "Feature") {
      return raw;
    }
    if (raw.geometry && raw.type) {
      return raw;
    }
    if (raw.type && raw.coordinates) {
      return {
        type: "Feature",
        properties: {},
        geometry: raw,
      };
    }
    return null;
  };

  const circleToPolygon = (center, radiusMeters, points = 64) => {
    const [lng, lat] = center;
    const latRadius = radiusMeters / 111320;
    const lngRadius = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
    const coordinates = [];
    for (let i = 0; i <= points; i += 1) {
      const angle = (i / points) * 2 * Math.PI;
      coordinates.push([
        lng + lngRadius * Math.cos(angle),
        lat + latRadius * Math.sin(angle),
      ]);
    }
    return {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [coordinates] },
    };
  };

  const resolvePolygonFromGeometry = (geometryValue) => {
    const raw = typeof geometryValue === "string" ? JSON.parse(geometryValue) : geometryValue;
    if (raw?.path && Array.isArray(raw.path)) {
      const coordinates = raw.path.map((point) => [point.lon, point.lat]);
      if (coordinates.length > 2) {
        coordinates.push(coordinates[0]);
        return {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [coordinates] },
        };
      }
    }
    if (raw?.type === "polygon" && Array.isArray(raw.path)) {
      const coordinates = raw.path.map((point) => [point.lon, point.lat]);
      if (coordinates.length > 2) {
        coordinates.push(coordinates[0]);
        return {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [coordinates] },
        };
      }
    }
    if (raw?.type === "circle" && raw?.center && raw?.radius) {
      return circleToPolygon([raw.center.lon, raw.center.lat], raw.radius);
    }
    const geometry = normalizeGeometry(geometryValue);
    if (geometry?.geometry?.type === "Polygon") {
      return geometry;
    }
    if (geometry?.geometry?.type === "circle" && geometry?.geometry?.coordinates?.length >= 2) {
      const [lng, lat] = geometry.geometry.coordinates;
      const radius = geometry.geometry.radius || 0;
      return circleToPolygon([lng, lat], radius);
    }
    return null;
  };

  const getPolygonCenter = (feature) => {
    const coords = feature?.geometry?.coordinates?.[0];
    if (!coords || coords.length === 0) return null;
    let sumLng = 0;
    let sumLat = 0;
    const len = coords.length - 1;
    for (let i = 0; i < len; i += 1) {
      sumLng += coords[i][0];
      sumLat += coords[i][1];
    }
    return [sumLng / len, sumLat / len];
  };

  const handleZoneSelect = (zone) => {
    setSelectedZoneId(zone.id);
  };

  const handleBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!id) {
        setLoadError("Missing operation id.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError("");
      try {
        const [operationData, zonesData] = await Promise.all([
          getOperationById(id),
          getZonesByOperationId(id),
        ]);
        if (!isMounted) return;
        setOperation(operationData);
        const mappedZones = (zonesData || [])
          .map((zone) => ({
            id: zone.id,
            name: zone.name,
            type: zone.zoneType || zone.type || "ZONE_AREA",
            polygon: resolvePolygonFromGeometry(zone.geometry),
          }))
          .filter((zone) => zone.polygon);
        setZones(mappedZones);
        if (mappedZones.length > 0 && !selectedZoneId) {
          setSelectedZoneId(mappedZones[0].id);
        }
        const opGeometry = resolvePolygonFromGeometry(operationData?.geometry);
        const opCenter = opGeometry ? getPolygonCenter(opGeometry) : null;
        setOperationPolygon(opGeometry);
        if (opCenter) {
          setMapCenter(opCenter);
        }
      } catch (error) {
        console.error("Failed to load operation detail:", error);
        setLoadError("Failed to load operation detail.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [id, selectedZoneId]);

  const operationName = useMemo(() => {
    return operation?.name || `Operation ${id || ""}`.trim();
  }, [operation?.name, id]);

  const alerts = useMemo(() => {
    const buildAlert = (entry, type, label, index) => {
      const timestampValue =
        entry?.timestamp ||
        entry?.time ||
        entry?.created_at ||
        entry?.updated_at ||
        Date.now();
      const timestamp = new Date(timestampValue).toLocaleTimeString();
      const vehicleId =
        entry?.deviceId ||
        entry?.flespiDeviceId ||
        entry?.device_id ||
        entry?.id ||
        "unknown";
      const message =
        entry?.message ||
        entry?.eventType ||
        entry?.topic ||
        entry?.key ||
        label;
      return {
        id: `${label}-${vehicleId}-${timestampValue}-${index}`,
        timestamp,
        vehicleId,
        message: String(message),
        type,
      };
    };

    const items = [
      ...mqttMessages.map((entry, index) => buildAlert(entry, "error", "alarm", index)),
      ...mqttReportsEvents.map((entry, index) => buildAlert(entry, "info", "event", index)),
      ...mqttDriverBehaivor.map((entry, index) => buildAlert(entry, "warning", "behavior", index)),
      ...mqttOperationStats.map((entry, index) => buildAlert(entry, "info", "op-stats", index)),
      ...mqttDeviceLiveLocation.map((entry, index) => buildAlert(entry, "info", "live", index)),
      ...mqttDeviceDin.map((entry, index) => buildAlert(entry, "warning", "din", index)),
      ...mqttDeviceIgnitionStatus.map((entry, index) => buildAlert(entry, "warning", "ignition", index)),
      ...mqttDeviceConnected.map((entry, index) => buildAlert(entry, "info", "connected", index)),
      ...mqttCalculatorIntervals.map((entry, index) => buildAlert(entry, "info", "calc", index)),
      ...mqttGeofences.map((entry, index) => buildAlert(entry, "info", "geofence", index)),
      ...subprocessEvents.map((entry, index) => buildAlert(entry, "info", "subprocess", index)),
      ...liveSuggestedServices.map((entry, index) => buildAlert(entry, "info", "service", index)),
      ...liveRimacCases.map((entry, index) => buildAlert(entry, "info", "rimac", index)),
    ];

    return items.slice(-100).reverse();
  }, [
    mqttMessages,
    mqttReportsEvents,
    mqttDriverBehaivor,
    mqttOperationStats,
    mqttDeviceLiveLocation,
    mqttDeviceDin,
    mqttDeviceIgnitionStatus,
    mqttDeviceConnected,
    mqttCalculatorIntervals,
    mqttGeofences,
    subprocessEvents,
    liveSuggestedServices,
    liveRimacCases,
  ]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-destructive">{loadError}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Left Sidebar - Zones */}
      <ZonesSidebar
        operationId={id || ""}
        operationName={operationName}
        zones={zones}
        selectedZoneId={selectedZoneId}
        onZoneSelect={handleZoneSelect}
        onBack={handleBack}
      />

      {/* Main Map Area */}
      <div className="flex-1 relative">
        <OperationDetailMap
          operationId={id || ""}
          zones={zones}
          selectedZoneId={selectedZoneId}
          operationPolygon={operationPolygon}
          center={mapCenter}
          zoom={13}
          onAlertsToggle={() => setAlertsOpen(!alertsOpen)}
          alertsOpen={alertsOpen}
        />

        {/* Alerts Panel */}
        <AlertsPanel
          alerts={alerts}
          isOpen={alertsOpen}
          onClose={() => setAlertsOpen(false)}
        />
      </div>
    </div>
  );
};

export default OperationDetail;
