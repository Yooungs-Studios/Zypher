const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('Zypher.db', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log("Creando tablas...");

        // Tabla de usuarios
        db.run(`
            CREATE TABLE IF NOT EXISTS usuarios (
                usuario_id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                correo TEXT NOT NULL UNIQUE,
                contraseña TEXT NOT NULL,
                pais TEXT,
                dispositivo TEXT,
                preferencias TEXT DEFAULT '{}', -- JSON en forma de cadena,
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                img TEXT,
                correo_validado INTEGER DEFAULT 0, -- 0: no validado, 1: validado
                reset_token TEXT, -- Token para recuperación de contraseña
                reset_expiration INTEGER, -- Fecha de expiración del token (timestamp)
                verification_token TEXT -- Token para validar el correo
            )
        `);

        // Tabla de videos
        db.run(`
            CREATE TABLE IF NOT EXISTS videos (
                video_id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                minea TEXT,
                vid TEXT,
                categoria TEXT,
                tags TEXT, -- Etiquetas separadas por comas
                idioma TEXT,
                duration TEXT,
                clics INTEGER DEFAULT 0,
                vistas INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                dislikes INTEGER DEFAULT 0,
                comentarios INTEGER DEFAULT 0,
                comentarios_id INTEGER ,
                usernick TEXT,
                compartidos INTEGER DEFAULT 0,
                trend_factor REAL DEFAULT 0.0, -- Para medir la tendencia
                fecha_publicacion DATETIME NOT NULL,
                creador_id INTEGER NOT NULL,
                FOREIGN KEY (creador_id) REFERENCES creadores (creador_id)
            )
        `);

        // Tabla de creadores
        db.run(`
            CREATE TABLE IF NOT EXISTS creadores (
                creador_id INTEGER PRIMARY KEY AUTOINCREMENT,
                id TEXT NOT NULL,
                nickname TEXT UNIQUE NOT NULL, -- Nickname único del creador
                descripcion TEXT, -- Breve descripción o biografía del creador
                avatar TEXT, -- URL de la imagen del avatar
                banner TEXT, -- URL del banner del perfil
                redes_sociales TEXT DEFAULT '{}', -- JSON con enlaces a redes sociales
                suscriptores INTEGER DEFAULT 0, -- Número de suscriptores
                videos_subidos INTEGER DEFAULT 0, -- Número total de videos subidos
                interacciones_totales INTEGER DEFAULT 0, -- Total de interacciones recibidas
                ingresos_totales REAL DEFAULT 0.0, -- Total de ingresos generados
                estado_cuenta TEXT DEFAULT 'activo', -- Estado de la cuenta ('activo', 'suspendido', 'baneado')
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha de registro
                ultima_actividad DATETIME DEFAULT CURRENT_TIMESTAMP, -- Última actividad del creador
                usuario_id INTEGER NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (usuario_id)
            )
        `);

        // Tabla de suscripciones
        db.run(`
            CREATE TABLE IF NOT EXISTS suscripciones (
                suscripcion_id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                creador_id INTEGER NOT NULL,
                fecha_suscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (usuario_id),
                FOREIGN KEY (creador_id) REFERENCES creadores (creador_id)
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS messages  (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER,
  user_id INTEGER,
  message TEXT,
  role TEXT,  -- 'user' o 'support'
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id)
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
        `);

        // Tabla de interacciones
        db.run(`
            CREATE TABLE IF NOT EXISTS interacciones (
                interaccion_id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                video_id INTEGER NOT NULL,
                tipo_interaccion TEXT NOT NULL, -- 'like', 'comentario', 'compartido', 'visto'
                duracion_visto REAL DEFAULT 0.0, -- En segundos
                fecha_interaccion DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (usuario_id),
                FOREIGN KEY (video_id) REFERENCES videos (video_id)
            )
        `);

        // Tabla de recomendaciones
        db.run(`
            CREATE TABLE IF NOT EXISTS recomendaciones (
                recomendacion_id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                video_id INTEGER NOT NULL,
                algoritmo TEXT NOT NULL,
                tipo_recomendacion TEXT,
                puntaje REAL NOT NULL,
                razon_recomendacion TEXT,
                visto INTEGER DEFAULT 0,
                feedback TEXT,
                fecha_recomendacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_interaccion DATETIME,
                duracion_vista INTEGER,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (usuario_id),
                FOREIGN KEY (video_id) REFERENCES videos (video_id)
            );
        `);

        // Tabla de comentarios
        db.run(`
            CREATE TABLE IF NOT EXISTS comentarios (
                comentario_id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id INTEGER NOT NULL, -- Video al que pertenece el comentario
                creador_id INTEGER NOT NULL, -- Usuario que hizo el comentario
                contenido TEXT NOT NULL, -- Texto del comentario
                fecha_comentario DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos (video_id),
                FOREIGN KEY (creador_id) REFERENCES usuarios (creador_id)
            )
        `);

        // Tabla de categorias (para posts)
        db.run(`
            CREATE TABLE IF NOT EXISTS categorias (
                categoria_id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE NOT NULL, -- Nombre de la categoría
                descripcion TEXT -- Descripción opcional de la categoría
            );
        `);

        // Tabla de posts (blog)
        db.run(`
            CREATE TABLE IF NOT EXISTS posts (
                post_id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL, -- Título del post
                descripcion TEXT, -- Descripción del post
                contenido TEXT NOT NULL, -- Contenido del post
                fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha de publicación
                categoria_id INTEGER, -- Referencia a la tabla 'categorias'
                autor_id INTEGER NOT NULL, -- ID del autor (de la tabla 'autores')
                FOREIGN KEY (categoria_id) REFERENCES categorias (categoria_id),
                FOREIGN KEY (autor_id) REFERENCES autores (autor_id)
            );
        `);

        // Tabla de autores (usuarios que pueden crear posts)
        db.run(`
            CREATE TABLE IF NOT EXISTS autores (
                autor_id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL, -- Relación con tabla de usuarios
                username TEXT UNIQUE NOT NULL, -- Nombre de usuario único
                rol TEXT NOT NULL, -- Rol del autor (Ej. admin, escritor)
                avatar TEXT, -- URL de la imagen del avatar del autor
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha de registro del autor
                FOREIGN KEY (usuario_id) REFERENCES usuarios (usuario_id)
            )
        `);


        console.log("Tablas creadas correctamente.");
    }
});

// Exporta la conexión para uso en otros módulos
module.exports = db;
