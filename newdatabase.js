const cassandra = require('cassandra-driver');

// Configuración de la conexión a ScyllaDB en localhost
const client = new cassandra.Client({
    contactPoints: ['127.0.0.1'], // Dirección de tu máquina local
    localDataCenter: 'datacenter1', // Usualmente 'datacenter1' si es un nodo único
    keyspace: 'zypher' // El keyspace debe estar creado previamente
});

// Crear keyspace (si no existe)
client.execute(`
    CREATE KEYSPACE IF NOT EXISTS zypher WITH 
    replication = {'class': 'SimpleStrategy', 'replication_factor': 1}; 
    -- Usamos un factor de replicación de 1 para un solo nodo
`, (err) => {
    if (err) {
        console.error('Error al crear keyspace', err.message);
    } else {
        console.log('Keyspace creado correctamente');
    }
});

// Crear tablas
const createTables = async () => {
    try {
        // Tabla de usuarios
        await client.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                usuario_id UUID PRIMARY KEY,
                nombre TEXT,
                correo TEXT,
                contraseña TEXT,
                pais TEXT,
                dispositivo TEXT,
                preferencias TEXT,
                fecha_registro TIMESTAMP,
                img TEXT,
                correo_validado INT,
                reset_token TEXT,
                reset_expiration INT,
                verification_token TEXT
            );
        `);

        // Tabla de videos
        await client.execute(`
            CREATE TABLE IF NOT EXISTS videos (
                video_id UUID PRIMARY KEY,
                titulo TEXT,
                descripcion TEXT,
                minea TEXT,
                vid TEXT,
                categoria TEXT,
                tags TEXT,
                idioma TEXT,
                clics INT,
                vistas INT,
                likes INT,
                dislikes INT,
                comentarios INT,
                comentarios_id UUID,
                usernick TEXT,
                compartidos INT,
                trend_factor FLOAT,
                fecha_publicacion TIMESTAMP,
                creador_id UUID
            );
        `);

        // Tabla de creadores
        await client.execute(`
            CREATE TABLE IF NOT EXISTS creadores (
                creador_id UUID PRIMARY KEY,
                nickname TEXT,
                descripcion TEXT,
                avatar TEXT,
                banner TEXT,
                redes_sociales TEXT,
                suscriptores INT,
                videos_subidos INT,
                interacciones_totales INT,
                ingresos_totales FLOAT,
                estado_cuenta TEXT,
                fecha_registro TIMESTAMP,
                ultima_actividad TIMESTAMP,
                usuario_id UUID
            );
        `);

        // Tabla de suscripciones
        await client.execute(`
            CREATE TABLE IF NOT EXISTS suscripciones (
                suscripcion_id UUID PRIMARY KEY,
                usuario_id UUID,
                creador_id UUID,
                fecha_suscripcion TIMESTAMP
            );
        `);

        // Tabla de interacciones
        await client.execute(`
            CREATE TABLE IF NOT EXISTS interacciones (
                interaccion_id UUID PRIMARY KEY,
                usuario_id UUID,
                video_id UUID,
                tipo_interaccion TEXT,
                duracion_visto FLOAT,
                fecha_interaccion TIMESTAMP
            );
        `);

        // Tabla de recomendaciones
        await client.execute(`
            CREATE TABLE IF NOT EXISTS recomendaciones (
                recomendacion_id UUID PRIMARY KEY,
                usuario_id UUID,
                video_id UUID,
                algoritmo TEXT,
                tipo_recomendacion TEXT,
                puntaje FLOAT,
                razon_recomendacion TEXT,
                visto INT,
                feedback TEXT,
                fecha_recomendacion TIMESTAMP,
                fecha_interaccion TIMESTAMP,
                duracion_vista INT
            );
        `);

        // Tabla de comentarios
        await client.execute(`
            CREATE TABLE IF NOT EXISTS comentarios (
                comentario_id UUID PRIMARY KEY,
                video_id UUID,
                usuario_id UUID,
                contenido TEXT,
                fecha_comentario TIMESTAMP
            );
        `);

        console.log('Tablas creadas correctamente');
    } catch (err) {
        console.error('Error al crear tablas:', err.message);
    }
};

// Ejecutar la creación de tablas
createTables();
