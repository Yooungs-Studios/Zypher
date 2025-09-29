const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');
const { getUserPreferences, saveUserPreference } = require('./recomendalg/userPreferences');
const { updateUserPreferencesOnInteraction } = require('./recomendalg/updateUserPreferences');
const { getRecommendationsForUser, insertRecommendation, getStoredRecommendations } = require('./recomendalg/recommendations');

const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const app = express();
const PORT = 3000;
const HOST = "localhost"
const { actualizarTrendFactor } = require('./recomendalg/updateTrendFactor');
actualizarTrendFactor();
setInterval(() => {
    console.log('Actualización periódica del trend_factor...');
    actualizarTrendFactor();
}, 3600000);
const EMAIL_USER = process.env.EMAIL_USER || "assists.kinglyfenixstudios@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || 'juwh kxte urbt bnbr';
if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Faltan las credenciales de correo en el archivo .env');
}

// Conexión a la base de datos
const db = new sqlite3.Database('Zypher.db', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log("Conexión exitosa a la base de datos.");
    }
});
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});
// Configuración de EJS
app.set('view engine', 'ejs');

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'KinglyFenix',
    resave: false,
    saveUninitialized: true
}));
app.set('views', path.join(__dirname, 'src', 'views'));
const isLoggedIn = (req, res, next) => {
    if (req.session.userId) {
        return next();
    } else {
        return res.redirect('/auth/register-login');
    }
};
// Ruta principal
// Ruta para la página principal con videos en tendencia y recomendaciones
app.get('/',  async (req, res) => {
    try {
        const usuarioId = req.session.userId;

        // Obtener videos en tendencia con información del creador
        const trendingVideos = await new Promise((resolve, reject) => {
            db.all(
                `SELECT videos.*, creadores.nickname AS channel_name
                 FROM videos
                 JOIN creadores ON videos.creador_id = creadores.creador_id
                 ORDER BY videos.trend_factor DESC
                 LIMIT 10`,
                [],
                (err, rows) => (err ? reject(err) : resolve(rows))
            );
        });

        // Obtener recomendaciones personalizadas
        const recommendedVideos = usuarioId
            ? await getRecommendationsForUser(usuarioId)
            : []; // Si no hay usuario, no se muestran recomendaciones
            const subs = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT * FROM suscripciones WHERE usuario_id = ?`, [usuarioId],
                    (err, rows) => (err ? reject(err) : resolve(rows))
                );
            });

            res.render('home/index', {
            trendingVideos,
            recommendedVideos,
            userid: usuarioId,
            userSubscriptions: subs,
            user: req.session.username,
            username: req.session.user,
            rol: req.session.userrol,
            verifi: req.session.verifi,
            img: req.session.userimg
        });
    } catch (err) {
        console.error('Error al cargar la página principal:', err);
        res.status(500).send('Error interno del servidor');
    }
});


// Ruta para ver el canal de un creador
app.get('/canal/:nickname', (req, res) => {
    const { nickname } = req.params;

    // Consulta para obtener información del creador
    const queryCreador = `
        SELECT nickname, descripcion, avatar, banner,redes_sociales, suscriptores, videos_subidos 
        FROM creadores 
        WHERE nickname = ?;
    `;

    // Consulta para obtener los videos del creador
    const queryVideos = `
        SELECT video_id, titulo, descripcion, vid,minea, vistas, likes, fecha_publicacion 
        FROM videos 
        WHERE creador_id = (SELECT creador_id FROM creadores WHERE nickname = ?)
        ORDER BY fecha_publicacion DESC;
    `;

    db.get(queryCreador, [nickname], (err, creador) => {
        if (err) {
            console.error('Error al obtener la información del creador:', err);
            return res.status(500).send('Error interno del servidor');
        }

        if (!creador) {
            return res.status(404).send('Creador no encontrado');
        }

        db.all(queryVideos, [nickname], (err, videos) => {
            if (err) {
                console.error('Error al obtener los videos:', err);
                return res.status(500).send('Error interno del servidor');
            }

            res.render('prfintel/index', { creador, videos });
        });
    });
});

// Ruta para registrar un nuevo creador
app.get('/reg-creador', isLoggedIn, (req, res) => {
    res.render('createpf/index', {
        userid: req.session.userId,
        user: req.session.username,
        username: req.session.user,
        rol: req.session.userrol,
        verifi: req.session.verifi,
        img: req.session.userimg
    });
});
const storages = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'avatar') {
            cb(null, './src/creators/fp/'); // Carpeta para avatares
        } else if (file.fieldname === 'banner') {
            cb(null, './src/creators/banner/'); // Carpeta para banners
        } else {
            cb(new Error('Campo no permitido'), null);
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Nombre único
    },
});
const uploads = multer({ storages });

// Ruta para guardar datos

app.post(
    '/guardarCreador',
    uploads.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'banner', maxCount: 1 },
    ]),
    (req, res) => {
        try {
            // console.log('Archivos:', req.files);
            // console.log('Cuerpo:', req.body);

            const { nickname, descripcion, redes_sociales } = req.body;
            const avatar = req.files.avatar ? req.files.avatar[0].filename : null;
            const banner = req.files.banner ? req.files.banner[0].filename : null;

            // Validación
            if (!nickname) {
                return res.status(400).json({ error: 'Nickname es obligatorio.' });
            }

            const usuario_id = 1;

            const checkNicknameQuery = `
                SELECT COUNT(*) AS count FROM creadores WHERE nickname = ?
            `;
            db.get(checkNicknameQuery, [nickname], (err, row) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).json({ error: 'Error al verificar el nickname.' });
                }

                if (row.count > 0) {
                    return res.status(400).json({ error: 'El nickname ya está en uso.' });
                }

                // Insertar nuevo creador
                const query = `
                    INSERT INTO creadores (
                        nickname, descripcion, avatar, banner, redes_sociales, usuario_id
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;
                const params = [
                    nickname,
                    descripcion || null,
                    avatar,
                    banner,
                    redes_sociales || '{}',
                    usuario_id,
                ];

                db.run(query, params, function (err) {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).json({ error: 'Error al guardar el creador.' });
                    }
                    res.status(201).json({ message: 'Creador registrado exitosamente', creador_id: this.lastID });
                });
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error inesperado.' });
        }
    }
);




// Ruta para reproducir un video con incremento de vistas y comentarios
app.get('/video/:id', async (req, res) => {
    const videoId = req.params.id;
    const usuarioId = req.session.userId;

    try {
        // Incrementar vistas del video
        await new Promise((resolve, reject) => {
            db.run(`UPDATE videos SET vistas = vistas + 1 WHERE video_id = ?`, [videoId], err => (err ? reject(err) : resolve()));
        });

        // Obtener detalles del video
        const video = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM videos WHERE video_id = ?`, [videoId], (err, row) => (err ? reject(err) : resolve(row)));
        });

        if (!video) return res.status(404).send('Video no encontrado');

        // Obtener comentarios
        const comments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT c.contenido, c.fecha_comentario, u.user AS usuario_nombre 
                 FROM comentarios c
                 JOIN usuarios u ON c.usuario_id = u.usuario_id
                 WHERE c.video_id = ?`,
                [videoId],
                (err, rows) => (err ? reject(err) : resolve(rows))
            );
        });

        // Obtener recomendaciones personalizadas
        const recommendedVideos = await getRecommendationsForUser(usuarioId);

        res.render('viewvd/index', {
            video,
            recommendedVideos,
            comments,
            userid: usuarioId,
            username: req.session.username,
            user: req.session.user,
            rol: req.session.userrol,
            verifi: req.session.verifi,
            img: req.session.userimg
        });
    } catch (err) {
        console.error('Error al cargar el video:', err);
        res.status(500).send('Error interno del servidor');
    }
});


// Rutas para manejar likes y dislikes
async function handleInteraction(req, res, type) {
    const videoId = req.params.id;
    const usuarioId = req.session.userId;

    if (!usuarioId) return res.status(401).send('Usuario no autenticado');

    const oppositeType = type === 'like' ? 'dislike' : 'like';

    try {
        // Verificar si el usuario ya dio la interacción opuesta
        const existingOpposite = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM interacciones WHERE usuario_id = ? AND video_id = ? AND tipo_interaccion = ?`, [usuarioId, videoId, oppositeType], (err, row) => (err ? reject(err) : resolve(row)));
        });

        if (existingOpposite) {
            await new Promise((resolve, reject) => {
                db.run(`DELETE FROM interacciones WHERE interaccion_id = ?`, [existingOpposite.interaccion_id], err => (err ? reject(err) : resolve()));
            });
        }

        // Verificar si el usuario ya ha dado la interacción actual
        const existingType = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM interacciones WHERE usuario_id = ? AND video_id = ? AND tipo_interaccion = ?`, [usuarioId, videoId, type], (err, row) => (err ? reject(err) : resolve(row)));
        });

        if (existingType) return res.status(400).send(`You already ${type}d this video.`);

        // Registrar la nueva interacción
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO interacciones (usuario_id, video_id, tipo_interaccion) VALUES (?, ?, ?)`, [usuarioId, videoId, type], err => (err ? reject(err) : resolve()));
        });

        // Actualizar el contador de interacciones en el video
        const column = type === 'like' ? 'likes' : 'dislikes';
        await new Promise((resolve, reject) => {
            db.run(`UPDATE videos SET ${column} = ${column} + 1 WHERE video_id = ?`, [videoId], err => (err ? reject(err) : resolve()));
        });

        // Refuerza las preferencias del usuario basándote en el like/dislike
        const video = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM videos WHERE video_id = ?`, [videoId], (err, row) => (err ? reject(err) : resolve(row)));
        });
        if (type === 'like') {
            await updateUserPreferencesOnInteraction(usuarioId, video);
        }

        res.status(200).send(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully.`);
    } catch (err) {
        console.error(`Error adding ${type}:`, err);
        res.status(500).send('Internal server error');
    }
}


app.post('/video/:id/like', (req, res) => handleInteraction(req, res, 'like'));
app.post('/video/:id/dislike', (req, res) => handleInteraction(req, res, 'dislike'));

// Ruta para registrar clics en un video
app.post('/video/:id/click', async (req, res) => {
    const videoId = req.params.id;

    try {
        await new Promise((resolve, reject) => {
            db.run(`UPDATE videos SET clics = clics + 1 WHERE video_id = ?`, [videoId], err => (err ? reject(err) : resolve()));
        });

        res.status(200).send('Clic registrado');
    } catch (err) {
        console.error('Error al registrar clic:', err);
        res.status(500).send('Error interno del servidor');
    }
});

app.post('/video/:id/comment', async (req, res) => {
    const videoId = req.params.id;
    const { comentario } = req.body;
    const usuarioId = req.session.userId;
  
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }
  
    if (!comentario || comentario.trim() === "") {
      return res.status(400).json({ error: "El comentario no puede estar vacío" });
    }
  
    try {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO comentarios (video_id, usuario_id, contenido, fecha_comentario) 
           VALUES (?, ?, ?, datetime('now'))`,
          [videoId, usuarioId, comentario],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      db.run(
        `UPDATE videos SET comentarios = comentarios + 1 WHERE video_id = ?`,
        [videoId, usuarioId, comentario],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );

      res.status(200).json({
        mensaje: "Comentario registrado",
        usuario_nombre: req.session.username || "Anónimo",
        contenido: comentario,
      });
    } catch (err) {
      console.error("Error al registrar comentario:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  app.post('/suscripciones', (req, res) => {
    const { usuario_id, creador_id } = req.body;
    const query = `
        INSERT INTO suscripciones (usuario_id, creador_id) VALUES (?, ?)
    `;
    db.run(query, [usuario_id, creador_id], function (err) {
        if (err) {
            console.error('Error al suscribirse:', err);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        res.json({ message: 'Suscripción exitosa.', suscripcion_id: this.lastID });
    });
});

// Obtener suscripciones por usuario
app.get('/suscripciones/usuario/:usuario_id', (req, res) => {
    const { usuario_id } = req.params;
    const query = `
        SELECT c.* 
        FROM suscripciones s 
        JOIN creadores c ON s.creador_id = c.creador_id 
        WHERE s.usuario_id = ?
    `;
    db.all(query, [usuario_id], (err, rows) => {
        if (err) {
            console.error('Error al obtener suscripciones:', err);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        res.json(rows);
    });
});

  app.post('/subscribe', async (req, res) => {
    const {  creador_id } = req.body;
    const usuario_id = req.session.userId;
    const query = `
        INSERT INTO suscripciones (usuario_id, creador_id) VALUES (?, ?)
    `;
    db.run(query, [usuario_id, creador_id], function (err) {
        if (err) {
            console.error('Error al suscribirse:', err);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        res.json({ message: 'Suscripción exitosa.', suscripcion_id: this.lastID });
    });
});
app.get('/recomendaciones/:usuarioId', (req, res) => {
    const usuarioId = req.params.usuarioId;

    db.all(
        `
        SELECT videos.video_id, videos.titulo, videos.descripcion, recomendaciones.puntaje 
        FROM recomendaciones
        INNER JOIN videos ON recomendaciones.video_id = videos.video_id
        WHERE recomendaciones.usuario_id = ?
        ORDER BY recomendaciones.puntaje DESC
        LIMIT 10`,
        [usuarioId],
        (err, videos) => {
            if (err) {
                console.error('Error al obtener recomendaciones:', err);
                res.status(500).send('Error interno del servidor');
                return;
            }

            // Renderiza la vista pasando los videos obtenidos
            res.render('recomendaciones', { videos });
        }
    );
});
ffmpeg.setFfmpegPath(ffmpegPath);

// Configuración de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'videoFile') {
            cb(null, './src/vid/videos/');
        } else if (file.fieldname === 'thumbnailFile') {
            cb(null, './src/vid/min/');
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Ruta para manejar la carga y optimización
app.post('/upload', upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnailFile', maxCount: 1 }
]), (req, res) => {
    const { titulo, descripcion, categoria, tags } = req.body;
    const videoFile = req.files['videoFile']?.[0];
    const thumbnailFile = req.files['thumbnailFile']?.[0];

    if (!videoFile || !thumbnailFile) {
        return res.status(400).send('Error: Se deben cargar tanto el archivo de video como la miniatura.');
    }

    const originalVideoPath = videoFile.path;
    const optimizedVideoPath = path.join('./src/vid/videos/', `${Date.now()}-optimized.mp4`);

    const videoFileName = path.basename(optimizedVideoPath);
    const thumbnailFileName = path.basename(thumbnailFile.path);

    ffmpeg(originalVideoPath)
        .output(optimizedVideoPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-crf 23', '-preset veryfast', '-b:a 128k'])
        .on('end', () => {
            console.log('Conversión completada.');

            const userid = req.session.userId;

            // Obtener el nombre del usuario desde la tabla 'usuarios'
            db.get(`SELECT nombre FROM usuarios WHERE usuario_id = ?`, [userid], (err, row) => {
                if (err) {
                    console.error('Error al obtener el nombre del usuario:', err);
                    return res.status(500).send('Error al obtener el nombre del usuario.');
                }
                if (!row) {
                    return res.status(404).send('No se encontró el perfil del usuario.');
                }

                const username = row.nombre || 'Anónimo'; // Si no hay nombre, se usa 'Anónimo'

                // Obtener el creador_id del usuario
                db.get(`SELECT creador_id FROM creadores WHERE usuario_id = ?`, [userid], (err, row) => {
                    if (err) {
                        console.error('Error al obtener el creador_id:', err);
                        return res.status(500).send('Error al obtener el ID del creador.');
                    }
                    if (!row) {
                        return res.status(404).send('No se encontró el canal para el usuario.');
                    }

                    const creadorId = row.creador_id;

                    // Guardar datos en la base de datos
                    db.run(
                        `INSERT INTO videos (
                            titulo, descripcion, minea, vid, categoria, tags, idioma, fecha_publicacion, creador_id, clics, vistas, likes, comentarios, compartidos, trend_factor, usernick
                        ) VALUES (?, ?, ?, ?, ?, ?, 'es', datetime('now'), ?, 0, 0, 0, 0, 0, 0.0, ?)`,
                        [
                            titulo, descripcion, thumbnailFileName, videoFileName,
                            categoria, tags, creadorId, username
                        ],
                        function (err) {
                            if (err) {
                                console.error('Error al guardar el video:', err);
                                return res.status(500).send('Error al guardar el video.');
                            }

                            fs.unlink(originalVideoPath, (err) => {
                                if (err) console.error('Error al eliminar el archivo original:', err);
                            });

                            res.redirect('/'); // Redirige al usuario a la página principal
                        }
                    );
                });
            });
        })
        .on('error', (err) => {
            console.error('Error durante la conversión:', err);
            res.status(500).send('Error durante la conversión del video.');
        })
        .run();
});

app.get('/upload', (req, res) => {
    res.render('upload/index');
}); 
/*------------------------------------------Register-login----------------------*/
app.get("/auth/register-login", (req, res) => {
    res.render("login/index");
});

app.post('/auth/register', async (req, res) => {
    const { fullname, email, username, password, confirmpassword,pais } = req.body;

    if (password !== confirmpassword) {
        return res.redirect('/errorlogreg?error=7');
    }

    try {
        db.get('SELECT usuario_id FROM usuarios WHERE nombre = ? OR correo = ?', [username, email], async (err, existingUser) => {
            if (err) {
                console.error('Error al verificar el usuario:', err.message);
                return res.redirect('/error');
            }

            if (existingUser) {
                return res.redirect('/errorlogreg?error=reg-urp');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const rol = req.body.rol || 'user';
            const verificationToken = crypto.randomBytes(16).toString('hex');

            db.run(
                `INSERT INTO usuarios (nombre, correo, contraseña, user,pais,  verification_token, correo_validado) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [fullname, email, hashedPassword, username,pais, verificationToken, 0],
                function (err) {
                    if (err) {
                        console.error('Error al registrar el usuario:', err.message);
                        return res.redirect('/error');
                    }

                    // Enviar correo de verificación
                    sendVerificationEmail(fullname, email, verificationToken);

                    req.session.userId = this.lastID;
                    req.session.username = fullname;
                    req.session.user = username;
                    req.session.userrol = rol;
                    req.session.verifi = 0;
                    req.session.userimg = null;

                    res.redirect('/');
                }
            );
        });
    } catch (err) {
        console.error('Error general al registrar el usuario:', err.message);
        res.redirect('/error');
    }
});
app.get('/auth/verify-email', (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.render('verifi/index', { status: 'error', message: 'Token no proporcionado.' });
    }

    db.get('SELECT * FROM usuarios WHERE verification_token = ?', [token], (err, user) => {
        if (err || !user) {
            return res.render('verifi/index', { status: 'error', message: 'Token inválido o ya usado.' });
        }

        db.run('UPDATE usuarios SET correo_validado = 1, verification_token = NULL WHERE usuario_id = ?', [user.id], (err) => {
            if (err) {
                console.error('Error al verificar el correo:', err.message);
                return res.render('verifi/index', { status: 'error', message: 'Error al verificar el correo.' });
            }
            req.session.verifi = 1;

            res.render('verifi/index', { status: 'success', message: 'Correo verificado con éxito.' });
        });
    });
});

app.post('/auth/loginc', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM usuarios WHERE user = ? OR correo = ?', [username], async (err, user) => {
        if (err) {
            console.error('Error al buscar el usuario:', err.message);
            return res.redirect('/errorlogreg?error=4');
        }

        if (user) {
            const passwordMatch = await bcrypt.compare(password, user.contraseña);
            if (passwordMatch) {
                req.session.userId = user.usuario_id;
                req.session.username = user.username;
                req.session.user = user.nombre;

                req.session.userrol = user.rol;
                req.session.verifi = user.correo_validado;
                req.session.userimg = user.img;

                return res.redirect('/');
            } else {
                return res.redirect('/errorlogreg?error=login-failed');
            }
        } else {
            return res.redirect('/errorlogreg?error=login-failed');
        }
    });
});
app.post('/auth/forgot-pass', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.render('forgot/forgot-password', { error: 'Por favor, ingresa un correo válido.' });
    }
    
    db.get('SELECT * FROM usuarios WHERE correo = ?', [email], (err, user) => {
        if (err) {
            console.error('Error al buscar el usuario:', err.message);
            return res.render('forgot/forgot-password', { error: 'Error en la base de datos.' });
        }

        if (!user) {
            return res.render('forgot/forgot-password', { error: 'Correo no encontrado.' });
        }

        // Generar un token único y seguro
        const token = crypto.randomBytes(32).toString('hex');
        const expiration = Date.now() + 3600000; // Token válido por 1 hora

        // Guardar token y tiempo de expiración en la base de datos
        db.run('UPDATE usuarios SET reset_token = ?, reset_expiration = ? WHERE correo = ?', [token, expiration, email], (err) => {
            if (err) {
                console.error('Error al guardar el token en la base de datos:', err.message);
                return res.render('forgot/forgot-password', { error: 'Error en la base de datos.' });
            }

            const resetUrl = `http://${HOST}:${PORT}/auth/resetp?token=${token}`;

            // Opciones de correo
            const mailOptions = {
                from: EMAIL_USER,
                to: email,
                subject: 'Recuperación de contraseña - KinglyFenix Studios',
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0d1b2a; padding: 40px; text-align: center; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); max-width: 600px; margin: 0 auto;">
                        <div style="width: 100%; text-align: center; margin-bottom: 20px;">
                            <img src="https://media.discordapp.net/attachments/1171998042581389395/1314804461872611349/zypherr.png?ex=67551a93&is=6753c913&hm=f981d5ad83dcac175453c476b8c1c992656343aee7c1ac44d3a16689496f21ca&=&format=webp&quality=lossless&width=468&height=468" alt="Logo" style="max-width: 150px; border-radius: 50%;">
                        </div>
                        <h2 style="font-family: 'Cinzel', serif; color: #ffffff; margin-bottom: 20px;">Recuperación de contraseña</h2>
                        <p style="color: #e0e0e0; line-height: 1.6;">Haz clic en el botón a continuación para restablecer tu contraseña:</p>
                        <a href="${resetUrl}" style="display: inline-block; padding: 15px 30px; background-color: #1c3d5a; color: white; text-decoration: none; border-radius: 30px; font-size: 1.1em; margin: 20px auto; transition: background-color 0.3s ease; cursor: pointer;">
                            Restablecer contraseña
                        </a>
                        <p style="color: #e0e0e0; line-height: 1.6;">Si no solicitaste este correo, ignóralo.</p>
                        <p style="font-size: 12px; color: #bdc3c7; margin-top: 30px;">© 2024 KinglyFenix Studios</p>
                    </div>
                `
            };

            // Enviar el correo
            transporter.sendMail(mailOptions, (error) => {
                if (error) {
                    console.error('Error al enviar el correo:', error);
                    return res.render('forgot/forgot-password', { error: 'Error al enviar el correo.' });
                }

                return res.render('forgot/forgot-confirmation', { message: 'Correo enviado. Revisa tu bandeja de entrada.' });
            });
        });
    });
});

function sendVerificationEmail(fullname, email, token) {
    const verificationUrl = `http://${HOST}:${PORT}/auth/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verifica tu cuenta - Zypher',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #0000ff, #ff0000); text-align: center; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5); max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 20px;">
                    <img src="https://media.discordapp.net/attachments/1171998042581389395/1314804461872611349/zypherr.png?ex=67551a93&is=6753c913&hm=f981d5ad83dcac175453c476b8c1c992656343aee7c1ac44d3a16689496f21ca&=&format=webp&quality=lossless&width=468&height=468" alt="Logo" style="max-width: 150px;">
                </div>
                <h2 style="font-family: 'Cinzel', serif; color: #ffffff; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);">¡Bienvenido, ${fullname}!</h2>
                <p style="color: #e0e0e0;">Gracias por registrarte en Zypher. Haz clic en el botón para verificar tu cuenta:</p>
                <a href="${verificationUrl}" style="padding: 15px 30px; background-color: #4a90e2; color: white; text-decoration: none; border-radius: 30px; display: inline-block; margin-top: 20px;">Verificar correo</a>
                <p style="color: #e0e0e0; margin-top: 20px;">Si no solicitaste este registro, puedes ignorar este correo.</p>
                <p style="color: #e0e0e0;">Saludos,<br>Equipo de KinglyFenix Studios</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            console.error('Error al enviar el correo de verificación:', error);
        }
    });
}
app.get('/auth/resetp', (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.render('reset/reset-password', { error: 'Token no válido o expirado', token: null });
    }

    // Verificar si el token es válido y no ha expirado
    db.get('SELECT * FROM Usuarios WHERE reset_token = ? AND reset_expiration > ?', [token, Date.now()], (err, user) => {
        if (err || !user) {
            return res.render('reset/reset-password', { error: 'Token no válido o expirado', token: null });
        }

        res.render('reset/reset-password', { token });
    });
});
/*------------------------------------------ ruta errores--------------------*/
app.get("/error", (req, res) => {
    res.render("error/index");
});
app.get("/Zypher/support", (req, res) => {
    res.render("sp/index");
});
app.get("/Zypher/support/ticket", (req, res) => {
    res.render("sp/ticket");
});
app.get("/Zypher/support/mail", (req, res) => {
    res.render("sp/mailto");
});
app.get("/Zypher/support/faq", (req, res) => {
    res.render("sp/faq");
});
app.get("/Zypher/support/chat", (req, res) => {
    res.render("sp/chat");
});
app.get("/Zypher/support", (req, res) => {
    res.render("sp/index");
});
app.get("/Zypher/info", (req, res) => {
    res.render("qs/info");
});
app.get("/Zypher/blog", (req, res) => {
    res.render("qs/blog");
});
app.get("/Zypher/tc", (req, res) => {
    res.render("qs/tc");
});
app.get("/Zypher/wiki", (req, res) => {
    res.render("qs/index");
});
app.get("/ntf", (req, res) => {
    res.render("nofications/creator");
});
app.get('/errorlogreg', (req, res) => {
    res.render('errorlogreg/index');
});
// Rutas estáticas
app.use("/asdf", express.static(path.join(__dirname, "./src/css")));
app.use("/asdf2", express.static(path.join(__dirname, "./src/js")));
app.use("/esaw", express.static(path.join(__dirname, "./src/img")));
app.use("/creator/banners", express.static(path.join(__dirname, "./src/creators/banner")));
app.use("/creator/fp", express.static(path.join(__dirname, "./src/creators/fp")));

app.use("/vid", express.static(path.join(__dirname, "./src/vid")));
app.use("/vid/min", express.static(path.join(__dirname, "./src/vid/min")));

// Servidor escuchando
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});