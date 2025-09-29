const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const socketIo = require('socket.io');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');
const { updateUserPreferencesOnInteraction } = require('./recomendalg/updateUserPreferences');
const { getRecommendationsForUser, insertRecommendation, getStoredRecommendations } = require('./recomendalg/recommendations');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const http = require('http');
const { actualizarTrendFactor } = require('./recomendalg/updateTrendFactor');
actualizarTrendFactor();
setInterval(() => {
    console.log('Actualización periódica del trend_factor...');
    actualizarTrendFactor();
}, 3600000);
/*------------------------------ Variables inicio ------------------------------------------------*/
const app = express();
const PORT = 3000;
const HOST = "localhost"
const EMAIL_USER = process.env.EMAIL_USER || "assists.kinglyfenixstudios@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || 'juwh kxte urbt bnbr';
if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Faltan las credenciales de correo en el archivo .env');
}
const server = http.createServer(app);
const io = socketIo(server);
// Conexión a la base de datos
const db = new sqlite3.Database('Zypher.db', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log("Conexión exitosa a la base de datos.");
    }
});
// Configuración de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'videoFile') {
            cb(null, './src/vid/videos/');
        } else if (file.fieldname === 'thumbnailFile') {
            cb(null, './src/vid/min/');
        }else   if (file.fieldname === 'avatar') {
            cb(null, './src/creators/fp/');
        } else if (file.fieldname === 'banner') {
            cb(null, './src/creators/banner/');
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
// coneccion al mail
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
app.get('/', async (req, res) => {
    try {
        const usuarioId = req.session.userId;

        // Obtener videos en tendencia con información del creador
        const trendingVideos = await new Promise((resolve, reject) => {
            db.all(
                `SELECT *
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

        // Obtener videos aleatorios
        const randomVideos = await new Promise((resolve, reject) => {
            db.all(
                `SELECT *
                 FROM videos
                 JOIN creadores ON videos.creador_id = creadores.creador_id
                 ORDER BY RANDOM()
                 LIMIT 10`,
                [],
                (err, rows) => (err ? reject(err) : resolve(rows))
            );
        });

        const subs = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM suscripciones WHERE usuario_id = ?`, [usuarioId],
                (err, rows) => (err ? reject(err) : resolve(rows))
            );
        });

        res.render('home/index', {
            trendingVideos,
            recommendedVideos,
            randomVideos,
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
/*--------------------------Rutas y post creador-------------------*/
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

app.post('/guardarCreador', upload.fields([{ name: 'avatar' }, { name: 'banner' }]), (req, res) => {
    const { nickname, descripcion, redes_sociales, id  } = req.body;
    const avatar =  req.files['avatar']?.[0]
    const banner = req.files['banner']?.[0];
    const bannerName = path.basename(banner.path);
    const avatarName = path.basename(avatar.path);
    if (!nickname) {
        return res.status(400).json({ error: 'Nickname es obligatorio.' });
    }
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
   // const creatorToken = generateToken();
    const creatorToken = "asdbjagfdk2374er8fhnu";

    const query = `
        INSERT INTO creadores (id,nickname, descripcion, avatar, banner, redes_sociales, token, usuario_id)
        VALUES (?,?, ?, ?, ?, ?,?,?)
    `;

    db.run(query, [id,nickname, descripcion, avatarName, bannerName, redes_sociales,creatorToken,req.session.userId], function (err) {
        if (err) {
            console.error('Error al insertar en la base de datos:', err.message);
            res.status(500).json({ error: 'Error al guardar el creador' });
        } else {
            // console.log('Creador guardado con éxito, ID:', this.lastID);
            res.status(200).json({ message: 'Creador guardado con éxito', creador_id: this.lastID });
        }
    });   
});
});
app.get('/dashboard', (req, res) => {
    const creatorId = 1; // Ejemplo de ID de creador; ajusta según tus necesidades

    // Consultar los datos necesarios para el dashboard
    db.get(`
        SELECT 
            creadores.suscriptores AS followers,
            SUM(videos.vistas) AS recentViews,
            creadores.ingresos_totales AS estimatedEarnings
        FROM creadores
        LEFT JOIN videos ON creadores.creador_id = videos.creador_id
        WHERE creadores.creador_id = ?
    `, [creatorId], (err, row) => {
        if (err) {
            console.error('Error al obtener los datos del dashboard:', err.message);
            return res.status(500).send('Error interno del servidor');
        }

        // Renderizar la vista con los datos obtenidos
        res.render('creators/dashboard', {
            followers: row.followers || 0,
            recentViews: row.recentViews || 0,
            estimatedEarnings: row.estimatedEarnings || 0
        });
    });
});
/*----------------------------Video y post-----------------------------*/
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
        // // Obtener comentarios uwu
        // const comments = await new Promise((resolve, reject) => {
        //     db.all(
        //         `SELECT *  FROM comentarios 
        //          WHERE comentarios.video_id = ?`,
        //         [videoId],
        //         (err, rows) => (err ? reject(err) : resolve(rows))
        //     );
        // });
        // Obtener recomendaciones personalizadas
        const recommendedVideos = await getRecommendationsForUser(usuarioId);
        res.render('viewvd/index', {
            video,
            recommendedVideos,
            // comments,
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
      return res.status(401).json({ error: "Ocupas iniciar seccion para poder comentar" });
    }
    if (!comentario || comentario.trim() === "") {
      return res.status(400).json({ error: "El comentario no puede estar vacío" });
    }
    try {
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO comentarios (video_id, usuario_id, contenido, fecha_comentario) 
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
    } catch (err) {
      console.error("Error al registrar comentario:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  app.get('/suscripciones/usuario/:usuario_id', (req, res) => {
    const { usuario_id } = req.params;
    const query = `SELECT c.* FROM suscripciones s JOIN creadores c ON s.creador_id = c.creador_id  WHERE s.usuario_id = ?
    `;
    db.all(query, [usuario_id], (err, rows) => {
        if (err) {
            console.error('Error al obtener suscripciones:', err);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        res.json(rows);
    });
});
  app.post('/suscripciones', (req, res) => {
    const { usuario_id, creador_id } = req.body;
    const query = `INSERT INTO suscripciones (usuario_id, creador_id) VALUES (?, ?)`;
    db.run(query, [usuario_id, creador_id], function (err) {
        if (err) {
            console.error('Error al suscribirse:', err);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        res.json({ message: 'Suscripción exitosa.', suscripcion_id: this.lastID });
    });
});
app.post('/subscribe', async (req, res) => {
    const {  creador_id } = req.body;
    const usuario_id = req.session.userId;
    const query = `INSERT INTO suscripciones (usuario_id, creador_id) VALUES (?, ?)    `;
    db.run(query, [usuario_id, creador_id], function (err) {
        if (err) {
            console.error('Error al suscribirse:', err);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        res.json({ message: 'Suscripción exitosa.', suscripcion_id: this.lastID });
    });
});
// Rutas para manejar likes y dislikes
async function handleInteraction(req, res, type) {
    const videoId = req.params.id;
    const usuarioId = req.session.userId;
    if (!usuarioId) return res.status(401).send('Ocupas inisiar seccion para ejecutar esta accion');
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
/*------------------------Upload vid---------------------------*/
app.get('/upload', async (req, res) => {
    try {
        // Realiza la consulta a la base de datos
        const blogs = await new Promise((resolve, reject) => {
            db.all(
                `SELECT creador_id FROM creadores WHERE usuario_id = ?`, 
                [req.session.userId]  , // Asegúrate de usar los parámetros correctos
                (err, rows) => (err ? reject(err) : resolve(rows))
            );
        });

        // Si no hay un perfil encontrado, redirige a una página de error o registro
        if (!blogs || blogs.length === 0) {
            return res.redirect('/reg-creador');
        }

        // Si hay un perfil, renderiza la página de subida
        res.render('upload/index');
    } catch (err) {
        console.error("Error al realizar la consulta:", err);
        // Si ocurre un error en la consulta, redirige a una página de error
        res.redirect('/errorlogreg?error=db-error');
    }
});

ffmpeg.setFfmpegPath(ffmpegPath);



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
                    db.get(`SELECT nickname FROM creadores WHERE creador_id = ?`, [creadorId], (err, row) => {
                        if (err) {
                            console.error('Error al obtener el nombre del usuario:', err);
                            return res.status(500).send('Error al obtener el nombre del usuario.');
                        }
                        if (!row) {
                            return res.status(404).send('No se encontró el perfil del usuario.');
                        }
                    // Guardar datos en la base de datos
                    db.run(
                        `INSERT INTO videos (
                        titulo, descripcion, minea, vid, categoria, tags, idioma, fecha_publicacion, creador_id, clics, vistas, likes, comentarios, compartidos, trend_factor
                        ) VALUES (?, ?, ?, ?, ?, ?, 'es', datetime('now'), ?, 0, 0, 0, 0, 0, 0.0)`,
                        [titulo, descripcion, thumbnailFileName, videoFileName,categoria, tags, creadorId],
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
/*------------------------------------------Register-login----------------------*/
app.get("/auth/register-login", (req, res) => {
    res.render("login/index");
});
app.post('/auth/register', async (req, res) => {
    const { fullname, email, password, confirmpassword,pais } = req.body;
    if (password !== confirmpassword) {
        return res.redirect('/errorlogreg?error=7');
    }
    try {
        db.get('SELECT usuario_id FROM usuarios WHERE nombre = ? OR correo = ?', [email], async (err, existingUser) => {
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
                `INSERT INTO usuarios (nombre, correo, contraseña,pais,verification_token, correo_validado) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [fullname, email, hashedPassword,pais, verificationToken, 0],
                function (err) {
                    if (err) {
                        console.error('Error al registrar el usuario:', err.message);
                        return res.redirect('/error');
                    }

                    // Enviar correo de verificación
                    sendVerificationEmail(fullname, email, verificationToken);

                    req.session.userId = this.lastID;
                    req.session.username = fullname;
                    req.session.userrol = rol;
                    req.session.verifi = 0;

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
    db.get('SELECT * FROM usuarios WHERE  correo = ?', [username], async (err, user) => {
        if (err) {
            console.error('Error al buscar el usuario:', err.message);
            return res.redirect('/errorlogreg?error=4');
        }
        if (user) {
            const passwordMatch = await bcrypt.compare(password, user.contraseña);
            if (passwordMatch) {
                req.session.userId = user.usuario_id;
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
                    </div>                `
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
            </div>        `
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
/*-----------------------------------------Ruta soporte---------------*/
app.get("/Zypher/blog/post/:id", async (req, res) => {
    const postId = req.params.id; // Captura el valor del parámetro de ruta
    
    // Obtener el post por su ID
    const post = await new Promise((resolve, reject) => {
        db.get(
            `SELECT p.*, a.username as autor, c.nombre as categoria
            FROM posts p
            JOIN autores a ON p.autor_id = a.autor_id
            JOIN categorias c ON p.categoria_id = c.categoria_id
            WHERE p.post_id = ?`, [postId], (err, row) => {
                if (err) reject(err);
                resolve(row);
            }
        );
    });

    if (!post) {
        return res.status(404).send("Post no encontrado");
    }
    const categorias = await new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM categorias`,(err, rows) => (err ? reject(err) : resolve(rows))
        );
    });
    res.render("qs/psi", { post,categorias });
});
app.get("/Zypher/blog/categoria/:id", async (req, res) => {
    const categoriaID = req.params.id; // Captura el valor del parámetro de ruta
    const blogs = await new Promise((resolve, reject) => {
        db.all(
            `  SELECT * FROM posts  JOIN autores ON posts.autor_id = autores.autor_i
        WHERE categoria_id = (SELECT categoria_id FROM categorias WHERE categoria_id = ?)`, [categoriaID],(err, rows) => (err ? reject(err) : resolve(rows))
        );
    });
    const categoria = await new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM categorias WHERE categoria_id = ?`, [categoriaID], (err, row) => {
                if (err) reject(err);
                resolve(row);
            }
        );
    });


    res.render("qs/cat",{blogs,categoria});
});
app.get("/Zypher/blog", async (req, res) => {
    const blogs = await new Promise((resolve, reject) => {
        db.all(
            `SELECT posts.*, autores.username, autores.avatar 
             FROM posts
             JOIN autores ON posts.autor_id = autores.autor_id`, // Join the posts table with the autores table
            (err, rows) => (err ? reject(err) : resolve(rows))
        );
    });
    const categorias = await new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM categorias`,(err, rows) => (err ? reject(err) : resolve(rows))
        );
    });


    res.render("qs/blog",{blogs,categorias});
});
/* */ 
app.get("/trending",async (req, res) => {
    const trendingVideos = await new Promise((resolve, reject) => {
        db.all(
            `SELECT videos.*, creadores.nickname AS channel_name
             FROM videos
             JOIN creadores ON videos.creador_id = creadores.creador_id
             ORDER BY videos.trend_factor DESC`,
            [],
            (err, rows) => (err ? reject(err) : resolve(rows))
        );
    });
    res.render("trending/trending",{trendingVideos,        userid: req.session.userId,
        user: req.session.username,
        username: req.session.user,
        rol: req.session.userrol,
        verifi: req.session.verifi,
        img: req.session.userimg});
});
/* */
app.get("/Zypher/support", (req, res) => {
    res.render("sp/index");
});
app.get("/Zypher/support/ticket", (req, res) => {
    res.render("sp/ticket");
});
app.get("/Zypher/support/mail", (req, res) => {
    res.render("sp/mailto");
});

// Ruta para el soporte - Ver la conversación
app.get("/Zypher/support/chat/:id", (req, res) => {
    const { id: conversationId } = req.params;
    res.render("sp/chat", { conversationId });
});

// Ruta para la vista del soporte - Ver el chat con el usuario
app.get("/Zypher/support/chat-support/:id", (req, res) => {
    const { id: conversationId } = req.params;
    res.render("sp/chatS", { conversationId });
});

// Ruta para empezar un nuevo chat
app.post('/start-chat', (req, res) => {
    // Crear una nueva conversación en la base de datos
    db.run('INSERT INTO conversations DEFAULT VALUES', function(err) {
      if (err) {
        console.error('Error al crear conversación:', err);
        return res.status(500).send('Error al crear conversación');
      }
      res.redirect(`/chat/${this.lastID}`);
    });
});

// Manejo de mensajes entre usuario y soporte
io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado');
  
    // Escuchar por nuevos mensajes del usuario
    socket.on('user_message', (conversationId, msg) => {
      // Guardar mensaje del usuario en la base de datos
      db.run('INSERT INTO messages (conversation_id, role, message) VALUES (?, ?, ?)', [conversationId, 'user', msg], function(err) {
        if (err) {
          console.error('Error al guardar mensaje del usuario:', err);
        }
      });
  
      // Emitir el mensaje al soporte
      io.to(conversationId).emit('new_message', { role: 'user', message: msg });
    });
  
    // Escuchar por mensajes del soporte
    socket.on('support_message', (conversationId, msg) => {
      // Guardar mensaje del soporte en la base de datos
      db.run('INSERT INTO messages (conversation_id, role, message) VALUES (?, ?, ?)', [conversationId, 'support', msg], function(err) {
        if (err) {
          console.error('Error al guardar mensaje del soporte:', err);
        }
      });
  
      // Emitir el mensaje al usuario
      io.to(conversationId).emit('new_message', { role: 'support', message: msg });
    });
  
    // Unirse a la sala de la conversación
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);  // Unir el socket a la sala de conversación específica
    });
  
    socket.on('disconnect', () => {
      console.log('Un usuario se ha desconectado');
    });
});
  
app.get("/Zypher/tc", (req, res) => {
    res.render("qs/tc");
});
app.get("/Zypher/wiki", (req, res) => {
    res.render("qs/index");
});
app.get("/Zypher/wiki/detalle-algoritmos", (req, res) => {
    res.render("qs/detalles");
});
app.get("/ntf", (req, res) => {
    res.render("nofications/creator");
});

/*------------------------------------------ ruta errores--------------------*/
app.get("/error", (req, res) => {
    res.render("error/index");
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
app.use("/vid", express.static(path.join(__dirname, "./src/vid/MID3")));
app.use("/vid/min", express.static(path.join(__dirname, "./src/vid/MIN2")));
// Servidor escuchando
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});