const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;
const MIN_SECRET_LENGTH = 32;

if (typeof SECRET_KEY !== 'string' || SECRET_KEY.trim() === '') {
    throw new Error(
        '[auth.middleware] Falta la variable de entorno JWT_SECRET. ' +
        'Generá una clave de al menos 32 caracteres (por ejemplo con `openssl rand -hex 32`) ' +
        'y definíla en ".env". No se arrancar con una clave por defecto.'
    );
}

if (SECRET_KEY.length < MIN_SECRET_LENGTH) {
    throw new Error(
        `[auth.middleware] JWT_SECRET es demasiado corta (mínimo ${MIN_SECRET_LENGTH} caracteres). ` +
        'Generá una clave criptográficamente aleatoria con `openssl rand -hex 32`.'
    );
}

// Middleware para verificar si el usuario es administrador
const verificarRole = (req, res, next) => {
    // 1. Obtener el token del header (formato: "Bearer <token>")
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ msg: 'Acceso denegado. No se proporcionó un token.' });
    }

    // Extraemos el token omitiendo la palabra "Bearer"
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ msg: 'Formato de token inválido.' });
    }

    try {
        // 2. Verificar la validez del token
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuario = decoded;

        // 3. Verificar si el usuario tiene rol de admin
        if (req.usuario.rol === 'admin') {
            return next();
        }

        return res.status(403).json({ msg: 'Acceso prohibido. Se requieren permisos de administrador.' });

    } catch (error) {
        return res.status(401).json({ msg: 'Token inválido o expirado.' });
    }
};

module.exports = {
    SECRET_KEY,
    verificarRole
};