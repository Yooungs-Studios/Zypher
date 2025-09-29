const { getUserPreferences, saveUserPreference } = require('./userPreferences');
const sqlite3 = require('sqlite3').verbose();

// Conexión a la base de datos
const db = require('../database'); // Asegúrate de que la ruta sea correcta

/**
 * Actualiza las preferencias del usuario basándose en una interacción con un video.
 * @param {number} usuarioId - ID del usuario.
 * @param {Object} video - Objeto del video con propiedades relevantes.
 */
async function updateUserPreferencesOnInteraction(usuarioId, video) {
    try {
        const currentPreferences = await getUserPreferences(usuarioId);

        // Incrementar el interés por la categoría e idioma del video
        const categoria = video.categoria;
        const idioma = video.idioma;

        currentPreferences.categorias = currentPreferences.categorias || {};
        currentPreferences.categorias[categoria] = 
            (currentPreferences.categorias[categoria] || 0) + 1;

        currentPreferences.idiomas = currentPreferences.idiomas || {};
        currentPreferences.idiomas[idioma] = 
            (currentPreferences.idiomas[idioma] || 0) + 1;

        // Guardar las preferencias actualizadas
        await saveUserPreference(usuarioId, 'categorias', currentPreferences.categorias);
        await saveUserPreference(usuarioId, 'idiomas', currentPreferences.idiomas);
    } catch (err) {
        console.error("Error actualizando preferencias por interacción:", err);
        throw err;
    }
}

module.exports = { updateUserPreferencesOnInteraction };
