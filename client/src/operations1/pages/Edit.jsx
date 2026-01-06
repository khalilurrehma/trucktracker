import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import AppLayout from "../components/layout/AppLayout.jsx";
import CreateOperationStep from "../components/operations/wizard/CreateOperationStep.jsx";
import ZoneAreaStep from "../components/operations/wizard/ZoneAreaStep.jsx";
import LoadPadStep from "../components/operations/wizard/LoadPadStep.jsx";
import DumpAreaStep from "../components/operations/wizard/DumpAreaStep.jsx";
import QueueAreaStep from "../components/operations/wizard/QueueAreaStep.jsx";
import DeviceAssignmentStep from "../components/operations/wizard/DeviceAssignmentStep.jsx";
import ReviewStep from "../components/operations/wizard/ReviewStep.jsx";
import StepIndicator from "../components/ui/StepIndicator.jsx";
import { getOperationById, updateOperation } from "../../apis/operationApi";
import { createZone, getZonesByOperationId, updateZone } from "../../apis/zoneApi";
import {
  createDeviceAssignment,
  deleteDeviceAssignment,
  getAllDeviceAssignments,
  getDevicesByOperation,
} from "../../apis/deviceAssignmentApi";
import { getFlespiDevices } from "../../apis/api";
import booleanWithin from "@turf/boolean-within";

const wizardSteps = [
  "Operation",
  "Zone Area",
  "Load Pad",
  "Dump Area",
  "Queue Area",
  "Devices",
  "Review",
];

const parseGeometry = (value) => {
  if (!value) return null;
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (parsed.type === "Feature" || parsed.type === "FeatureCollection") {
    return parsed;
  }
  if (parsed.type && parsed.coordinates) {
    return {
      type: "Feature",
      properties: {},
      geometry: parsed,
    };
  }
  return null;
};

const EditOperation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = useSelector((state) => state?.session?.user?.id);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [devices, setDevices] = useState([]);
  const [assignedDeviceIds, setAssignedDeviceIds] = useState([]);

  const [operationName, setOperationName] = useState("");
  const [opLatitude, setOpLatitude] = useState("");
  const [opLongitude, setOpLongitude] = useState("");
  const [opRadius, setOpRadius] = useState("0");
  const [dailyGoal, setDailyGoal] = useState("");
  const [maxSpeed, setMaxSpeed] = useState("");
  const [swellFactor, setSwellFactor] = useState("");
  const [totalMaterial, setTotalMaterial] = useState("");
  const [opPolygon, setOpPolygon] = useState(null);
  const [operationPolygon, setOperationPolygon] = useState(null);

  const [zoneName, setZoneName] = useState("");
  const [zoneLatitude, setZoneLatitude] = useState("");
  const [zoneLongitude, setZoneLongitude] = useState("");
  const [zoneRadius, setZoneRadius] = useState("0");
  const [zoneSwellFactor, setZoneSwellFactor] = useState("");
  const [zoneTotalMaterial, setZoneTotalMaterial] = useState("");
  const [zoneMaxSpeed, setZoneMaxSpeed] = useState("");
  const [zonePolygon, setZonePolygon] = useState(null);
  const [zoneId, setZoneId] = useState(null);

  const [loadPadName, setLoadPadName] = useState("");
  const [loadPadLatitude, setLoadPadLatitude] = useState("");
  const [loadPadLongitude, setLoadPadLongitude] = useState("");
  const [loadPadRadius, setLoadPadRadius] = useState("0");
  const [loadPadMaxTime, setLoadPadMaxTime] = useState("");
  const [loadPadPolygon, setLoadPadPolygon] = useState(null);
  const [loadPadId, setLoadPadId] = useState(null);

  const [dumpAreaName, setDumpAreaName] = useState("");
  const [dumpAreaLatitude, setDumpAreaLatitude] = useState("");
  const [dumpAreaLongitude, setDumpAreaLongitude] = useState("");
  const [dumpAreaRadius, setDumpAreaRadius] = useState("0");
  const [dumpAreaMaxTime, setDumpAreaMaxTime] = useState("");
  const [dumpAreaPolygon, setDumpAreaPolygon] = useState(null);
  const [dumpAreaId, setDumpAreaId] = useState(null);

  const [queueName, setQueueName] = useState("");
  const [queueLatitude, setQueueLatitude] = useState("");
  const [queueLongitude, setQueueLongitude] = useState("");
  const [queueRadius, setQueueRadius] = useState("0");
  const [queueMaxVehicles, setQueueMaxVehicles] = useState("");
  const [queueIdealTime, setQueueIdealTime] = useState("");
  const [queuePolygon, setQueuePolygon] = useState(null);
  const [queueId, setQueueId] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const operationId = Number(id);
        const [operation, zones, devicesResp, assigned] = await Promise.all([
          getOperationById(operationId),
          getZonesByOperationId(operationId),
          getFlespiDevices(),
          getDevicesByOperation(operationId),
        ]);

        setOperationName(operation?.name || "");
        setDailyGoal(operation?.day_volume_m3_goal ?? "");
        setMaxSpeed(operation?.op_max_speed_kmh ?? "");
        setSwellFactor(operation?.op_swell_factor ?? "");
        setTotalMaterial(operation?.op_total_bank_volume_m3 ?? "");
        const opGeom = parseGeometry(operation?.geometry);
        setOpPolygon(opGeom);
        setOperationPolygon(opGeom ? JSON.parse(JSON.stringify(opGeom)) : null);

        const zoneByType = (type) => zones.find((z) => z.zoneType === type || z.type === type);
        const zoneArea = zoneByType("ZONE_AREA");
        const loadPad = zoneByType("LOAD_PAD");
        const dumpArea = zoneByType("DUMP_AREA");
        const queueArea = zoneByType("QUEUE_AREA");

        if (zoneArea) {
          setZoneId(zoneArea.id);
          setZoneName(zoneArea.name || "");
          setZoneSwellFactor(zoneArea.zone_bank_swell_factor ?? "");
          setZoneTotalMaterial(zoneArea.zone_bank_volume_m3 ?? "");
          setZoneMaxSpeed(zoneArea.zone_max_speed_kmh ?? "");
          setZonePolygon(parseGeometry(zoneArea.geometry));
        }
        if (loadPad) {
          setLoadPadId(loadPad.id);
          setLoadPadName(loadPad.name || "");
          setLoadPadMaxTime(loadPad.load_pad_max_duration_min ?? "");
          setLoadPadPolygon(parseGeometry(loadPad.geometry));
        }
        if (dumpArea) {
          setDumpAreaId(dumpArea.id);
          setDumpAreaName(dumpArea.name || "");
          setDumpAreaMaxTime(dumpArea.dump_area_max_duration_min ?? "");
          setDumpAreaPolygon(parseGeometry(dumpArea.geometry));
        }
        if (queueArea) {
          setQueueId(queueArea.id);
          setQueueName(queueArea.name || "");
          setQueueIdealTime(queueArea.ideal_queue_duration_m ?? "");
          setQueueMaxVehicles(queueArea.max_vehicles_count ?? "");
          setQueuePolygon(parseGeometry(queueArea.geometry));
        }

        const uniqueDevices = [
          ...new Map(
            (devicesResp?.data || devicesResp || []).map((item) => [
              item.id,
              {
                id: Number(item.id),
                name: item.name,
                flespiId: item.flespiId,
                assigned: false,
              },
            ])
          ).values(),
        ];
        const assignedIds = (assigned || [])
          .map((d) => Number(d.id ?? d.device_id))
          .filter((value) => Number.isFinite(value));
        const assignedSet = new Set(assignedIds);
        const devicesWithAssignments = uniqueDevices.map((d) => ({
          ...d,
          assigned: assignedSet.has(Number(d.id)),
        }));
        setDevices(devicesWithAssignments);
        setAssignedDeviceIds(assignedIds);
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "Failed to load operation for edit.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const isInsideOperation = (zonePolygonValue) => {
    if (!zonePolygonValue) return false;
    const operationGeo = operationPolygon || opPolygon;
    if (!operationGeo) return false;
    try {
      return booleanWithin(zonePolygonValue, operationGeo);
    } catch {
      return false;
    }
  };

  const handleAssignDevice = (deviceId) => {
    setAssignedDeviceIds((prev) =>
      prev.includes(deviceId)
        ? prev.filter((idValue) => idValue !== deviceId)
        : [...prev, deviceId]
    );
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, assigned: !d.assigned } : d
      )
    );
  };

  const buildZonePayload = (zoneType, zoneNameValue, polygonValue, lat, lng, radius, extra = {}) => ({
    zoneType,
    type: zoneType,
    name: zoneNameValue,
    geometry: (polygonValue && (polygonValue.geometry || polygonValue)) || null,
    circle:
      lat && lng && radius && Number(radius) > 0
        ? { lat: Number(lat), lng: Number(lng), radius: Number(radius) }
        : null,
    operation_id: Number(id),
    operationId: Number(id),
    ...extra,
  });

  const handleSubmit = async () => {
    if (!operationPolygon && !opPolygon) {
      await Swal.fire("Validation", "Operation geofence is required.", "warning");
      return;
    }
    if (!zonePolygon || !loadPadPolygon || !dumpAreaPolygon || !queuePolygon) {
      await Swal.fire("Validation", "All zone geofences are required.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const operationGeo = operationPolygon || opPolygon;
      await updateOperation(id, {
        name: operationName,
        geometry: (operationGeo && (operationGeo.geometry || operationGeo)) || null,
        day_volume_m3_goal: dailyGoal ? Number(dailyGoal) : null,
        op_total_bank_volume_m3: totalMaterial ? Number(totalMaterial) : null,
        op_max_speed_kmh: maxSpeed ? Number(maxSpeed) : null,
        op_swell_factor: swellFactor ? Number(swellFactor) : null,
        user_id: userId ?? undefined,
      });

      const zones = [
        {
          id: zoneId,
          payload: buildZonePayload("ZONE_AREA", zoneName, zonePolygon, zoneLatitude, zoneLongitude, zoneRadius, {
            zone_bank_swell_factor: zoneSwellFactor ? Number(zoneSwellFactor) : null,
            zone_bank_volume_m3: zoneTotalMaterial ? Number(zoneTotalMaterial) : null,
            zone_max_speed_kmh: zoneMaxSpeed ? Number(zoneMaxSpeed) : null,
          }),
        },
        {
          id: loadPadId,
          payload: buildZonePayload("LOAD_PAD", loadPadName, loadPadPolygon, loadPadLatitude, loadPadLongitude, loadPadRadius, {
            load_pad_max_duration_min: loadPadMaxTime ? Number(loadPadMaxTime) : null,
          }),
        },
        {
          id: dumpAreaId,
          payload: buildZonePayload("DUMP_AREA", dumpAreaName, dumpAreaPolygon, dumpAreaLatitude, dumpAreaLongitude, dumpAreaRadius, {
            dump_area_max_duration_min: dumpAreaMaxTime ? Number(dumpAreaMaxTime) : null,
          }),
        },
        {
          id: queueId,
          payload: buildZonePayload("QUEUE_AREA", queueName, queuePolygon, queueLatitude, queueLongitude, queueRadius, {
            ideal_queue_duration_m: queueIdealTime ? Number(queueIdealTime) : null,
            max_vehicles_count: queueMaxVehicles ? Number(queueMaxVehicles) : null,
          }),
        },
      ];

      for (const z of zones) {
        if (z.id) {
          await updateZone(z.id, z.payload);
        } else {
          await createZone(z.payload);
        }
      }

      const allAssignments = await getAllDeviceAssignments();
      const current = allAssignments.filter((a) => a.operation_id === Number(id));
      for (const a of current) {
        await deleteDeviceAssignment({ device_id: a.device_id, zone_id: a.zone_id });
      }
      for (const deviceId of assignedDeviceIds) {
        await createDeviceAssignment({
          device_id: deviceId,
          operation_id: Number(id),
          zone_id: Number(id),
        });
      }

      await Swal.fire("Success", "Operation updated successfully.", "success");
      navigate("/operations/geofence/list");
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to update operation.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const assignedDevicesCount = devices.filter((d) => d.assigned).length;
  const listDevices = useMemo(() => devices, [devices]);

  if (loading) {
    return <AppLayout><div className="p-6">Loading...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="overflow-x-auto pb-2">
            <StepIndicator steps={wizardSteps} currentStep={currentStep} />
          </div>

          {currentStep === 0 && (
            <CreateOperationStep
              title="Edit Operation"
              operationName={operationName}
              setOperationName={setOperationName}
              latitude={opLatitude}
              setLatitude={setOpLatitude}
              longitude={opLongitude}
              setLongitude={setOpLongitude}
              radius={opRadius}
              setRadius={setOpRadius}
              dailyGoal={dailyGoal}
              setDailyGoal={setDailyGoal}
              maxSpeed={maxSpeed}
              setMaxSpeed={setMaxSpeed}
              swellFactor={swellFactor}
              setSwellFactor={setSwellFactor}
              totalMaterial={totalMaterial}
              setTotalMaterial={setTotalMaterial}
              polygon={opPolygon}
              setPolygon={setOpPolygon}
              onNext={() => setCurrentStep(1)}
              onBack={() => navigate("/operations/geofence/list")}
            />
          )}

          {currentStep === 1 && (
            <ZoneAreaStep
              title="Edit Zone Area"
              operationName={operationName}
              zoneName={zoneName}
              setZoneName={setZoneName}
              latitude={zoneLatitude}
              setLatitude={setZoneLatitude}
              longitude={zoneLongitude}
              setLongitude={setZoneLongitude}
              radius={zoneRadius}
              setRadius={setZoneRadius}
              swellFactor={zoneSwellFactor}
              setSwellFactor={setZoneSwellFactor}
              totalMaterial={zoneTotalMaterial}
              setTotalMaterial={setZoneTotalMaterial}
              maxSpeed={zoneMaxSpeed}
              setMaxSpeed={setZoneMaxSpeed}
              polygon={zonePolygon}
              setPolygon={setZonePolygon}
              operationPolygon={operationPolygon || opPolygon}
              onNext={() => {
                if (!isInsideOperation(zonePolygon)) {
                  Swal.fire("Validation", "Zone Area must be inside the Operation geofence.", "warning");
                  return;
                }
                setCurrentStep(2);
              }}
              onBack={() => setCurrentStep(0)}
            />
          )}

          {currentStep === 2 && (
            <LoadPadStep
              title="Edit Load Pad"
              operationName={operationName}
              loadPadName={loadPadName}
              setLoadPadName={setLoadPadName}
              latitude={loadPadLatitude}
              setLatitude={setLoadPadLatitude}
              longitude={loadPadLongitude}
              setLongitude={setLoadPadLongitude}
              radius={loadPadRadius}
              setRadius={setLoadPadRadius}
              maxTime={loadPadMaxTime}
              setMaxTime={setLoadPadMaxTime}
              polygon={loadPadPolygon}
              setPolygon={setLoadPadPolygon}
              operationPolygon={operationPolygon || opPolygon}
              zonePolygon={zonePolygon}
              onNext={() => {
                if (!isInsideOperation(loadPadPolygon)) {
                  Swal.fire("Validation", "Load Pad must be inside the Operation geofence.", "warning");
                  return;
                }
                setCurrentStep(3);
              }}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && (
            <DumpAreaStep
              title="Edit Dump Area"
              operationName={operationName}
              dumpAreaName={dumpAreaName}
              setDumpAreaName={setDumpAreaName}
              latitude={dumpAreaLatitude}
              setLatitude={setDumpAreaLatitude}
              longitude={dumpAreaLongitude}
              setLongitude={setDumpAreaLongitude}
              radius={dumpAreaRadius}
              setRadius={setDumpAreaRadius}
              maxTime={dumpAreaMaxTime}
              setMaxTime={setDumpAreaMaxTime}
              polygon={dumpAreaPolygon}
              setPolygon={setDumpAreaPolygon}
              operationPolygon={operationPolygon || opPolygon}
              zonePolygon={zonePolygon}
              loadPadPolygon={loadPadPolygon}
              onNext={() => {
                if (!isInsideOperation(dumpAreaPolygon)) {
                  Swal.fire("Validation", "Dump Area must be inside the Operation geofence.", "warning");
                  return;
                }
                setCurrentStep(4);
              }}
              onBack={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 4 && (
            <QueueAreaStep
              title="Edit Queue Area"
              operationName={operationName}
              queueName={queueName}
              setQueueName={setQueueName}
              latitude={queueLatitude}
              setLatitude={setQueueLatitude}
              longitude={queueLongitude}
              setLongitude={setQueueLongitude}
              radius={queueRadius}
              setRadius={setQueueRadius}
              maxVehicles={queueMaxVehicles}
              setMaxVehicles={setQueueMaxVehicles}
              idealTime={queueIdealTime}
              setIdealTime={setQueueIdealTime}
              polygon={queuePolygon}
              setPolygon={setQueuePolygon}
              operationPolygon={operationPolygon || opPolygon}
              zonePolygon={zonePolygon}
              loadPadPolygon={loadPadPolygon}
              dumpAreaPolygon={dumpAreaPolygon}
              onNext={() => {
                if (!isInsideOperation(queuePolygon)) {
                  Swal.fire("Validation", "Queue Area must be inside the Operation geofence.", "warning");
                  return;
                }
                setCurrentStep(5);
              }}
              onBack={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 5 && (
            <DeviceAssignmentStep
              operationName={operationName}
              devices={listDevices}
              onAssign={handleAssignDevice}
              onNext={() => setCurrentStep(6)}
              onBack={() => setCurrentStep(4)}
            />
          )}

          {currentStep === 6 && (
            <ReviewStep
              data={{
                operationName,
                queueArea: queueName || "Not set",
                loadPad: loadPadName || "Not set",
                dumpArea: dumpAreaName || "Not set",
                zoneArea: zoneName || "Not set",
                devicesAssigned: assignedDevicesCount,
              }}
              title="Finalize Update"
              subtitle="Review & Update"
              submitLabel="Update Everything"
              submittingLabel="Updating..."
              onSubmit={handleSubmit}
              onBack={() => setCurrentStep(5)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default EditOperation;
