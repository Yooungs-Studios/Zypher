const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('Zypher.db');

/**
 * Obtiene las recomendaciones personalizadas para un usuario.
 * @param {number} userId - ID del usuario para el que se generan las recomendaciones.
 * @param {Object} algorithmWeights - Pesos personalizados para cada algoritmo.
 * @returns {Promise<Array>} - Lista de videos recomendados con detalles.
 */
async function getRecommendationsForUser(
    userId,
    algorithmWeights = { clickRec: 0.4, tasteRec: 0.3, randRec: 0.2, trendRec: 0.1 }
) {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                const userHistory = await queryDb(
                    `SELECT video_id, tipo_interaccion, duracion_visto 
                     FROM interacciones 
                     WHERE usuario_id = ? 
                     ORDER BY fecha_interaccion DESC 
                     LIMIT 50`,
                    [userId]
                );

                const subscriptions = await queryDb(
                    `SELECT creador_id 
                     FROM suscripciones 
                     WHERE usuario_id = ?`,
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

                subscriptions.forEach(({ creador_id }) => {
                    trendingVideos.forEach((video) => {
                        if (video.creador_id === creador_id) {
                            combinedRecommendations[video.video_id] =
                                (combinedRecommendations[video.video_id] || 0) + algorithmWeights.tasteRec;
                        }
                    });
                });

                trendingVideos.forEach((video) => {
                    combinedRecommendations[video.video_id] =
                        (combinedRecommendations[video.video_id] || 0) + video.trend_factor * algorithmWeights.trendRec;
                });

                trendingVideos.forEach((video) => {
                    const randomFactor = Math.random() * algorithmWeights.randRec;
                    combinedRecommendations[video.video_id] =
                        (combinedRecommendations[video.video_id] || 0) + randomFactor;
                });

                const sortedRecommendations = Object.entries(combinedRecommendations)
                    .sort((a, b) => b[1] - a[1])
                    .map(([video_id]) => parseInt(video_id))
                    .slice(0, 20);

                const viewedVideoIds = userHistory.map(({ video_id }) => video_id);
                const finalRecommendations = sortedRecommendations.filter(
                    (video_id) => !viewedVideoIds.includes(video_id)
                );

                const recommendedVideos = await queryDb(
                    `SELECT video_id, titulo, descripcion, minea, usernick, categoria, idioma, vistas, likes, comentarios, creador_id 
                     FROM videos 
                     WHERE video_id IN (${finalRecommendations.join(',')})`
                );

                resolve(shuffleArray(recommendedVideos));
            } catch (err) {
                reject(err);
            }
        });
    });
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

/**
 * Mezcla un arreglo de manera aleatoria.
 * @param {Array} array - Arreglo a mezclar.
 * @returns {Array} - Arreglo mezclado.
 */
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

module.exports = { getRecommendationsForUser };
