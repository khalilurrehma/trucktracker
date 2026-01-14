import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ZonesSidebar from "../components/operations/ZonesSidebar";
import AlertsPanel from "../components/operations/AlertsPanel";
import OperationDetailMap from "../components/maps/OperationDetailMap";
import DispatchGeofenceDashboard from "../dashboard/DispatchGeofenceDashboard";
import { getOperationById } from "../../apis/operationApi";
import { getZonesByOperationId } from "../../apis/zoneApi";
import { useAppContext } from "../../AppContext";

const OperationDetailSplit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const dataTheme = theme?.palette?.mode === "dark" ? "dark" : "light";
  const [selectedZoneId, setSelectedZoneId] = useState();
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [operation, setOperation] = useState(null);
  const [zones, setZones] = useState([]);
  const [mapCenter, setMapCenter] = useState([-76.9, -15.5]);
  const [operationPolygon, setOperationPolygon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const geofenceParam = new URLSearchParams(location.search).get("geofenceId");
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

  const parseGeometryValue = (value) => {
    if (!value) return null;
    let parsed = value;
    for (let i = 0; i < 2; i += 1) {
      if (typeof parsed !== "string") break;
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {
        break;
      }
    }
    return parsed;
  };

  const normalizeGeometry = (value) => {
    if (!value) return null;
    const raw = parseGeometryValue(value);
    if (!raw) return null;
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

  const closeRing = (coords) => {
    if (!Array.isArray(coords) || coords.length < 3) return coords;
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (!first || !last) return coords;
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return [...coords, first];
    }
    return coords;
  };

  const closePolygonFeature = (feature) => {
    if (!feature?.geometry) return feature;
    if (feature.geometry.type === "Polygon") {
      const ring = feature.geometry.coordinates?.[0];
      if (ring) {
        const closed = closeRing(ring);
        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: [closed],
          },
        };
      }
    }
    return feature;
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
    const raw = parseGeometryValue(geometryValue);
    if (!raw) return null;
    if (raw?.type === "circle" && raw?.center && raw?.radius) {
      return circleToPolygon([raw.center.lon, raw.center.lat], raw.radius);
    }
    const geometry = normalizeGeometry(geometryValue);
    if (geometry?.geometry?.type === "Polygon") {
      return closePolygonFeature(geometry);
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
  }, [id]);

  const operationName = useMemo(() => {
    return operation?.name || `Operation ${id || ""}`.trim();
  }, [operation?.name, id]);

  const dashboardGeofenceId = useMemo(() => {
    return operation?.flespi_geofence_id ?? geofenceParam ?? null;
  }, [operation?.flespi_geofence_id, geofenceParam]);

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
    <div
      className="ops-theme h-screen flex overflow-hidden bg-background"
      data-theme={dataTheme}
    >
      <ZonesSidebar
        operationId={id || ""}
        operationName={operationName}
        zones={zones}
        selectedZoneId={selectedZoneId}
        onZoneSelect={handleZoneSelect}
        onBack={handleBack}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button
            type="button"
            onClick={() => navigate(`/operations/${id}`)}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-sm font-semibold text-foreground">
            Split View
          </div>
        </div>
        <div className="relative flex-1 min-h-[45%]">
          <OperationDetailMap
            operationId={id || ""}
            operationGeofenceId={dashboardGeofenceId}
            zones={zones}
            selectedZoneId={selectedZoneId}
            operationPolygon={operationPolygon}
            center={mapCenter}
            zoom={13}
            onAlertsToggle={() => setAlertsOpen(!alertsOpen)}
            alertsOpen={alertsOpen}
          />
          <AlertsPanel
            alerts={alerts}
            isOpen={alertsOpen}
            onClose={() => setAlertsOpen(false)}
          />
        </div>
        <div className="flex-1 overflow-auto bg-background">
          <DispatchGeofenceDashboard geofenceId={dashboardGeofenceId} />
        </div>
      </div>
    </div>
  );
};

export default OperationDetailSplit;
