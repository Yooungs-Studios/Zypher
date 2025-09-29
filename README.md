# Zyper

Zyper es una plataforma avanzada para la gestión, recomendación y reproducción de contenido multimedia, desarrollada por KinglyFenix Studios. El sistema está diseñado para creadores y usuarios, integrando algoritmos inteligentes de recomendación, seguridad y personalización. **No se permite la colaboración externa en este repositorio.**

## Características Principales

- **Recomendaciones Inteligentes:** Algoritmos como ClickRec+, SubRec+, TasteRec+, EngageRec y RandRec+ priorizan videos según clics, vistas, suscripciones, participación y descubrimiento, usando datos de interacción y preferencias de usuario.
- **TrendFactor:** Sistema de puntuación dinámica que evalúa la popularidad y relevancia de los videos en tiempo real, recalculando automáticamente cada hora.
- **Gestión de Creadores:** Registro, administración de canales, suscriptores, videos subidos, avatares y banners.
- **Blog y Categorías:** Sección de blog con artículos, categorías y posts recientes, permitiendo a los usuarios explorar contenido temático.
- **Privacidad y Seguridad:** Protocolos de encriptación y políticas estrictas para proteger los datos personales y la actividad de los usuarios.
- **Paneles y Vistas:** Interfaz moderna con vistas para inicio, tendencias, login, registro, soporte, wiki, detalles técnicos y más.
- **Notificaciones y Suscripciones:** Sistema de notificaciones y gestión de suscripciones a canales y contenido.
- **Carga y Optimización de Videos:** Soporte para carga de videos y miniaturas, optimización automática usando ffmpeg.

## Estructura del Proyecto

- `index.js`, `newIndex.js`: Servidor principal Express, rutas, lógica de negocio y conexión a la base de datos.
- `database.js`, `newdatabase.js`: Manejo de base de datos SQLite.
- `notifications.js`: Sistema de notificaciones.
- `prefsis.js`: Preferencias del sistema.
- `recomendaciones.js`: Lógica de recomendaciones.
- `recomendalg/`: Algoritmos de recomendación y actualización de preferencias.
  - `recommendations.js`, `updateTrendFactor.js`, `updateUserPreferences.js`, `userPreferences.js`
- `src/`: Recursos estáticos y vistas EJS.
  - `creators/`: Imágenes y recursos para creadores.
  - `css/`: Hojas de estilo para diferentes módulos.
  - `img/`: Iconos y logos.
  - `js/`: Scripts JavaScript organizados por módulo.
  - `vid/`: Videos y recursos multimedia.
  - `views/`: Vistas EJS para las diferentes secciones de la plataforma (inicio, blog, wiki, soporte, detalles de algoritmos, login, registro, etc.).

## Algoritmos de Recomendación

- **ClickRec+:** Prioriza videos populares considerando clics, vistas, tendencias y relevancia personalizada.
- **SubRec+:** Resalta contenido relevante de canales suscritos, priorizando actividad reciente y popularidad.
- **TasteRec+:** Filtrado colaborativo para sugerir contenido disfrutado por usuarios con gustos similares.
- **EngageRec:** Promueve videos con alta participación (comentarios, compartidos, etc.).
- **RandRec+:** Sugerencias aleatorias con filtros para descubrir nuevo contenido relevante.
- **TrendFactor:** Calcula un puntaje dinámico para cada video, considerando vistas, likes, dislikes, clics, compartidos y comentarios, ajustado por el tiempo desde la publicación.



## Base de Datos

El proyecto utiliza archivos SQLite (`Zypher.db`, `Zypherss.db`) para almacenar datos de usuarios, preferencias, recomendaciones, blogs y categorías.

## Vistas y Módulos

- **Inicio:** Videos en tendencia y recomendaciones personalizadas.
- **Canal de Creador:** Información, suscriptores, videos y redes sociales.
- **Blog:** Artículos, categorías y posts recientes.
- **Wiki:** Transparencia, algoritmos, misión, historia y detalles técnicos.
- **Soporte:** FAQ, tickets, chat y contacto.
- **Login/Registro:** Autenticación, verificación por correo y recuperación de contraseña.
- **Carga de Videos:** Optimización y almacenamiento seguro de archivos multimedia.
- **Paneles de Usuario y Creador:** Configuración, preferencias y gestión de contenido.

## Licencia

Este proyecto está bajo la licencia MIT.
