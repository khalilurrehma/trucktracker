import pool from "../../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

import {
    createFlespiGeofence,
    getFlespiGeofence,
    updateFlespiGeofence,
    deleteFlespiGeofence,
    deleteFlespiCalculator,
    createFlespiCalculator,
    getFlespiCalculator,
    updateFlespiCalculator,
    unassignGeofenceFromDevice,
    assignCalculatorToGeofence,
    assignCalculatorToDevice
} from "../../services/flespiApis.js";
import {
  deleteCalculatorAssignmentsByGeofenceId,
  deleteCalculatorAssignmentsByOperationId,
  deleteCalculatorAssignmentsByZoneId,
  getCalculatorIdsByGeofenceId,
  getCalculatorIdsByOperationId,
  getCalculatorIdsByZoneId,
  saveCalculatorAssignments,
} from "../calculatorAssignments.js";
import { getCalculatorTemplatesByType } from "../calculatorTemplates.js";
import { loadCalculatorTemplateConfig, sanitizeCalculatorConfig } from "../../utils/calculatorTemplates.js";

const toNumberOrDefault = (value, fallback = 0) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const uniqueByCalcId = (rows = []) => {
    const map = new Map();
    for (const row of rows) {
        const calcId = Number(row?.calc_id);
        if (!Number.isFinite(calcId)) continue;
        if (!map.has(calcId)) {
            map.set(calcId, {
                ...row,
                calc_id: calcId,
                geofence_flespi_id: row?.geofence_flespi_id ?? null,
            });
        } else if (!map.get(calcId)?.geofence_flespi_id && row?.geofence_flespi_id) {
            map.set(calcId, {
                ...map.get(calcId),
                geofence_flespi_id: row.geofence_flespi_id,
            });
        }
    }
    return Array.from(map.values());
};

const buildDailyVehicleReportOverrides = (operationGeofenceId) => {
    const geofenceId = Number(operationGeofenceId);
    const geofenceMembershipExpression = Number.isFinite(geofenceId)
        ? `json_array_contains(geofences("id"), ${geofenceId})`
        : 'geofence("metadata.loadiq_operation") == true';
    return {
        selectors: [
            { type: "datetime", split: "day" },
            {
                type: "expression",
                method: "boolean",
                expression: geofenceMembershipExpression,
                merge_unknown: true,
            },
        ],
        validate_interval: "",
    };
};

const buildOperationSummaryOverrides = (operationGeofenceId) => {
    const geofenceId = Number(operationGeofenceId);
    const geofenceMembershipExpression = Number.isFinite(geofenceId)
        ? `json_array_contains(geofences("id"), ${geofenceId})`
        : 'geofence("metadata.loadiq_operation") == true';
    return {
        selectors: [
            { type: "datetime", split: "day" },
            {
                type: "expression",
                method: "boolean",
                expression: geofenceMembershipExpression,
                merge_unknown: true,
            },
        ],
        validate_interval: "",
    };
};

const buildContainsAnyGeofenceIdsExpression = (ids = []) => {
    const normalizedIds = Array.from(
        new Set(
            (ids || [])
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id))
        )
    );
    if (normalizedIds.length === 0) return "false";
    return normalizedIds
        .map((id) => `json_array_contains(geofences("id"), ${id})`)
        .join(" || ");
};

const buildZoneTypeSelectorOverrides = (calcType) => {
    const type = String(calcType || "").toUpperCase();
    const zoneTypeByCalcType = {
        CALC_LOAD_PAD: "LOAD_PAD",
        CALC_LOADERS_PAD: "LOAD_PAD",
        CALC_DUMP_AREA: "DUMP_AREA",
        CALC_QUEUE_AREA: "QUEUE_AREA",
        ZONE_CALCULATOR: "ZONE_AREA",
        CALC_TRIP_CYCLE: "ZONE_AREA",
    };
    const zoneType = zoneTypeByCalcType[type];
    if (!zoneType) return null;
    return {
        selectors: [
            {
                type: "expression",
                method: "boolean",
                expression: `json_array_contains(geofences("metadata.zone_type"), "${zoneType}")`,
            },
        ],
    };
};

const buildTripSelectorAndCountersOverrides = ({ loadPadGeofenceIds = [], dumpAreaGeofenceIds = [] }) => {
    const loadExpr = buildContainsAnyGeofenceIdsExpression(loadPadGeofenceIds);
    const dumpExpr = buildContainsAnyGeofenceIdsExpression(dumpAreaGeofenceIds);
    if (loadExpr === "false" || dumpExpr === "false") return null;
    const zoneExpr = `if(${loadExpr}, "LOAD_PAD", if(${dumpExpr}, "DUMP_AREA", null))`;

    return {
        selectors: [
            {
                type: "expression",
                method: "boolean",
                expression: `not(${loadExpr}) && not(${dumpExpr})`,
                merge_unknown: true,
                merge_message_before: true,
                merge_message_after: true,
                max_messages_time_diff: 300,
                max_inactive: 120,
                min_duration: 60,
            },
        ],
        zone_expression: zoneExpr,
    };
};

function toFlespiGeometry(geometry) {
  if (!geometry) return null;

  const geo = typeof geometry === "string" ? JSON.parse(geometry) : geometry;

  if (
    geo.type &&
    geo.type.toLowerCase() === "circle" &&
    Array.isArray(geo.coordinates) &&
    geo.coordinates.length >= 2 &&
    geo.radius !== undefined
  ) {
    const [lon, lat] = geo.coordinates;
    return {
      type: "circle",
      center: { lat: parseFloat(lat), lon: parseFloat(lon) },
      radius: parseFloat(geo.radius),
    };
  }

  // Already a Flespi polygon shape
  if (geo.path) return geo;

  if (
    geo.type &&
    geo.coordinates &&
    Array.isArray(geo.coordinates) &&
    Array.isArray(geo.coordinates[0])
  ) {
    return {
      type: "polygon",
      path: geo.coordinates[0].map(([lon, lat]) => ({ lat, lon })),
    };
  }

  // Unknown geometry format; return as-is to avoid crashing
  return geo;
}


// =====================================================
// CREATE OPERATION  ➜  also create Flespi geofence
// =====================================================
const deleteCalculatorsByIds = async (calcIds) => {
    const uniqueIds = Array.from(new Set(calcIds)).filter((id) => id != null);
    for (const calcId of uniqueIds) {
        try {
            await deleteFlespiCalculator(calcId);
        } catch (err) {
            console.error(`Error deleting calculator ${calcId}:`, err.message);
        }
    }
};

const assignCalculatorsToOperationDevices = async ({ operationId, assignments }) => {
    if (!Array.isArray(assignments) || assignments.length === 0) return;

    const devices = await dbQuery(
        `
        SELECT DISTINCT da.device_id, d.flespiId AS device_flespi_id
        FROM device_assignments da
        JOIN new_settings_devices d ON d.id = da.device_id
        WHERE da.operation_id = ?
          AND d.flespiId IS NOT NULL
      `,
        [operationId]
    );

    if (!devices || devices.length === 0) return;

    const existingRows = await dbQuery(
        `
        SELECT calc_id, device_flespi_id
        FROM calculator_assignments
        WHERE operation_id = ?
          AND device_flespi_id IS NOT NULL
      `,
        [operationId]
    );
    const existing = new Set(
        (existingRows || []).map(
            (row) => `${Number(row.calc_id)}:${Number(row.device_flespi_id)}`
        )
    );

    const rowsToSave = [];
    for (const assignment of assignments) {
        for (const device of devices) {
            const calcId = Number(assignment.calc_id);
            const deviceFlespiId = Number(device.device_flespi_id);
            if (!Number.isFinite(calcId) || !Number.isFinite(deviceFlespiId)) continue;

            const key = `${calcId}:${deviceFlespiId}`;
            if (existing.has(key)) continue;

            try {
                await assignCalculatorToDevice(deviceFlespiId, calcId);
                rowsToSave.push({
                    calc_id: calcId,
                    calc_type: assignment.calc_type || null,
                    device_id: device.device_id,
                    device_flespi_id: deviceFlespiId,
                    operation_id: operationId,
                    zone_id: assignment.zone_id ?? null,
                    geofence_flespi_id: assignment.geofence_flespi_id ?? null,
                });
                existing.add(key);
            } catch (err) {
                console.warn(
                    `Failed to assign calculator ${calcId} to device ${deviceFlespiId}:`,
                    err.response?.data || err.message
                );
            }
        }
    }

    if (rowsToSave.length > 0) {
        await saveCalculatorAssignments(rowsToSave);
    }
};

const ensureCalculatorGeofences = async (assignments = []) => {
    const pairs = Array.from(
        new Set(
            assignments
                .map((row) => {
                    const calcId = Number(row?.calc_id);
                    const geofenceId = Number(row?.geofence_flespi_id);
                    if (!Number.isFinite(calcId) || !Number.isFinite(geofenceId)) return null;
                    return `${calcId}:${geofenceId}`;
                })
                .filter(Boolean)
        )
    );

    let synced = 0;
    let failed = 0;
    for (const pair of pairs) {
        const [calcIdRaw, geofenceIdRaw] = pair.split(":");
        const calcId = Number(calcIdRaw);
        const geofenceId = Number(geofenceIdRaw);
        try {
            await assignCalculatorToGeofence(calcId, geofenceId);
            synced += 1;
        } catch (err) {
            failed += 1;
            console.warn(
                `Failed to assign calculator ${calcId} -> geofence ${geofenceId}:`,
                err.response?.data || err.message
            );
        }
    }

    return { synced, failed };
};

const unassignOperationGeofencesFromOperationDevices = async ({ operationId }) => {
    const devices = await dbQuery(
        `
          SELECT DISTINCT d.flespiId AS device_flespi_id
          FROM device_assignments da
          JOIN new_settings_devices d ON d.id = da.device_id
          WHERE da.operation_id = ?
            AND d.flespiId IS NOT NULL
        `,
        [operationId]
    );

    const geofenceRows = await dbQuery(
        `
          SELECT DISTINCT flespi_geofence_id
          FROM operations
          WHERE flespi_geofence_id IS NOT NULL
        `
    );
    const geofenceIds = Array.from(
        new Set(
            (geofenceRows || [])
                .map((row) => Number(row?.flespi_geofence_id))
                .filter(Number.isFinite)
        )
    );
    if (geofenceIds.length === 0) return;

    for (const device of devices || []) {
        const deviceFlespiId = Number(device?.device_flespi_id);
        if (!Number.isFinite(deviceFlespiId)) continue;
        for (const geofenceId of geofenceIds) {
            try {
                await unassignGeofenceFromDevice(deviceFlespiId, geofenceId);
            } catch (err) {
                console.warn(
                    `Failed to unassign operation geofence ${geofenceId} from device ${deviceFlespiId}:`,
                    err.response?.data || err.message
                );
            }
        }
    }
};

const buildTripValidateExpression = (calcType) => {
    const type = String(calcType || "").toUpperCase();
    if (type === "CALC_TRIP_L2D") {
        return 'from_zone_type == "LOAD_PAD" && to_zone_type == "DUMP_AREA"';
    }
    if (type === "CALC_TRIP_D2L") {
        return 'from_zone_type == "DUMP_AREA" && to_zone_type == "LOAD_PAD"';
    }
    return "";
};

const upsertTripZoneCounters = (counters = [], zoneExpression = "null") => {
    const nextCounters = Array.isArray(counters)
        ? counters
            .filter((counter) => counter && typeof counter === "object")
            .map((counter) => ({ ...counter }))
        : [];

    const upsertCounter = (name, method) => {
        const idx = nextCounters.findIndex((counter) => counter.name === name);
        const patched = {
            type: "expression",
            name,
            expression: zoneExpression,
            method,
        };
        if (idx >= 0) {
            nextCounters[idx] = { ...nextCounters[idx], ...patched };
        } else {
            nextCounters.push(patched);
        }
    };

    upsertCounter("from_zone_type", "first");
    upsertCounter("to_zone_type", "last");
    return nextCounters;
};

const updateTripCalculatorDefinition = async ({
    calcId,
    calcType,
    loadPadGeofenceIds = [],
    dumpAreaGeofenceIds = [],
}) => {
    const overrides = buildTripSelectorAndCountersOverrides({
        loadPadGeofenceIds,
        dumpAreaGeofenceIds,
    });
    if (!overrides) return false;

    const calc = await getFlespiCalculator(calcId);
    const counters = upsertTripZoneCounters(calc?.counters, overrides.zone_expression);
    const validate_interval = buildTripValidateExpression(calcType);

    await updateFlespiCalculator(calcId, {
        selectors: overrides.selectors,
        counters,
        validate_interval,
    });
    return true;
};

export const syncOperationCalculatorsToDevices = async (operationId) => {
    const opId = Number(operationId);
    if (!Number.isFinite(opId) || opId < 1) {
        throw new Error("Invalid operationId");
    }

    const sharedRowsRaw = await dbQuery(
        `
          SELECT DISTINCT calc_id, calc_type, zone_id, geofence_flespi_id
          FROM calculator_assignments
          WHERE operation_id = ?
            AND device_flespi_id IS NULL
        `,
        [opId]
    );
    const sharedRows = uniqueByCalcId(sharedRowsRaw);

    if (sharedRows.length === 0) {
        return {
            operation_id: opId,
            shared_calculators: 0,
            geofence_sync: { synced: 0, failed: 0 },
            device_sync: "no calculators found",
        };
    }

    await unassignOperationGeofencesFromOperationDevices({ operationId: opId });
    const [operationRow] = await dbQuery(
        "SELECT flespi_geofence_id FROM operations WHERE id = ?",
        [opId]
    );
    const operationGeofenceId = Number(operationRow?.flespi_geofence_id);
    const zoneRows = await dbQuery(
        `
          SELECT zoneType, flespi_geofence_id
          FROM zones
          WHERE operationId = ?
            AND flespi_geofence_id IS NOT NULL
        `,
        [opId]
    );
    const zoneGeofences = {
        LOAD_PAD: zoneRows
            .filter((z) => String(z.zoneType).toUpperCase() === "LOAD_PAD")
            .map((z) => Number(z.flespi_geofence_id))
            .filter(Number.isFinite),
        DUMP_AREA: zoneRows
            .filter((z) => String(z.zoneType).toUpperCase() === "DUMP_AREA")
            .map((z) => Number(z.flespi_geofence_id))
            .filter(Number.isFinite),
        QUEUE_AREA: zoneRows
            .filter((z) => String(z.zoneType).toUpperCase() === "QUEUE_AREA")
            .map((z) => Number(z.flespi_geofence_id))
            .filter(Number.isFinite),
        ZONE_AREA: zoneRows
            .filter((z) => String(z.zoneType).toUpperCase() === "ZONE_AREA")
            .map((z) => Number(z.flespi_geofence_id))
            .filter(Number.isFinite),
    };
    const calcTypeToGeofences = (calcType, fallbackGeofenceId) => {
        const type = String(calcType || "").toUpperCase();
        if (type === "CALC_LOAD_PAD" || type === "CALC_LOADERS_PAD") {
            return zoneGeofences.LOAD_PAD;
        }
        if (type === "CALC_DUMP_AREA") {
            return zoneGeofences.DUMP_AREA;
        }
        if (type === "CALC_QUEUE_AREA") {
            return zoneGeofences.QUEUE_AREA;
        }
        if (type === "ZONE_CALCULATOR" || type === "CALC_TRIP_CYCLE") {
            return zoneGeofences.ZONE_AREA;
        }
        if (type === "CALC_TRIP_L2D" || type === "CALC_TRIP_D2L") {
            return Array.from(new Set([...zoneGeofences.LOAD_PAD, ...zoneGeofences.DUMP_AREA]));
        }
        const fallback = Number(fallbackGeofenceId);
        if (Number.isFinite(fallback)) return [fallback];
        if (Number.isFinite(operationGeofenceId)) return [operationGeofenceId];
        return [];
    };

    const geofenceAssignments = [];
    for (const row of sharedRows) {
        const geofences = calcTypeToGeofences(row.calc_type, row.geofence_flespi_id);
        for (const geofenceId of geofences) {
            geofenceAssignments.push({
                calc_id: Number(row.calc_id),
                calc_type: row.calc_type || null,
                operation_id: opId,
                zone_id: row.zone_id ?? null,
                geofence_flespi_id: geofenceId,
            });
        }
    }

    const geofenceSync = await ensureCalculatorGeofences(geofenceAssignments);

    const dailyCalcIds = Array.from(
        new Set(
            sharedRows
                .filter(
                    (row) =>
                        String(row.calc_type || "").toUpperCase() ===
                        "DAILY_VEHICLE_REPORT"
                )
                .map((row) => Number(row.calc_id))
                .filter(Number.isFinite)
        )
    );
    const operationSummaryCalcIds = Array.from(
        new Set(
            sharedRows
                .filter(
                    (row) =>
                        String(row.calc_type || "").toUpperCase() ===
                        "OPERATION_SUMMARY"
                )
                .map((row) => Number(row.calc_id))
                .filter(Number.isFinite)
        )
    );
    for (const calcId of dailyCalcIds) {
        try {
            await updateFlespiCalculator(
                calcId,
                buildDailyVehicleReportOverrides(operationGeofenceId)
            );
        } catch (err) {
            console.warn(
                `Failed to update DAILY_VEHICLE_REPORT calculator ${calcId}:`,
                err.response?.data || err.message
            );
        }
    }
    for (const calcId of operationSummaryCalcIds) {
        try {
            await updateFlespiCalculator(
                calcId,
                buildOperationSummaryOverrides(operationGeofenceId)
            );
        } catch (err) {
            console.warn(
                `Failed to update OPERATION_SUMMARY calculator ${calcId}:`,
                err.response?.data || err.message
            );
        }
    }
    const zoneSelectorRows = sharedRows.filter((row) =>
        Boolean(buildZoneTypeSelectorOverrides(row?.calc_type))
    );
    for (const row of zoneSelectorRows) {
        try {
            await updateFlespiCalculator(
                Number(row.calc_id),
                buildZoneTypeSelectorOverrides(row.calc_type)
            );
        } catch (err) {
            console.warn(
                `Failed to update zone selector for calculator ${row.calc_id} (${row.calc_type}):`,
                err.response?.data || err.message
            );
        }
    }
    const tripCalcRows = sharedRows.filter((row) => {
        const type = String(row?.calc_type || "").toUpperCase();
        return type === "CALC_TRIP_L2D" || type === "CALC_TRIP_D2L";
    });
    for (const row of tripCalcRows) {
        try {
            await updateTripCalculatorDefinition({
                calcId: Number(row.calc_id),
                calcType: row.calc_type,
                loadPadGeofenceIds: zoneGeofences.LOAD_PAD,
                dumpAreaGeofenceIds: zoneGeofences.DUMP_AREA,
            });
        } catch (err) {
            console.warn(
                `Failed to update trip calculator ${row.calc_id} (${row.calc_type}):`,
                err.response?.data || err.message
            );
        }
    }

    const sharedExistingRows = await dbQuery(
        `
          SELECT calc_id, geofence_flespi_id
          FROM calculator_assignments
          WHERE operation_id = ?
            AND device_flespi_id IS NULL
            AND geofence_flespi_id IS NOT NULL
        `,
        [opId]
    );
    const sharedExistingSet = new Set(
        (sharedExistingRows || []).map(
            (row) => `${Number(row.calc_id)}:${Number(row.geofence_flespi_id)}`
        )
    );
    const missingSharedRows = geofenceAssignments.filter((row) => {
        const key = `${Number(row.calc_id)}:${Number(row.geofence_flespi_id)}`;
        return !sharedExistingSet.has(key);
    });
    if (missingSharedRows.length > 0) {
        await saveCalculatorAssignments(missingSharedRows);
    }

    await assignCalculatorsToOperationDevices({
        operationId: opId,
        assignments: sharedRows,
    });

    const [deviceCountRow] = await dbQuery(
        `
          SELECT COUNT(DISTINCT device_flespi_id) AS cnt
          FROM calculator_assignments
          WHERE operation_id = ?
            AND device_flespi_id IS NOT NULL
        `,
        [opId]
    );

    return {
        operation_id: opId,
        shared_calculators: sharedRows.length,
        geofence_sync: geofenceSync,
        assigned_device_count: Number(deviceCountRow?.cnt || 0),
    };
};

export const createOperation = async (operation) => {
    const {
        name,
        geometry,
        area_sqm,
        area_ha,
        op_max_speed_kmh,
        op_total_bank_volume_m3,
        op_swell_factor,
        day_volume_m3_goal,
        user_id,
    } = operation;

    const DayVolumeM3Goal = toNumberOrDefault(day_volume_m3_goal);
    const opMaxSpeedKmh = toNumberOrDefault(op_max_speed_kmh);
    const opTotalBankVolumeM3 = toNumberOrDefault(op_total_bank_volume_m3);
    const opSwellFactor = toNumberOrDefault(op_swell_factor);
    const geometryStr = JSON.stringify(geometry);

    const sql = `
    INSERT INTO operations
    (name, geometry, area_sqm, area_ha, op_max_speed_kmh, op_total_bank_volume_m3, op_swell_factor,day_volume_m3_goal, user_id)
    VALUES (?, ?, ?, ?, ?, ?,?, ?, ?)
  `;
    const values = [
        name,
        geometryStr,
        area_sqm,
        area_ha,
        opMaxSpeedKmh,
        opTotalBankVolumeM3,
        opSwellFactor,
        DayVolumeM3Goal,
        user_id,
    ];

    try {
        // 1️⃣ Save to DB
        const results = await dbQuery(sql, values);
        const operationId = results.insertId;

        // 2️⃣ Prepare geometry for Flespi
        const geometryData = toFlespiGeometry(geometry);
       
        // 3️⃣ Create Flespi Geofence
        const geofence = await createFlespiGeofence([
            {
                name: `${name} - LIQ`,
                priority: 10,
                enabled: true,
                geometry: geometryData,
                metadata: {
                    op_id: operationId,
                    loadiq_operation: true,
                    estimated_start_date: operation?.estimated_start_date ?? null,
                    estimated_end_date: operation?.estimated_end_date ?? null,
                    day_volume_m3_goal: DayVolumeM3Goal,
                    op_max_speed_kmh: opMaxSpeedKmh,
                    op_swell_factor: opSwellFactor,
                    op_total_bank_volume_m3: opTotalBankVolumeM3,
                },
            },
        ]);
        const geofenceId = geofence?.[0]?.id;

        // 4️⃣ Update DB with Flespi geofence id
        await dbQuery(
            "UPDATE operations SET flespi_geofence_id = ? WHERE id = ?",
            [geofenceId, operationId]
        );

        const templates = await getCalculatorTemplatesByType("OP_AREA");
        const assignmentsToSave = [];

        for (const template of templates) {
            try {
                const config = await loadCalculatorTemplateConfig(template.file_path);
                const cleanedConfig = sanitizeCalculatorConfig(config);
                const templateLabel = template?.name || `template-${template?.id || "unknown"}`;
                const calcName = `${templateLabel} - ${name} - LIQ`.slice(0, 200);
                cleanedConfig.name = calcName;
                if (templateLabel === "DAILY_VEHICLE_REPORT") {
                    Object.assign(
                        cleanedConfig,
                        buildDailyVehicleReportOverrides(geofenceId)
                    );
                } else if (templateLabel === "OPERATION_SUMMARY") {
                    Object.assign(
                        cleanedConfig,
                        buildOperationSummaryOverrides(geofenceId)
                    );
                }
                const calc = await createFlespiCalculator(cleanedConfig);
                await assignCalculatorToGeofence(calc.id, geofenceId);
                assignmentsToSave.push({
                    calc_id: calc.id,
                    calc_type: template?.name || null,
                    operation_id: operationId,
                    geofence_flespi_id: geofenceId,
                });
            } catch (err) {
                console.error(`Error creating/assigning calculator for OP_AREA (${template?.name || 'template'}):`, err.message);
            }
        }

        if (assignmentsToSave.length > 0) {
            await saveCalculatorAssignments(assignmentsToSave);
            await assignCalculatorsToOperationDevices({
                operationId,
                assignments: assignmentsToSave,
            });
        }

        return { id: operationId, flespi_geofence_id: geofenceId, ...operation };
    } catch (err) {
        console.error("❌ Error creating operation or geofence:", err);
        throw err;
    }
};


// =====================================================
// UPDATE OPERATION  ➜  also update Flespi geofence
// =====================================================
export const updateOperation = async (id, operation) => {
    const {
        name,
        geometry,
        area_sqm,
        area_ha,
        op_max_speed_kmh,
        op_total_bank_volume_m3,
        day_volume_m3_goal,
        op_swell_factor,
        priority,
        enabled
    } = operation;

    const sql = `
        UPDATE operations
        SET 
            name = ?, 
            geometry = ?, 
            area_sqm = ?, 
            area_ha = ?, 
            op_max_speed_kmh = ?, 
            op_total_bank_volume_m3 = ?,  
            day_volume_m3_goal = ?, 
            op_swell_factor = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    const values = [
        name,
        JSON.stringify(geometry),
        area_sqm,
        area_ha,
        toNumberOrDefault(op_max_speed_kmh),
        toNumberOrDefault(op_total_bank_volume_m3),
        toNumberOrDefault(day_volume_m3_goal),
        toNumberOrDefault(op_swell_factor),
        id,
    ];

    try {
        const results = await dbQuery(sql, values);
        if (results.affectedRows === 0) return { message: "Operation not found" };

        // Get existing geofence_id
        const [op] = await dbQuery(
            "SELECT flespi_geofence_id FROM operations WHERE id = ?",
            [id]
        );
        const geofenceId = op?.flespi_geofence_id;

        // Convert GeoJSON → Flespi polygon format
        let geometryData = toFlespiGeometry(geometry);

        // Update Flespi Geofence
        if (geofenceId) {
            const opGeofenceCalcIds = await getCalculatorIdsByGeofenceId(geofenceId);
            await deleteCalculatorsByIds(opGeofenceCalcIds);
            await deleteCalculatorAssignmentsByGeofenceId(geofenceId);
            await updateFlespiGeofence(geofenceId.toString(), {
                name: `${name} - LIQ`,
                enabled: enabled,
                geometry: geometryData,
                metadata: {
                    loadiq_operation: true,
                    estimated_start_date: operation?.estimated_start_date ?? null,
                    estimated_end_date: operation?.estimated_end_date ?? null,
                    day_volume_m3_goal: day_volume_m3_goal,
                    op_max_speed_kmh: op_max_speed_kmh,
                    op_swell_factor: op_swell_factor,
                    op_total_bank_volume_m3: op_total_bank_volume_m3,
                    priority: priority
                },
            });

            const templates = await getCalculatorTemplatesByType("OP_AREA");
            const assignmentsToSave = [];

            for (const template of templates) {
                try {
                    const config = await loadCalculatorTemplateConfig(template.file_path);
                    const cleanedConfig = sanitizeCalculatorConfig(config);
                    const templateLabel = template?.name || `template-${template?.id || "unknown"}`;
                    const calcName = `${templateLabel} - ${name} - LIQ`.slice(0, 200);
                    cleanedConfig.name = calcName;
                    if (templateLabel === "DAILY_VEHICLE_REPORT") {
                        Object.assign(
                            cleanedConfig,
                            buildDailyVehicleReportOverrides(geofenceId)
                        );
                    } else if (templateLabel === "OPERATION_SUMMARY") {
                        Object.assign(
                            cleanedConfig,
                            buildOperationSummaryOverrides(geofenceId)
                        );
                    }
                    const calc = await createFlespiCalculator(cleanedConfig);
                    await assignCalculatorToGeofence(calc.id, geofenceId);
                    assignmentsToSave.push({
                        calc_id: calc.id,
                        calc_type: template?.name || null,
                        operation_id: id,
                        geofence_flespi_id: geofenceId,
                    });
                } catch (err) {
                    console.error(`Error creating/assigning calculator for OP_AREA (${template?.name || 'template'}):`, err.message);
                }
            }

            if (assignmentsToSave.length > 0) {
                await saveCalculatorAssignments(assignmentsToSave);
                await assignCalculatorsToOperationDevices({
                    operationId: id,
                    assignments: assignmentsToSave,
                });
            }
        }

        return { id, ...operation };
    } catch (err) {
        console.error("❌ Error updating operation or geofence:", err);
        throw err;
    }
};

// =====================================================
// GET ALL OPERATIONS
// =====================================================
export const getAllOperations = async () => {
    try {
        return await dbQuery("SELECT * FROM operations");
        // return await getFlespiGeofence();
    } catch (err) {
        throw err;
    }
};

// =====================================================
// GET ONE OPERATION
// =====================================================
export const getOperationById = async (id) => {
    try {
        const results = await dbQuery("SELECT * FROM operations WHERE id = ?", [id]);
        return results.length > 0 ? results[0] : null;
    } catch (err) {
        throw err;
    }
};

// =====================================================
// DELETE OPERATION  ➜  also delete Flespi geofence
// =====================================================
export const deleteOperation = async (id) => {
    try {
        // ✅ 1) Remove device assignments linked to this operation
        await dbQuery(
            "DELETE FROM device_assignments WHERE operation_id = ?",
            [id]
        );

        const calcIdsByOperation = await getCalculatorIdsByOperationId(id);
        await deleteCalculatorsByIds(calcIdsByOperation);

        await deleteCalculatorAssignmentsByOperationId(id);

        // ✅ 2) Get all zones linked to this operation
        const zones = await dbQuery(
            "SELECT id, flespi_geofence_id FROM zones WHERE operationId = ?",
            [id]
        );

        // ✅ 3) Delete zones + their geofences
        for (const zone of zones) {
            const zoneCalcIds = await getCalculatorIdsByZoneId(zone.id);
            const zoneGeofenceCalcIds = zone.flespi_geofence_id
                ? await getCalculatorIdsByGeofenceId(zone.flespi_geofence_id)
                : [];
            await deleteCalculatorsByIds([...zoneCalcIds, ...zoneGeofenceCalcIds]);
            try {
                await deleteCalculatorAssignmentsByZoneId(zone.id);
                if (zone.flespi_geofence_id) {
                    await deleteCalculatorAssignmentsByGeofenceId(zone.flespi_geofence_id);
                }
                if (zone.flespi_geofence_id) {
                    await deleteFlespiGeofence(zone.flespi_geofence_id.toString());
                }
                await dbQuery("DELETE FROM zones WHERE id = ?", [zone.id]);
            } catch (zoneErr) {
                console.warn(
                    `⚠️ Failed to delete zone ${zone.id} or its geofence:`,
                    zoneErr.message
                );
            }
        }

        // ✅ 4) Get operation geofence
        const [op] = await dbQuery(
            "SELECT flespi_geofence_id FROM operations WHERE id = ?",
            [id]
        );
        const geofenceId = op?.flespi_geofence_id;

        // ✅ 5) Delete operation row
        const results = await dbQuery("DELETE FROM operations WHERE id = ?", [id]);
        if (results.affectedRows === 0) return null;

        // ✅ 6) Remove operation geofence
        if (geofenceId) {
            await deleteCalculatorAssignmentsByGeofenceId(geofenceId);
            await deleteFlespiGeofence(geofenceId.toString());
        }

        return true;

    } catch (err) {
        console.error("❌ Error deleting operation, assignments, or geofences:", err);
        throw err;
    }
};
