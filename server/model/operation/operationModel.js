import pool from "../../config/dbConfig.js";
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

import {
    createFlespiGeofence,
    getFlespiGeofence,
    updateFlespiGeofence,
    deleteFlespiGeofence,
    createFlespiCalculator,
    assignCalculatorToGeofence
} from "../../services/flespiApis.js";

// =====================================================
// CREATE OPERATION  ➜  also create Flespi geofence
// =====================================================
export const createOperation = async (operation) => {
    const {
        name,
        geometry,
        area_sqm,
        area_ha,
        op_max_speed_kmh,
        op_total_bank_volume_m3,
        op_swell_factor,
        user_id,
    } = operation;

    const opMaxSpeedKmh = parseFloat(op_max_speed_kmh);
    const opTotalBankVolumeM3 = parseFloat(op_total_bank_volume_m3);
    const opSwellFactor = parseFloat(op_swell_factor);
    const geometryStr = JSON.stringify(geometry);

    const sql = `
    INSERT INTO operations
    (name, geometry, area_sqm, area_ha, op_max_speed_kmh, op_total_bank_volume_m3, op_swell_factor, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const values = [
        name,
        geometryStr,
        area_sqm,
        area_ha,
        opMaxSpeedKmh,
        opTotalBankVolumeM3,
        opSwellFactor,
        user_id,
    ];

    try {
        // 1️⃣ Save to DB
        const results = await dbQuery(sql, values);
        const operationId = results.insertId;

        // 2️⃣ Prepare geometry for Flespi
        let geometryData = geometry;
        if (geometry?.type === "Polygon" && geometry.coordinates?.[0]) {
            const coords = geometry.coordinates[0];
            geometryData = {
                type: "polygon",
                path: coords.map(([lon, lat]) => ({ lat, lon })),
            };
        }

        // 3️⃣ Create Flespi Geofence
        const geofence = await createFlespiGeofence([
            {
                name: `OP_AREA-${name}`,
                priority: 10,
                enabled: true,
                geometry: geometryData,
                metadata: {
                    operation_id: operationId,
                    user_id,
                    color: "#3498db",
                    area_ha,
                    max_speed: opMaxSpeedKmh,
                },
            },
        ]);

        const geofenceId = geofence?.[0]?.id;

        // 4️⃣ Update DB with Flespi geofence id
        await dbQuery(
            "UPDATE operations SET flespi_geofence_id = ? WHERE id = ?",
            [geofenceId, operationId]
        );

        // 5️⃣ Get calculator templates of type 'OP_AREA'
        // const templates = await dbQuery(
        //     "SELECT * FROM calculator_templates WHERE type = 'OP_AREA'"
        // );

        // 6️⃣ Create and assign calculators for this operation
        // for (const tpl of templates) {
        //     try {
        //         const config = JSON.parse(tpl.config_json);
        //         const calc = await createFlespiCalculator(config);
        //         await assignCalculatorToGeofence(calc.id, geofenceId);
        //         console.log(
        //             `✅ Assigned calculator "${tpl.name}" (ID ${calc.id}) to geofence ${geofenceId}`
        //         );
        //     } catch (err) {
        //         console.error(
        //             `❌ Failed to create/assign calculator "${tpl.name}":`,
        //             err.message
        //         );
        //     }
        // }


        const calcIds = [2193946, 2194117, 2194146, 2194152, 2194163, 2194183];

        for (const calcId of calcIds) {
            try {
                await assignCalculatorToGeofence(calcId, geofenceId);
                console.log(`✅ Assigned calc ${calcId} → geofence ${geofenceId}`);
            } catch (err) {
                console.error(`❌ Error assigning calc ${calcId}:`, err.message);
            }
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
        op_swell_factor,
    } = operation;

    const sql = `
    UPDATE operations
    SET name = ?, geometry = ?, area_sqm = ?, area_ha = ?, 
        op_max_speed_kmh = ?, op_total_bank_volume_m3 = ?, 
        op_swell_factor = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
    const values = [
        name,
        JSON.stringify(geometry),
        area_sqm,
        area_ha,
        parseFloat(op_max_speed_kmh),
        parseFloat(op_total_bank_volume_m3),
        parseFloat(op_swell_factor),
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

        // Update Flespi Geofence if exists
        if (geofenceId) {
            await updateFlespiGeofence(geofenceId.toString(), {
                name,
                geometry,
                metadata: {
                    area_ha,
                    max_speed: parseFloat(op_max_speed_kmh),
                    updated: true,
                },
            });
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

        // ✅ 2) Get all zones linked to this operation
        const zones = await dbQuery(
            "SELECT id, flespi_geofence_id FROM zones WHERE operationId = ?",
            [id]
        );

        // ✅ 3) Delete zones + their geofences
        for (const zone of zones) {
            try {
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
            await deleteFlespiGeofence(geofenceId.toString());
        }

        return true;

    } catch (err) {
        console.error("❌ Error deleting operation, assignments, or geofences:", err);
        throw err;
    }
};
