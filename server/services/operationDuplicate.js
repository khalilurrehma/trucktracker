import pool from "../config/dbConfig.js";
import util from "util";
import { createOperation } from "../model/operation/operationModel.js";
import { createZone } from "../model/operation/zoneModel.js";
import { createDeviceAssignment } from "../model/operation/deviceAssignmentModel.js";

const dbQuery = util.promisify(pool.query).bind(pool);

const safeParseJson = (value) => {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const buildCopyName = (name) => {
  const base = name?.trim() || "Operation";
  return `${base} - Copy`;
};

const mapZonePayload = (zone, operationId) => ({
  operationId,
  name: zone.name,
  zoneType: zone.zoneType || zone.type,
  geometry: safeParseJson(zone.geometry),
  area_sqm: zone.area_sqm ?? null,
  area_ha: zone.area_ha ?? null,
  ideal_queue_duration_m: zone.ideal_queue_duration_m ?? null,
  max_vehicles_count: zone.max_vehicles_count ?? null,
  dump_area_max_duration_min: zone.dump_area_max_duration_min ?? null,
  load_pad_max_duration_min: zone.load_pad_max_duration_min ?? null,
  zone_max_speed_kmh: zone.zone_max_speed_kmh ?? null,
  zone_bank_volume_m3: zone.zone_bank_volume_m3 ?? null,
  zone_bank_swell_factor: zone.zone_bank_swell_factor ?? null,
  load_pad_type: zone.load_pad_type ?? null,
  material_type: zone.material_type ?? null,
  dump_area_type: zone.dump_area_type ?? null,
  queue_type: zone.queue_type ?? null,
});

export const duplicateOperation = async (operationId, options = {}) => {
  const [sourceOperation] = await dbQuery(
    "SELECT * FROM operations WHERE id = ?",
    [operationId]
  );
  if (!sourceOperation) {
    throw new Error(`Operation ${operationId} not found`);
  }

  const newOperationPayload = {
    name: options.name || buildCopyName(sourceOperation.name),
    geometry: safeParseJson(sourceOperation.geometry),
    area_sqm: sourceOperation.area_sqm ?? null,
    area_ha: sourceOperation.area_ha ?? null,
    op_max_speed_kmh: sourceOperation.op_max_speed_kmh ?? null,
    op_total_bank_volume_m3: sourceOperation.op_total_bank_volume_m3 ?? null,
    op_swell_factor: sourceOperation.op_swell_factor ?? null,
    day_volume_m3_goal: sourceOperation.day_volume_m3_goal ?? null,
    user_id: sourceOperation.user_id ?? null,
    estimated_start_date: sourceOperation.estimated_start_date ?? null,
    estimated_end_date: sourceOperation.estimated_end_date ?? null,
  };

  const createdOperation = await createOperation(newOperationPayload);
  const newOperationId = createdOperation?.id ?? createdOperation?.operation_id;
  if (!newOperationId) {
    throw new Error("Failed to create duplicated operation");
  }

  const zones = await dbQuery(
    "SELECT * FROM zones WHERE operationId = ?",
    [operationId]
  );

  const zoneIdMap = new Map();
  for (const zone of zones) {
    const payload = mapZonePayload(zone, newOperationId);
    const createdZone = await createZone(payload);
    zoneIdMap.set(zone.id, createdZone.id);
  }

  const assignments = await dbQuery(
    "SELECT * FROM device_assignments WHERE operation_id = ?",
    [operationId]
  );

  const uniqueAssignments = new Set();
  for (const assignment of assignments) {
    const oldZoneId = assignment.zone_id;
    const newZoneId =
      oldZoneId === Number(operationId)
        ? newOperationId
        : zoneIdMap.get(oldZoneId) || newOperationId;
    const key = `${assignment.device_id}:${newZoneId}`;
    if (uniqueAssignments.has(key)) continue;
    uniqueAssignments.add(key);
    await createDeviceAssignment({
      device_id: assignment.device_id,
      operation_id: newOperationId,
      zone_id: newZoneId,
    });
  }

  return {
    id: newOperationId,
    name: newOperationPayload.name,
    copied_from: Number(operationId),
    zones_copied: zones.length,
    devices_copied: assignments.length,
  };
};
