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
    assignCalculatorToGeofence
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
                name: `OP_AREA-${name}`,
                priority: 10,
                enabled: true,
                geometry: geometryData,
                metadata: {
                    op_id: operationId,
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
                const calcName = `OP-${name}-${templateLabel}`.slice(0, 200);
                cleanedConfig.name = calcName;
                const calc = await createFlespiCalculator(cleanedConfig);
                await assignCalculatorToGeofence(calc.id, geofenceId);
                assignmentsToSave.push({
                    calc_id: calc.id,
                    operation_id: operationId,
                    geofence_flespi_id: geofenceId,
                });
            } catch (err) {
                console.error(`Error creating/assigning calculator for OP_AREA (${template?.name || 'template'}):`, err.message);
            }
        }

        if (assignmentsToSave.length > 0) {
            await saveCalculatorAssignments(assignmentsToSave);
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
                name: name,
                enabled: enabled,
                geometry: geometryData,
                metadata: {
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
                    const calcName = `OP-${name}-${templateLabel}`.slice(0, 200);
                    cleanedConfig.name = calcName;
                    const calc = await createFlespiCalculator(cleanedConfig);
                    await assignCalculatorToGeofence(calc.id, geofenceId);
                    assignmentsToSave.push({
                        calc_id: calc.id,
                        operation_id: id,
                        geofence_flespi_id: geofenceId,
                    });
                } catch (err) {
                    console.error(`Error creating/assigning calculator for OP_AREA (${template?.name || 'template'}):`, err.message);
                }
            }

            if (assignmentsToSave.length > 0) {
                await saveCalculatorAssignments(assignmentsToSave);
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
