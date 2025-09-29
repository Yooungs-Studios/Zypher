const { getUserPreferences } = require('./userPreferences');
const { queryDb } = require('./userPreferences');
const db = require('../database'); // Asegúrate de que la ruta sea correcta

/**
 * Inserta una nueva recomendación en la base de datos.
 * @param {number} usuarioId - ID del usuario.
 * @param {number} videoId - ID del video.
 * @param {string} algoritmo - Algoritmo que generó la recomendación.
 * @param {string} tipoRecomendacion - Tipo de recomendación (colaborativa, contenido, híbrida, etc.).
 * @param {number} puntaje - Puntaje calculado por el algoritmo.
 * @param {string} razon - Explicación de la recomendación.
 */
const insertRecommendation = async (usuarioId, videoId, algoritmo, tipoRecomendacion, puntaje, razon) => {
    try {
        await queryDb(
            `INSERT INTO recomendaciones 
             (usuario_id, video_id, algoritmo, tipo_recomendacion, puntaje, razon_recomendacion) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [usuarioId, videoId, algoritmo, tipoRecomendacion, puntaje, razon]
        );
        console.log("Recomendación insertada con éxito.");
    } catch (err) {
        console.error("Error al insertar recomendación:", err);
        throw err;
    }
};

/**
 * Obtiene las recomendaciones almacenadas para un usuario.
 * @param {number} usuarioId - ID del usuario.
 * @returns {Promise<Array>} - Lista de recomendaciones.
 */
const getStoredRecommendations = async (usuarioId) => {
    try {
        const recommendations = await queryDb(
            `SELECT * 
             FROM recomendaciones 
             WHERE usuario_id = ? 
             ORDER BY fecha_recomendacion DESC`,
            [usuarioId]
        );
        return recommendations;
    } catch (err) {
        console.error("Error al obtener recomendaciones:", err);
        throw err;
    }
};

/**
 * Genera recomendaciones personalizadas para un usuario y las guarda en la base de datos.
 * @param {number} userId - ID del usuario.
 * @param {Object} algorithmWeights - Pesos personalizados para los algoritmos.
 * @returns {Promise<Array>} - Lista de videos recomendados.
 */
const getRecommendationsForUser = async (
    userId,
    algorithmWeights = { clickRec: 0.4, tasteRec: 0.3, randRec: 0.2, trendRec: 0.1 }
) => {
    try {
        const userPreferences = await getUserPreferences(userId);

        const userHistory = await queryDb(
            `SELECT video_id, tipo_interaccion, duracion_visto 
             FROM interacciones 
             WHERE usuario_id = ? 
             ORDER BY fecha_interaccion DESC 
             LIMIT 50`,
            [userId]
        );

        const trendingVideos = await queryDb(
            `SELECT video_id, titulo, descripcion, categoria, idioma, clics, vistas, likes, trend_factor, fecha_publicacion, creador_id 
             FROM videos 
             WHERE fecha_publicacion >= datetime('now', '-30 days') 
             ORDER BY trend_factor DESC 
             LIMIT 50`
        );

        const combinedRecommendations = {};

        userHistory.forEach(({ video_id }) => {
            combinedRecommendations[video_id] = (combinedRecommendations[video_id] || 0) + algorithmWeights.clickRec;
        });

        trendingVideos.forEach((video) => {
            const categoriaFactor = (userPreferences.categorias?.[video.categoria] || 0) * 0.3;
            const idiomaFactor = (userPreferences.idiomas?.[video.idioma] || 0) * 0.2;
            const randomFactor = Math.random() * algorithmWeights.randRec;

            combinedRecommendations[video.video_id] =
                (combinedRecommendations[video.video_id] || 0) +
                categoriaFactor +
                idiomaFactor +
                video.trend_factor * algorithmWeights.trendRec +
                randomFactor;
        });

        const sortedRecommendations = Object.entries(combinedRecommendations)
            .sort((a, b) => b[1] - a[1])
            .map(([video_id]) => parseInt(video_id))
            .slice(0, 20);

        const recommendedVideos = await queryDb(
            `SELECT * FROM videos
JOIN creadores ON videos.creador_id = creadores.creador_id
WHERE video_id IN (${sortedRecommendations.join(',')})
`
        );

        // Guarda las recomendaciones en la base de datos
        for (const video of recommendedVideos) {
            const puntaje = combinedRecommendations[video.video_id];
            // await insertRecommendation(
            //     userId,
            //     video.video_id,
            //     "híbrida", // Asumiendo un algoritmo mixto
            //     "personalizada",
            //     puntaje,
            //     "Basado en historial y preferencias de usuario."
            // );
        }

        return recommendedVideos;
    } catch (err) {
        console.error("Error al generar recomendaciones:", err);
        throw err;
    }
};

module.exports = {
    getRecommendationsForUser,
    insertRecommendation,
    getStoredRecommendations
};
