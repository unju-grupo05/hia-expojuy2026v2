const Usuario = require('../models/usuario.model');
const HistorialAcceso = require('../models/historialAcceso.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../middlewares/auth.middleware');
const { Op } = require('sequelize'); // Importar Op para consultas OR

const usuarioCtrl = {};

const registrarIntentoAcceso = async (req, resultado, usuario, emailIntentado = null) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    return HistorialAcceso.create({
        resultado,
        usuario_id: usuario ? usuario.legajo : null,
        ip,
        userAgent,
        emailIntentado: emailIntentado || null
    });
};

// Crear Usuario (ideal para registrar al primer administrador o a los usuarios del sistema)
usuarioCtrl.registrarUsuario = async (req, res) => {
    /*
        #swagger.tags = ['Usuarios']
        #swagger.summary = 'Registrar un nuevo usuario (requiere admin)'
        #swagger.description = 'Crea un nuevo usuario en el sistema. Debe ser admin.'
        #swagger.consumes = ['application/json']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Datos del nuevo usuario.',
            required: true,
            schema: { $ref: '#/definitions/Usuario' }
        }
        #swagger.responses[201] = { description: 'Usuario creado exitosamente.' }
        #swagger.responses[400] = { description: 'El usuario ya existe.' }
    */
    try {
        const { legajo, dni, correo, nombre, apellido, password, rol } = req.body;

        // Verificar si el usuario ya existe por legajo o correo
        const existe = await Usuario.findOne({
            where: {
                [Op.or]: [
                    { legajo: legajo },
                    { correo: correo }
                ]
            }
        });

        if (existe) {
            return res.status(400).json({ msg: 'El usuario con ese legajo o correo ya existe.' });
        }

        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear el usuario con la contraseña cifrada
        const nuevoUsuario = await Usuario.create({
            legajo,
            dni,
            correo,
            nombre,
            apellido,
            password: hashedPassword,
        });

        req.auditId = nuevoUsuario.legajo;

        res.status(201).json({ msg: 'Usuario creado exitosamente', usuario: { legajo, dni, correo, nombre, apellido} });
    } catch (error) {
        res.status(500).json({ msg: 'Error al registrar usuario', error: error.message });
    }
};

// Login de Usuario
usuarioCtrl.login = async (req, res) => {
    /*
        #swagger.tags = ['Usuarios']
        #swagger.summary = 'Iniciar sesión'
        #swagger.description = 'Autentica a un usuario usando su correo o legajo, y su contraseña.'
        #swagger.consumes = ['application/json']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Credenciales del usuario.',
            required: true,
            schema: { 
                identificador: 'juan@example.com',
                password: 'password123'
            }
        }
        #swagger.responses[200] = { description: 'Login exitoso, devuelve el token JWT.' }
        #swagger.responses[401] = { description: 'Contraseña incorrecta.' }
        #swagger.responses[404] = { description: 'Usuario no encontrado.' }
    */
    try {
        // En el frontend pueden enviar un "identificador" (que sea el correo o el legajo)
        const { identificador, password } = req.body;

        if (!identificador || !password) {
            return res.status(400).json({ msg: 'Por favor, ingrese su identificador (correo o legajo) y su contraseña' });
        }

        // Buscar el usuario por legajo o correo
        const usuario = await Usuario.findOne({
            where: {
                [Op.or]: [
                    { legajo: identificador },
                    { correo: identificador }
                ]
            }
        });

        if (!usuario) {
            await registrarIntentoAcceso(req, 'fallido', null, identificador);
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Comparar contraseñas
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            await registrarIntentoAcceso(req, 'fallido', usuario, null);
            return res.status(401).json({ msg: 'Contraseña incorrecta' });
        }

        // Generar JWT
        // En el payload guardamos información útil que no sea sensible
        const payload = {
            legajo: usuario.legajo,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            rol: usuario.rol
        };

        // El token expira en 6 horas por ejemplo
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '6h' });

        await registrarIntentoAcceso(req, 'exitoso', usuario, null);

        res.json({ msg: 'Login exitoso', token, usuario: payload });
    } catch (error) {
        res.status(500).json({ msg: 'Error al intentar iniciar sesión', error: error.message });
    }
};

// Login Verificacion Correo
usuarioCtrl.loginVerificacion = async (req, res) => {
    /*
        #swagger.tags = ['Usuarios']
        #swagger.summary = 'Verificar el login de un usuario'
        #swagger.description = 'Verifica la sesión mediante el correo.'
        #swagger.consumes = ['application/json']
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Correo del usuario a verificar.',
            required: true,
            schema: { correo: 'juan@example.com' }
        }
        #swagger.responses[200] = { description: 'Login verificado con éxito.' }
    */
    try {
        const { correo } = req.body;
        if (!correo) {
            return res.status(400).json({ msg: 'Correo no proporcionado' });
        }
        //Verifica si el usuario existe en la base de datos
        const usuario = await Usuario.findOne({
            where: {
                correo: correo
            }
        });
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        //Crea el payload con la información del usuario
        const payload = {
            legajo: usuario.legajo,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            rol: usuario.rol
        };
        //Genera el token   
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '6h' });
        //Devuelve el token y la informacion del usuario
        res.json({ msg: 'Login exitoso', token, usuario: payload });
    } catch (error) {
        res.status(500).json({ msg: 'Error al intentar iniciar sesión', error: error.message });
    }
};
module.exports = usuarioCtrl;
