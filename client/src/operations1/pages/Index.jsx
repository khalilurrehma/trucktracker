import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/layout/AppLayout.jsx";
import OperationsList from "../components/operations/OperationsList.jsx";
import CreateOperationStep from "../components/operations/wizard/CreateOperationStep.jsx";
import ZoneAreaStep from "../components/operations/wizard/ZoneAreaStep.jsx";
import LoadPadStep from "../components/operations/wizard/LoadPadStep.jsx";
import DumpAreaStep from "../components/operations/wizard/DumpAreaStep.jsx";
import QueueAreaStep from "../components/operations/wizard/QueueAreaStep.jsx";
import DeviceAssignmentStep from "../components/operations/wizard/DeviceAssignmentStep.jsx";
import ReviewStep from "../components/operations/wizard/ReviewStep.jsx";
import StepIndicator from "../components/ui/StepIndicator.jsx";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createOperation, deleteOperation, getAllOperations } from "../../apis/operationApi";
import { createZone } from "../../apis/zoneApi";
import { createDeviceAssignment } from "../../apis/deviceAssignmentApi";
import { getFlespiDevices } from "../../apis/api";
import booleanWithin from "@turf/boolean-within";

const mockDevices = [];

const wizardSteps = [
  "Operation",
  "Zone Area",
  "Load Pad",
  "Dump Area",
  "Queue Area",
  "Devices",
  "Review",
];

const Index = () => {
  const userId = useSelector((state) => state?.session?.user?.id);
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("list");
  const [currentStep, setCurrentStep] = useState(0);
  const [operations, setOperations] = useState([]);
  const [devices, setDevices] = useState(mockDevices);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Operation Step
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

  // Zone Area Step
  const [zoneName, setZoneName] = useState("");
  const [zoneLatitude, setZoneLatitude] = useState("");
  const [zoneLongitude, setZoneLongitude] = useState("");
  const [zoneRadius, setZoneRadius] = useState("0");
  const [zoneSwellFactor, setZoneSwellFactor] = useState("");
  const [zoneTotalMaterial, setZoneTotalMaterial] = useState("");
  const [zoneMaxSpeed, setZoneMaxSpeed] = useState("");
  const [zonePolygon, setZonePolygon] = useState(null);

  // Load Pad Step
  const [loadPadName, setLoadPadName] = useState("");
  const [loadPadLatitude, setLoadPadLatitude] = useState("");
  const [loadPadLongitude, setLoadPadLongitude] = useState("");
  const [loadPadRadius, setLoadPadRadius] = useState("0");
  const [loadPadMaxTime, setLoadPadMaxTime] = useState("");
  const [loadPadPolygon, setLoadPadPolygon] = useState(null);

  // Dump Area Step
  const [dumpAreaName, setDumpAreaName] = useState("");
  const [dumpAreaLatitude, setDumpAreaLatitude] = useState("");
  const [dumpAreaLongitude, setDumpAreaLongitude] = useState("");
  const [dumpAreaRadius, setDumpAreaRadius] = useState("0");
  const [dumpAreaMaxTime, setDumpAreaMaxTime] = useState("");
  const [dumpAreaPolygon, setDumpAreaPolygon] = useState(null);

  // Queue Area Step
  const [queueName, setQueueName] = useState("");
  const [queueLatitude, setQueueLatitude] = useState("");
  const [queueLongitude, setQueueLongitude] = useState("");
  const [queueRadius, setQueueRadius] = useState("0");
  const [queueMaxVehicles, setQueueMaxVehicles] = useState("");
  const [queueIdealTime, setQueueIdealTime] = useState("");
  const [queuePolygon, setQueuePolygon] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateNew = () => {
    setViewMode("wizard");
    setCurrentStep(0);
  };

  const handleBackToList = () => {
    setViewMode("list");
    resetWizard();
  };

  const mapOperationForList = (op) => ({
    id: op.id ?? op.operation_id,
    flespiGeofenceId: op.flespi_geofence_id ?? op.flespiGeofenceId ?? op.geofence_id,
    name: op.name || "Unnamed",
    goal: op.day_volume_m3_goal != null ? `${op.day_volume_m3_goal} mA3` : "—",
    bank: op.op_total_bank_volume_m3 != null ? `${op.op_total_bank_volume_m3} mA3` : "—",
    speed: op.op_max_speed_kmh != null ? `${op.op_max_speed_kmh} km/h` : "—",
    swell: op.op_swell_factor != null ? `${op.op_swell_factor}%` : "—",
  });

  const fetchOperations = async () => {
    setLoadingOperations(true);
    try {
      const data = await getAllOperations();
      setOperations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load operations");
    } finally {
      setLoadingOperations(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const data = await getFlespiDevices();
        const uniqueDevices = [
          ...new Map(
            (data?.data || data || []).map((item) => [
              item.id,
              {
                id: item.id,
                name: item.name,
                flespiId: item.flespiId,
                assigned: false,
              },
            ])
          ).values(),
        ];
        setDevices(uniqueDevices);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load devices");
      }
    };
    loadDevices();
  }, []);

  const resetWizard = () => {
    setCurrentStep(0);
    setOperationName("");
    setOpLatitude("");
    setOpLongitude("");
    setOpRadius("0");
    setDailyGoal("");
    setMaxSpeed("");
    setSwellFactor("");
    setTotalMaterial("");
    setOpPolygon(null);
    setOperationPolygon(null);
    setZoneName("");
    setZoneLatitude("");
    setZoneLongitude("");
    setZoneRadius("0");
    setZoneSwellFactor("");
    setZoneTotalMaterial("");
    setZoneMaxSpeed("");
    setZonePolygon(null);
    setLoadPadName("");
    setLoadPadLatitude("");
    setLoadPadLongitude("");
    setLoadPadRadius("0");
    setLoadPadMaxTime("");
    setLoadPadPolygon(null);
    setDumpAreaName("");
    setDumpAreaLatitude("");
    setDumpAreaLongitude("");
    setDumpAreaRadius("0");
    setDumpAreaMaxTime("");
    setDumpAreaPolygon(null);
    setQueueName("");
    setQueueLatitude("");
    setQueueLongitude("");
    setQueueRadius("0");
    setQueueMaxVehicles("");
    setQueueIdealTime("");
    setQueuePolygon(null);
    setDevices(mockDevices);
  };

  const handleAssignDevice = (deviceId) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId ? { ...d, assigned: !d.assigned } : d
      )
    );
  };

  const isInsideOperation = (zonePolygon) => {
    if (!zonePolygon) {
      return false;
    }
    if (!operationPolygon && !opPolygon) {
      return false;
    }
    const operationGeo = operationPolygon || opPolygon;
    try {
      return booleanWithin(zonePolygon, operationGeo);
    } catch (error) {
      console.error("Zone validation failed:", error);
      return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!operationPolygon && !opPolygon) {
        await Swal.fire("Validation", "Operation geofence is required.", "warning");
        return;
      }
      if (!zonePolygon || !loadPadPolygon || !dumpAreaPolygon || !queuePolygon) {
        await Swal.fire("Validation", "All zone geofences are required.", "warning");
        return;
      }
      const operationGeo = operationPolygon || opPolygon;
      const opCircle =
        opLatitude && opLongitude && opRadius && Number(opRadius) > 0
          ? { lat: Number(opLatitude), lng: Number(opLongitude), radius: Number(opRadius) }
          : null;
      const payload = {
        name: operationName,
        geometry: operationGeo?.geometry || null,
        circle: opCircle,
        day_volume_m3_goal: dailyGoal ? Number(dailyGoal) : null,
        op_total_bank_volume_m3: totalMaterial ? Number(totalMaterial) : null,
        op_max_speed_kmh: maxSpeed ? Number(maxSpeed) : null,
        op_swell_factor: swellFactor ? Number(swellFactor) : null,
        user_id: userId ?? undefined,
      };

      const created = await createOperation(payload);
      const operationId = created.id ?? created.operation_id;
      if (!operationId) {
        throw new Error("Operation ID missing from API response.");
      }

      const buildZonePayload = (zoneType, zoneNameValue, polygonValue, lat, lng, radius, extra = {}) => ({
        name: zoneNameValue,
        type: zoneType,
        zoneType,
        geometry: polygonValue?.geometry || null,
        circle:
          lat && lng && radius && Number(radius) > 0
            ? { lat: Number(lat), lng: Number(lng), radius: Number(radius) }
            : null,
        operation_id: operationId,
        operationId,
        ...extra,
      });

      await createZone(buildZonePayload("ZONE_AREA", zoneName, zonePolygon, zoneLatitude, zoneLongitude, zoneRadius, {
        zone_bank_swell_factor: zoneSwellFactor ? Number(zoneSwellFactor) : null,
        zone_bank_volume_m3: zoneTotalMaterial ? Number(zoneTotalMaterial) : null,
        zone_max_speed_kmh: zoneMaxSpeed ? Number(zoneMaxSpeed) : null,
      }));
      await createZone(buildZonePayload("LOAD_PAD", loadPadName, loadPadPolygon, loadPadLatitude, loadPadLongitude, loadPadRadius, {
        load_pad_max_duration_min: loadPadMaxTime ? Number(loadPadMaxTime) : null,
      }));
      await createZone(buildZonePayload("DUMP_AREA", dumpAreaName, dumpAreaPolygon, dumpAreaLatitude, dumpAreaLongitude, dumpAreaRadius, {
        dump_area_max_duration_min: dumpAreaMaxTime ? Number(dumpAreaMaxTime) : null,
      }));
      await createZone(buildZonePayload("QUEUE_AREA", queueName, queuePolygon, queueLatitude, queueLongitude, queueRadius, {
        max_vehicles_count: queueMaxVehicles ? Number(queueMaxVehicles) : null,
        ideal_queue_duration_m: queueIdealTime ? Number(queueIdealTime) : null,
      }));

      const assignedDeviceIds = devices.filter((d) => d.assigned).map((d) => d.id);
      for (const deviceId of assignedDeviceIds) {
        await createDeviceAssignment({
          device_id: deviceId,
          operation_id: operationId,
          zone_id: operationId,
        });
      }

      setOperations((prev) => [created, ...prev]);
      await Swal.fire("Success", "Operation and zones created successfully!", "success");
      setViewMode("list");
      resetWizard();
    } catch (error) {
      console.error(error);
      await Swal.fire("Error", "Failed to create operation and zones.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (id) => {
    if (!id) {
      toast.error("Missing operation id");
      return;
    }
    navigate(`/operations1/edit/${id}`);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Operation?",
      text: "This will remove the operation and its zones.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteOperation(id);
      setOperations((prev) => prev.filter((op) => (op.id ?? op.operation_id) !== id));
      toast.success("Operation deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete operation");
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (id) => {
    toast.info(`Viewing operation ${id}`);
  };

  const assignedDevicesCount = devices.filter((d) => d.assigned).length;
  const listOperations = useMemo(
    () => operations.map(mapOperationForList).filter((op) => op.id != null),
    [operations]
  );
  useEffect(() => {
    if (currentStep >= 1 && opPolygon && !operationPolygon) {
      setOperationPolygon(JSON.parse(JSON.stringify(opPolygon)));
    }
  }, [currentStep, opPolygon, operationPolygon]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {viewMode === "list" ? (
          <OperationsList
            operations={listOperations}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            onCreate={handleCreateNew}
            deletingId={deletingId}
          />
        ) : (
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="overflow-x-auto pb-2">
              <StepIndicator steps={wizardSteps} currentStep={currentStep} />
            </div>

            {/* Wizard Steps */}
            {currentStep === 0 && (
              <CreateOperationStep
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
                onNext={async () => {
                  if (!operationName.trim()) {
                    await Swal.fire("Required", "Operation name is required.", "warning");
                    return;
                  }
                  if (!opPolygon) {
                    await Swal.fire("Required", "Operation geofence is required.", "warning");
                    return;
                  }
                  setOperationPolygon(opPolygon ? JSON.parse(JSON.stringify(opPolygon)) : null);
                  setCurrentStep(1);
                }}
                onBack={handleBackToList}
              />
            )}

            {currentStep === 1 && (
              <ZoneAreaStep
                title="Create Zone Area"
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
                onNext={async () => {
                  if (!zoneName.trim()) {
                    await Swal.fire("Required", "Zone Area name is required.", "warning");
                    return;
                  }
                  if (!zonePolygon) {
                    await Swal.fire("Required", "Zone Area geofence is required.", "warning");
                    return;
                  }
                  if (!isInsideOperation(zonePolygon)) {
                    toast.error("Zone Area must be inside the Operation geofence.");
                    return;
                  }
                  setCurrentStep(2);
                }}
                onBack={() => setCurrentStep(0)}
              />
            )}

            {currentStep === 2 && (
              <LoadPadStep
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
                onNext={async () => {
                  if (!loadPadName.trim()) {
                    await Swal.fire("Required", "Load Pad name is required.", "warning");
                    return;
                  }
                  if (!loadPadPolygon) {
                    await Swal.fire("Required", "Load Pad geofence is required.", "warning");
                    return;
                  }
                  if (!isInsideOperation(loadPadPolygon)) {
                    toast.error("Load Pad must be inside the Operation geofence.");
                    return;
                  }
                  setCurrentStep(3);
                }}
                onBack={() => setCurrentStep(1)}
              />
            )}

            {currentStep === 3 && (
              <DumpAreaStep
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
                onNext={async () => {
                  if (!dumpAreaName.trim()) {
                    await Swal.fire("Required", "Dump Area name is required.", "warning");
                    return;
                  }
                  if (!dumpAreaPolygon) {
                    await Swal.fire("Required", "Dump Area geofence is required.", "warning");
                    return;
                  }
                  if (!isInsideOperation(dumpAreaPolygon)) {
                    toast.error("Dump Area must be inside the Operation geofence.");
                    return;
                  }
                  setCurrentStep(4);
                }}
                onBack={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 4 && (
              <QueueAreaStep
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
                onNext={async () => {
                  if (!queueName.trim()) {
                    await Swal.fire("Required", "Queue Area name is required.", "warning");
                    return;
                  }
                  if (!queuePolygon) {
                    await Swal.fire("Required", "Queue Area geofence is required.", "warning");
                    return;
                  }
                  if (!isInsideOperation(queuePolygon)) {
                    toast.error("Queue Area must be inside the Operation geofence.");
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
                devices={devices}
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
                onSubmit={handleSubmit}
                onBack={() => setCurrentStep(5)}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
