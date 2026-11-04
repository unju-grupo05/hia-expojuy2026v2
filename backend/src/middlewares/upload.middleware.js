const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 1. Configuración de almacenamiento en memoria para evitar escribir temporales no procesados
const storage = multer.memoryStorage();

const UPLOADS_DIR = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(__dirname, '../../uploads');

// Lista blanca de tipos MIME y extensiones de imágenes permitidas
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|avif)$/i;

// 2. Filtro estricto de seguridad para rechazar ejecutables, SVGs o archivos peligrosos
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const isExtValid = ALLOWED_EXTENSIONS.test(ext);

    if (isMimeValid && isExtValid) {
        cb(null, true);
    } else {
        const error = new Error('INVALID_FILE_TYPE');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

// 3. Instancia de Multer configurada con límite de 5MB
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    },
    fileFilter
});

const uploadSingleImage = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'El archivo excede el tamaño máximo permitido de 5MB.'
                });
            }
            return res.status(400).json({
                success: false,
                message: `Error al subir el archivo: ${err.message}`
            });
        } else if (err) {
            if (err.code === 'INVALID_FILE_TYPE' || err.message === 'INVALID_FILE_TYPE') {
                return res.status(400).json({
                    success: false,
                    message: 'Formato no permitido. Solo se admiten imágenes válidas (JPEG, PNG, WebP o AVIF).'
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message || 'Error en la subida del archivo.'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se ha proporcionado ninguna imagen para subir.'
            });
        }

        if (req.files.length > 1) {
            return res.status(400).json({
                success: false,
                message: 'Solo se permite subir una imagen por solicitud.'
            });
        }

        // Asignamos el archivo a req.file para el siguiente paso del pipeline
        req.file = req.files[0];
        next();
    });
};

/**
 * Fábrica del pipeline de optimización con Sharp.
 * - Valida integridad del buffer de imagen.
 * - Auto-rota según EXIF antes de descartarlo.
 * - Redimensiona preservando proporciones (máx `maxDimension`px, sin agrandar si es menor).
 * - Convierte a WebP con compresión balanceada (`quality`, `effort`).
 * - Descarta metadatos EXIF por privacidad y ahorro de peso.
 * - Guarda en disco y propaga metadatos a `req.processedFile`.
 *
 * @param {object} options
 * @param {number} options.maxDimension Lado máximo en píxeles del cuadro de salida.
 * @param {number} [options.quality] Calidad WebP (0-100).
 * @param {string} [options.filePrefix] Prefijo del nombre de archivo generado en `uploads/`.
 */
const createWebpProcessor = ({ maxDimension, quality = 80, filePrefix = '' }) => {
    return async (req, res, next) => {
        try {
            if (!req.file || !req.file.buffer) {
                return res.status(400).json({
                    success: false,
                    message: 'No se encontró el buffer de la imagen para procesar.'
                });
            }

            // 1. Validar que libvips/sharp pueda decodificar la imagen
            const sharpInstance = sharp(req.file.buffer);
            const metadata = await sharpInstance.metadata();

            if (!metadata || !metadata.format) {
                return res.status(400).json({
                    success: false,
                    message: 'El archivo recibido está corrupto o no es una imagen válida.'
                });
            }

            // 2. Generar UUID criptográfico único y nombre de archivo .webp
            const id = crypto.randomUUID();
            const filename = `${filePrefix}${id}.webp`;
            const uploadDir = UPLOADS_DIR;

            // Asegurar que el directorio de uploads exista
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, filename);

            // 3. Ejecutar pipeline de transformación y guardado
            // Al no llamar a .withMetadata(), Sharp descarta automáticamente los tags EXIF/GPS
            const info = await sharp(req.file.buffer)
                .rotate() // Auto-orientación según datos de cámara antes de descartar EXIF
                .resize({
                    width: maxDimension,
                    height: maxDimension,
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .webp({
                    quality,
                    effort: 4
                })
                .toFile(filePath);

            // 4. Inyectar datos del archivo procesado en la petición
            req.processedFile = {
                id,
                originalName: req.file.originalname,
                filename,
                url: `/uploads/${filename}`,
                path: filePath,
                mimeType: 'image/webp',
                sizeBytes: info.size,
                format: 'webp',
                width: info.width,
                height: info.height
            };

            next();
        } catch (error) {
            console.error('Error en el pipeline de optimización Sharp:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno al procesar y convertir la imagen a WebP.',
                error: error.message
            });
        }
    };
};

const optimizeToWebp = createWebpProcessor({ maxDimension: 1920, quality: 80 });

const optimizeLogoToWebp = createWebpProcessor({ maxDimension: 150, quality: 80, filePrefix: 'logo-' });

module.exports = {
    uploadSingleImage,
    optimizeToWebp,
    optimizeLogoToWebp
};
