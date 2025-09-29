const db = require('../database'); // Asegúrate de que la ruta sea correcta


function actualizarTrendFactor() {
    const query = `
        UPDATE videos
        SET trend_factor = (
            (vistas * 0.1) + 
            (likes * 0.3) - 
            (dislikes * 0.2) +  
            (clics * 0.1) + 
            (compartidos * 0.3) + 
            (comentarios * 0.3)
        ) / (1 + log(1 + (julianday('now') - julianday(fecha_publicacion)) * 24))
    `;

    db.run(query, (err) => {
        if (err) {
            console.error('Error actualizando trend_factor:', err.message);
        } else {
            console.log('trend_factor actualizado para todos los videos.');
        }
    });
}

// Ejecutar la función periódicamente, por ejemplo, cada hora
module.exports = {
    actualizarTrendFactor
};