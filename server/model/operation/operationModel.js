import pool from "../../config/dbConfig.js"; 
import util from "util";
const dbQuery = util.promisify(pool.query).bind(pool);

// Create a new operation
export const createOperation = async (operation) => {
    const {
        name,
        geometry,
        area_sqm,
        area_ha,
        op_max_speed_kmh,
        op_total_bank_volume_m3,
        op_swell_factor,
        user_id
    } = operation;

    // Ensure that the values are properly typed (convert them to numbers if necessary)
    const opMaxSpeedKmh = parseFloat(op_max_speed_kmh);  // Ensure it's a number
    const opTotalBankVolumeM3 = parseFloat(op_total_bank_volume_m3);  // Ensure it's a number
    const opSwellFactor = parseFloat(op_swell_factor);  // Ensure it's a number

    // Ensure geometry is a stringified JSON object (if it's not already)
    const geometryStr = JSON.stringify(geometry);

    const sql = `
        INSERT INTO operations
        (name, geometry, area_sqm, area_ha, op_max_speed_kmh, op_total_bank_volume_m3, op_swell_factor, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        name,
        geometryStr, // Make sure geometry is stringified
        area_sqm,
        area_ha,
        opMaxSpeedKmh, // Pass as a number
        opTotalBankVolumeM3, // Pass as a number
        opSwellFactor, // Pass as a number
        user_id,  // user_id as provided
    ];

    try {
        const results = await dbQuery(sql, values);
        return { id: results.insertId, ...operation };  // Return the new operation object with ID
    } catch (err) {
        throw err;
    }
};



// Update an existing operation
export const updateOperation = async (id, operation) => {
    const { name, geometry, areaSqm, areaHa, op_max_speed_kmh, op_total_bank_volume_m3, op_swell_factor } = operation;

    const sql = `
    UPDATE operations
    SET name = ?, geometry = ?, area_sqm = ?, area_ha = ?, op_max_speed_kmh = ?, op_total_bank_volume_m3 = ?, op_swell_factor = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
    const values = [
        name,
        geometry,
        areaSqm,
        area_sqmareaHa,
        op_max_speed_kmh,
        op_total_bank_volume_m3,
        op_swell_factor,
        id,
    ];

    try {
        const results = await dbQuery(sql, values);
        if (results.affectedRows === 0) {
            return { message: "Operation not found" };
        }
        return { id, ...operation };  // Return updated operation object
    } catch (err) {
        throw err;
    }
};

// Get all operations
export const getAllOperations = async () => {
    const sql = "SELECT * FROM operations";

    try {
        const results = await dbQuery(sql);
        return results;
    } catch (err) {
        throw err;
    }
};

// Get a single operation by ID
export const getOperationById = async (id) => {
    const sql = "SELECT * FROM operations WHERE id = ?";

    try {
        const results = await dbQuery(sql, [id]);
        if (results.length > 0) {
            return results[0];  // Return the first operation (since ID is unique)
        }
        return null;  // If no operation found
    } catch (err) {
        throw err;
    }
};

// Delete an operation by ID
export const deleteOperation = async (id) => {
    const sql = "DELETE FROM operations WHERE id = ?";

    try {
        const results = await dbQuery(sql, [id]);
        if (results.affectedRows === 0) {
            return null;  // If no operation was deleted
        }
        return true;  // Successfully deleted
    } catch (err) {
        throw err;
    }
};