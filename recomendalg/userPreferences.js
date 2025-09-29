const sqlite3 = require('sqlite3').verbose();

// Conexión a la base de datos
const db = require('../database'); // Asegúrate de que la ruta sea correcta

/**
 * Obtiene las preferencias actuales del usuario.
 * @param {number} usuarioId - ID del usuario.
 * @returns {Promise<Object>} - Preferencias del usuario en formato JSON.
 */
async function getUserPreferences(usuarioId) {
    try {
        const result = await queryDb(
            `SELECT preferencias 
             FROM usuarios 
             WHERE usuario_id = ?`,
            [usuarioId]
        );
        return result.length > 0 ? JSON.parse(result[0].preferencias || '{}') : {};
    } catch (err) {
        console.error("Error al obtener preferencias:", err);
        throw err;
    }
}

/**
 * Guarda o actualiza una preferencia del usuario.
 * @param {number} usuarioId - ID del usuario.
 * @param {string} key - Clave de la preferencia.
 * @param {*} value - Valor de la preferencia.
 */
async function saveUserPreference(usuarioId, key, value) {
    try {
        const currentPreferences = await getUserPreferences(usuarioId);
        currentPreferences[key] = value;

        await queryDb(
            `UPDATE usuarios 
             SET preferencias = ? 
             WHERE usuario_id = ?`,
            [JSON.stringify(currentPreferences), usuarioId]
        );
    } catch (err) {
        console.error("Error al guardar preferencia:", err);
        throw err;
    }
}

/**
 * Elimina una clave específica de las preferencias del usuario.
 * @param {number} usuarioId - ID del usuario.
 * @param {string} key - Clave de la preferencia a eliminar.
 */
async function deleteUserPreference(usuarioId, key) {
    try {
        const currentPreferences = await getUserPreferences(usuarioId);

        if (key in currentPreferences) {
            delete currentPreferences[key];
        }

        await queryDb(
            `UPDATE usuarios 
             SET preferencias = ? 
             WHERE usuario_id = ?`,
            [JSON.stringify(currentPreferences), usuarioId]
        );
    } catch (err) {
        console.error("Error al eliminar preferencia:", err);
        throw err;
    }
}

/**
 * Ejecuta una consulta en la base de datos.
 * @param {string} query - Consulta SQL.
 * @param {Array} params - Parámetros para la consulta.
 * @returns {Promise<Array>} - Resultados de la consulta.
 */
function queryDb(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });
    });
}

module.exports = {
    getUserPreferences,
    saveUserPreference,
    deleteUserPreference,
    queryDb, // Asegúrate de que esta línea esté presente
};

