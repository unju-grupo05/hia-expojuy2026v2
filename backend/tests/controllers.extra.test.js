jest.mock('../config/database', () => require('./helpers/db-mock'));
jest.mock('../src/models/agenda.model', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
}));
jest.mock('../src/models/galeria.model', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
}));
jest.mock('../src/models/media.model', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
}));
jest.mock('../src/models/ubicacionStand.model', () => ({
    findAll: jest.fn(),
    findOne: jest.fn()
}));
jest.mock('../src/models/stand.model', () => ({
    findAll: jest.fn(),
    update: jest.fn()
}));
jest.mock('../src/models/noticia.model', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
}));
jest.mock('../src/models/eje.model', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
}));
jest.mock('../src/models/correo.model', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));
jest.mock('../src/models/usuario.model', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));
jest.mock('../src/models/historialAcceso.model', () => ({
    create: jest.fn().mockResolvedValue({})
}));
jest.mock('../src/models/expositor.model', () => ({
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
}));
jest.mock('../src/models', () => ({
    LogChatbot: {
        create: jest.fn(),
        findByPk: jest.fn(),
        count: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn()
    }
}));
jest.mock('../src/services/chatbot-search.service', () => ({
    sanitizarEntrada: jest.fn(),
    extraerPalabrasClave: jest.fn(),
    detectarIntencion: jest.fn(),
    detectarSeccion: jest.fn(),
    construirFicha: jest.fn(),
    buscarEnBase: jest.fn()
}));
jest.mock('../src/middlewares/auth.middleware', () => ({ SECRET_KEY: 'test-secret' }));
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn()
}));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(() => 'jwt-token') }));

const fs = require('fs');
const os = require('os');
const path = require('path');
const { UniqueConstraintError, ValidationError } = require('sequelize');

process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-extra-test-'));

const sequelize = require('../config/database');
const Agenda = require('../src/models/agenda.model');
const Galeria = require('../src/models/galeria.model');
const Media = require('../src/models/media.model');
const UbicacionStand = require('../src/models/ubicacionStand.model');
const Stand = require('../src/models/stand.model');
const Noticia = require('../src/models/noticia.model');
const Eje = require('../src/models/eje.model');
const Correo = require('../src/models/correo.model');
const Usuario = require('../src/models/usuario.model');
const HistorialAcceso = require('../src/models/historialAcceso.model');
const Expositor = require('../src/models/expositor.model');
const { LogChatbot } = require('../src/models');
const chatbotSearch = require('../src/services/chatbot-search.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const agendaCtrl = require('../src/controllers/agenda.controller');
const galeriaCtrl = require('../src/controllers/galeria.controller');
const mediaCtrl = require('../src/controllers/media.controller');
const ubicacionStandCtrl = require('../src/controllers/ubicacionStand.controller');
const noticiaCtrl = require('../src/controllers/noticia.controller');
const ejeCtrl = require('../src/controllers/eje.controller');
const correoCtrl = require('../src/controllers/correo.controller');
const usuarioCtrl = require('../src/controllers/usuario.controller');
const expositorCtrl = require('../src/controllers/expositor.controller');
const chatbotCtrl = require('../src/controllers/chatbot.controller');

function crearReq({ body = {}, params = {}, query = {}, headers = {}, processedFile } = {}) {
    return {
        body,
        params,
        query,
        headers,
        processedFile,
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' }
    };
}

function crearRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

function errorSequelize(Tipo, mensaje) {
    const error = Object.create(Tipo.prototype);
    error.message = mensaje;
    error.errors = [{ message: mensaje }];
    return error;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('agenda.controller', () => {
    it('obtiene la agenda sin filtro', async () => {
        Agenda.findAll.mockResolvedValue([{ id: 1 }]);
        const res = crearRes();

        await agendaCtrl.obtenerAgenda(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(Agenda.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('obtiene la agenda filtrando por día', async () => {
        Agenda.findAll.mockResolvedValue([]);
        const res = crearRes();

        await agendaCtrl.obtenerAgenda(crearReq({ query: { dia: 'Día 1' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(Agenda.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { dia: 'Día 1' } }));
    });

    it('devuelve 500 si falla la consulta de agenda', async () => {
        Agenda.findAll.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await agendaCtrl.obtenerAgenda(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 si la actividad no existe', async () => {
        Agenda.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await agendaCtrl.obtenerActividadPorId(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('devuelve la actividad encontrada', async () => {
        Agenda.findByPk.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await agendaCtrl.obtenerActividadPorId(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla obtener la actividad', async () => {
        Agenda.findByPk.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await agendaCtrl.obtenerActividadPorId(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rechaza crear actividad sin campos obligatorios', async () => {
        const res = crearRes();

        await agendaCtrl.crearActividad(crearReq({ body: { dia: 'Día 1' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(Agenda.create).not.toHaveBeenCalled();
    });

    it('crea una actividad', async () => {
        Agenda.create.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await agendaCtrl.crearActividad(crearReq({
            body: { dia: 'Día 1', horaInicio: '10:00', horaFin: '11:00', titulo: 'Charla' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devuelve 500 si falla crear la actividad', async () => {
        Agenda.create.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await agendaCtrl.crearActividad(crearReq({
            body: { dia: 'Día 1', horaInicio: '10:00', horaFin: '11:00', titulo: 'Charla' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al actualizar una actividad inexistente', async () => {
        Agenda.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await agendaCtrl.actualizarActividad(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('actualiza una actividad', async () => {
        const item = { update: jest.fn().mockResolvedValue(undefined) };
        Agenda.findByPk.mockResolvedValue(item);
        const res = crearRes();

        await agendaCtrl.actualizarActividad(crearReq({ params: { id: '1' }, body: { titulo: 'Nuevo' } }), res);

        expect(item.update).toHaveBeenCalledWith({ titulo: 'Nuevo' });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla actualizar la actividad', async () => {
        Agenda.findByPk.mockResolvedValue({ update: jest.fn().mockRejectedValue(new Error('db')) });
        const res = crearRes();

        await agendaCtrl.actualizarActividad(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al eliminar una actividad inexistente', async () => {
        Agenda.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await agendaCtrl.eliminarActividad(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('elimina una actividad', async () => {
        const item = { destroy: jest.fn().mockResolvedValue(undefined) };
        Agenda.findByPk.mockResolvedValue(item);
        const res = crearRes();

        await agendaCtrl.eliminarActividad(crearReq({ params: { id: '1' } }), res);

        expect(item.destroy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla eliminar la actividad', async () => {
        Agenda.findByPk.mockResolvedValue({ destroy: jest.fn().mockRejectedValue(new Error('db')) });
        const res = crearRes();

        await agendaCtrl.eliminarActividad(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('galeria.controller', () => {
    it('obtiene la galería', async () => {
        Galeria.findAll.mockResolvedValue([{ id: 1 }]);
        const res = crearRes();

        await galeriaCtrl.obtenerGaleria(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla obtener la galería', async () => {
        Galeria.findAll.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await galeriaCtrl.obtenerGaleria(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rechaza crear un ítem sin campos obligatorios', async () => {
        const res = crearRes();

        await galeriaCtrl.crearItem(crearReq({ body: { titulo: 'Foto' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('crea un ítem de galería', async () => {
        Galeria.create.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await galeriaCtrl.crearItem(crearReq({
            body: { titulo: 'Foto', imagen: '/uploads/foto.webp', seccion: 'feria', orden: 1 }
        }), res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devuelve 500 si falla crear el ítem de galería', async () => {
        Galeria.create.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await galeriaCtrl.crearItem(crearReq({
            body: { titulo: 'Foto', imagen: '/uploads/foto.webp' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al actualizar un ítem inexistente', async () => {
        Galeria.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await galeriaCtrl.actualizarItem(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('actualiza un ítem de galería', async () => {
        const item = { update: jest.fn().mockResolvedValue(undefined) };
        Galeria.findByPk.mockResolvedValue(item);
        const res = crearRes();

        await galeriaCtrl.actualizarItem(crearReq({ params: { id: '1' }, body: { orden: 2 } }), res);

        expect(item.update).toHaveBeenCalledWith({ orden: 2 });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla actualizar el ítem de galería', async () => {
        Galeria.findByPk.mockResolvedValue({ update: jest.fn().mockRejectedValue(new Error('db')) });
        const res = crearRes();

        await galeriaCtrl.actualizarItem(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al eliminar un ítem inexistente', async () => {
        Galeria.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await galeriaCtrl.eliminarItem(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('elimina un ítem de galería', async () => {
        const item = { destroy: jest.fn().mockResolvedValue(undefined) };
        Galeria.findByPk.mockResolvedValue(item);
        const res = crearRes();

        await galeriaCtrl.eliminarItem(crearReq({ params: { id: '1' } }), res);

        expect(item.destroy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla eliminar el ítem de galería', async () => {
        Galeria.findByPk.mockResolvedValue({ destroy: jest.fn().mockRejectedValue(new Error('db')) });
        const res = crearRes();

        await galeriaCtrl.eliminarItem(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('media.controller', () => {
    it('rechaza subir una imagen sin archivo procesado', async () => {
        const res = crearRes();

        await mediaCtrl.subirImagen(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('registra una imagen con formato explícito', async () => {
        Media.create.mockResolvedValue({ id: 'm1', url: '/uploads/m1.webp', filename: 'm1.webp', sizeBytes: 10 });
        const res = crearRes();

        await mediaCtrl.subirImagen(crearReq({
            processedFile: {
                id: 'm1', originalName: 'a.png', filename: 'm1.webp', url: '/uploads/m1.webp',
                mimeType: 'image/webp', sizeBytes: 10, format: 'webp'
            }
        }), res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ format: 'webp' }));
    });

    it('usa webp por defecto cuando no se informa formato', async () => {
        Media.create.mockResolvedValue({ id: 'm1', url: '/uploads/m1.webp', filename: 'm1.webp', sizeBytes: 10 });
        const res = crearRes();

        await mediaCtrl.subirImagen(crearReq({
            processedFile: {
                id: 'm1', originalName: 'a.png', filename: 'm1.webp', url: '/uploads/m1.webp',
                mimeType: 'image/webp', sizeBytes: 10
            }
        }), res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ format: 'webp' }));
    });

    it('limpia el archivo físico si falla la persistencia', async () => {
        Media.create.mockRejectedValue(new Error('db'));
        const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
        const res = crearRes();

        await mediaCtrl.subirImagen(crearReq({
            processedFile: { path: '/tmp/m1.webp' }
        }), res);

        expect(unlinkSpy).toHaveBeenCalledWith('/tmp/m1.webp');
        expect(res.status).toHaveBeenCalledWith(500);

        existsSpy.mockRestore();
        unlinkSpy.mockRestore();
    });

    it('tolera errores al limpiar el archivo huérfano', async () => {
        Media.create.mockRejectedValue(new Error('db'));
        const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
            throw new Error('permiso');
        });
        const res = crearRes();

        await mediaCtrl.subirImagen(crearReq({
            processedFile: { path: '/tmp/m1.webp' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(500);

        existsSpy.mockRestore();
        unlinkSpy.mockRestore();
    });

    it('lista todas las imágenes', async () => {
        Media.findAll.mockResolvedValue([]);
        const res = crearRes();

        await mediaCtrl.obtenerTodas(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla listar imágenes', async () => {
        Media.findAll.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await mediaCtrl.obtenerTodas(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al eliminar una imagen inexistente', async () => {
        Media.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await mediaCtrl.eliminarImagen(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('elimina una imagen y su archivo físico', async () => {
        const media = { filename: 'm1.webp', destroy: jest.fn().mockResolvedValue(undefined) };
        Media.findByPk.mockResolvedValue(media);
        const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
        const res = crearRes();

        await mediaCtrl.eliminarImagen(crearReq({ params: { id: '1' } }), res);

        expect(unlinkSpy).toHaveBeenCalled();
        expect(media.destroy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);

        existsSpy.mockRestore();
        unlinkSpy.mockRestore();
    });

    it('devuelve 500 si falla eliminar la imagen', async () => {
        Media.findByPk.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await mediaCtrl.eliminarImagen(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('ubicacionStand.controller', () => {
    it('obtiene las ubicaciones', async () => {
        UbicacionStand.findAll.mockResolvedValue([]);
        const res = crearRes();

        await ubicacionStandCtrl.obtenerUbicaciones(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla obtener ubicaciones', async () => {
        UbicacionStand.findAll.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await ubicacionStandCtrl.obtenerUbicaciones(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 si el stand no tiene ubicación', async () => {
        UbicacionStand.findOne.mockResolvedValue(null);
        const res = crearRes();

        await ubicacionStandCtrl.obtenerUbicacionPorStand(crearReq({ params: { standId: 'A1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('obtiene la ubicación de un stand', async () => {
        UbicacionStand.findOne.mockResolvedValue({ standId: 'A1' });
        const res = crearRes();

        await ubicacionStandCtrl.obtenerUbicacionPorStand(crearReq({ params: { standId: 'A1' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla obtener la ubicación', async () => {
        UbicacionStand.findOne.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await ubicacionStandCtrl.obtenerUbicacionPorStand(crearReq({ params: { standId: 'A1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al actualizar una ubicación inexistente', async () => {
        UbicacionStand.findOne.mockResolvedValue(null);
        const res = crearRes();

        await ubicacionStandCtrl.actualizarUbicacion(crearReq({ params: { standId: 'A1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('actualiza todos los campos numéricos de la ubicación', async () => {
        const ubicacion = { update: jest.fn().mockResolvedValue(undefined) };
        UbicacionStand.findOne.mockResolvedValue(ubicacion);
        const res = crearRes();

        await ubicacionStandCtrl.actualizarUbicacion(crearReq({
            params: { standId: 'A1' },
            body: {
                x: '1', y: '2', z: '3', rotY: '4', w: '5', l: '6', h: '7',
                carpetColor: '8', type: 'stand'
            }
        }), res);

        expect(ubicacion.update).toHaveBeenCalledWith({
            x: 1, y: 2, z: 3, rotY: 4, w: 5, l: 6, h: 7, carpetColor: 8, type: 'stand'
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('actualiza sin campos opcionales', async () => {
        const ubicacion = { update: jest.fn().mockResolvedValue(undefined) };
        UbicacionStand.findOne.mockResolvedValue(ubicacion);
        const res = crearRes();

        await ubicacionStandCtrl.actualizarUbicacion(crearReq({
            params: { standId: 'A1' },
            body: {}
        }), res);

        expect(ubicacion.update).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla actualizar la ubicación', async () => {
        UbicacionStand.findOne.mockResolvedValue({ update: jest.fn().mockRejectedValue(new Error('db')) });
        const res = crearRes();

        await ubicacionStandCtrl.actualizarUbicacion(crearReq({ params: { standId: 'A1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('noticia.controller', () => {
    it('lista noticias vigentes por defecto', async () => {
        Noticia.findAll.mockResolvedValue([]);
        const res = crearRes();

        await noticiaCtrl.obtenerNoticias(crearReq(), res);

        expect(Noticia.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { vigente: true } }));
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('lista noticias incluyendo borradores', async () => {
        Noticia.findAll.mockResolvedValue([]);
        const res = crearRes();

        await noticiaCtrl.obtenerNoticias(crearReq({ query: { incluirBorradores: 'true' } }), res);

        expect(Noticia.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('devuelve 500 si falla listar noticias', async () => {
        Noticia.findAll.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await noticiaCtrl.obtenerNoticias(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 si la noticia no existe', async () => {
        Noticia.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await noticiaCtrl.obtenerNoticiaPorId(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('devuelve la noticia encontrada', async () => {
        Noticia.findByPk.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await noticiaCtrl.obtenerNoticiaPorId(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla obtener la noticia', async () => {
        Noticia.findByPk.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await noticiaCtrl.obtenerNoticiaPorId(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rechaza crear una noticia sin campos obligatorios', async () => {
        const res = crearRes();

        await noticiaCtrl.crearNoticia(crearReq({ body: { slug: 'x' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve 409 si el slug ya existe', async () => {
        Noticia.findOne.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await noticiaCtrl.crearNoticia(crearReq({
            body: { slug: 'x', titulo: 'T', categoria: 'C', descripcion: 'D', fecha: '2026-01-01' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('crea una noticia marcada como large', async () => {
        Noticia.findOne.mockResolvedValue(null);
        Noticia.create.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await noticiaCtrl.crearNoticia(crearReq({
            body: {
                slug: 'x', titulo: 'T', categoria: 'C', descripcion: 'D', fecha: '2026-01-01',
                displaySize: 'large'
            }
        }), res);

        expect(Noticia.create).toHaveBeenCalledWith(expect.objectContaining({ isLarge: true, imagen: null }));
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('crea una noticia con valores por defecto', async () => {
        Noticia.findOne.mockResolvedValue(null);
        Noticia.create.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await noticiaCtrl.crearNoticia(crearReq({
            body: {
                slug: 'x', titulo: 'T', categoria: 'C', descripcion: 'D', fecha: '2026-01-01',
                imagen: '/uploads/n.webp', vigente: false, isLarge: false
            }
        }), res);

        expect(Noticia.create).toHaveBeenCalledWith(expect.objectContaining({
            imagen: '/uploads/n.webp', vigente: false, isLarge: false
        }));
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devuelve 409 ante UniqueConstraintError al crear', async () => {
        Noticia.findOne.mockResolvedValue(null);
        Noticia.create.mockRejectedValue(errorSequelize(UniqueConstraintError, 'slug duplicado'));
        const res = crearRes();

        await noticiaCtrl.crearNoticia(crearReq({
            body: { slug: 'x', titulo: 'T', categoria: 'C', descripcion: 'D', fecha: '2026-01-01' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('devuelve 400 ante ValidationError al crear', async () => {
        Noticia.findOne.mockResolvedValue(null);
        Noticia.create.mockRejectedValue(errorSequelize(ValidationError, 'dato inválido'));
        const res = crearRes();

        await noticiaCtrl.crearNoticia(crearReq({
            body: { slug: 'x', titulo: 'T', categoria: 'C', descripcion: 'D', fecha: '2026-01-01' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve 500 ante un error inesperado al crear', async () => {
        Noticia.findOne.mockResolvedValue(null);
        Noticia.create.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await noticiaCtrl.crearNoticia(crearReq({
            body: { slug: 'x', titulo: 'T', categoria: 'C', descripcion: 'D', fecha: '2026-01-01' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al actualizar una noticia inexistente', async () => {
        Noticia.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await noticiaCtrl.actualizarNoticia(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('devuelve 409 si el nuevo slug ya está en uso', async () => {
        Noticia.findByPk.mockResolvedValue({ id: 1, slug: 'viejo' });
        Noticia.findOne.mockResolvedValue({ id: 2 });
        const res = crearRes();

        await noticiaCtrl.actualizarNoticia(crearReq({
            params: { id: '1' },
            body: { slug: 'nuevo' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('actualiza una noticia derivando isLarge desde displaySize', async () => {
        const noticia = { id: 1, slug: 'viejo', update: jest.fn().mockResolvedValue(undefined) };
        Noticia.findByPk.mockResolvedValue(noticia);
        const res = crearRes();

        await noticiaCtrl.actualizarNoticia(crearReq({
            params: { id: '1' },
            body: { displaySize: 'large' }
        }), res);

        expect(noticia.update).toHaveBeenCalledWith(expect.objectContaining({ isLarge: true }));
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('actualiza una noticia sin tocar el slug', async () => {
        const noticia = { id: 1, slug: 'mismo', update: jest.fn().mockResolvedValue(undefined) };
        Noticia.findByPk.mockResolvedValue(noticia);
        const res = crearRes();

        await noticiaCtrl.actualizarNoticia(crearReq({
            params: { id: '1' },
            body: { slug: 'mismo', titulo: 'Nuevo' }
        }), res);

        expect(Noticia.findOne).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 409 ante UniqueConstraintError al actualizar', async () => {
        Noticia.findByPk.mockResolvedValue({
            id: 1, slug: 'viejo', update: jest.fn().mockRejectedValue(errorSequelize(UniqueConstraintError, 'dup'))
        });
        const res = crearRes();

        await noticiaCtrl.actualizarNoticia(crearReq({
            params: { id: '1' },
            body: { titulo: 'Nuevo' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('devuelve 400 ante ValidationError al actualizar', async () => {
        Noticia.findByPk.mockResolvedValue({
            id: 1, slug: 'viejo', update: jest.fn().mockRejectedValue(errorSequelize(ValidationError, 'inválido'))
        });
        const res = crearRes();

        await noticiaCtrl.actualizarNoticia(crearReq({
            params: { id: '1' },
            body: { titulo: 'Nuevo' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve 500 ante un error inesperado al actualizar', async () => {
        Noticia.findByPk.mockResolvedValue({
            id: 1, slug: 'viejo', update: jest.fn().mockRejectedValue(new Error('db'))
        });
        const res = crearRes();

        await noticiaCtrl.actualizarNoticia(crearReq({
            params: { id: '1' },
            body: { titulo: 'Nuevo' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al eliminar una noticia inexistente', async () => {
        Noticia.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await noticiaCtrl.eliminarNoticia(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('elimina una noticia', async () => {
        const noticia = { destroy: jest.fn().mockResolvedValue(undefined) };
        Noticia.findByPk.mockResolvedValue(noticia);
        const res = crearRes();

        await noticiaCtrl.eliminarNoticia(crearReq({ params: { id: '1' } }), res);

        expect(noticia.destroy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla eliminar la noticia', async () => {
        Noticia.findByPk.mockResolvedValue({ destroy: jest.fn().mockRejectedValue(new Error('db')) });
        const res = crearRes();

        await noticiaCtrl.eliminarNoticia(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('eje.controller', () => {
    it('obtiene los ejes', async () => {
        Eje.findAll.mockResolvedValue([]);
        const res = crearRes();

        await ejeCtrl.obtenerEjes(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla obtener los ejes', async () => {
        Eje.findAll.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await ejeCtrl.obtenerEjes(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rechaza crear un eje sin campos obligatorios', async () => {
        const res = crearRes();

        await ejeCtrl.crearEje(crearReq({ body: { nombre: 'X' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('crea un eje', async () => {
        Eje.create.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await ejeCtrl.crearEje(crearReq({
            body: { nombre: 'X', descripcion: 'D', icono: 'I', orden: 1 }
        }), res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devuelve 500 si falla crear el eje', async () => {
        Eje.create.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await ejeCtrl.crearEje(crearReq({
            body: { nombre: 'X', descripcion: 'D', icono: 'I', orden: 1 }
        }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al actualizar un eje inexistente', async () => {
        Eje.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await ejeCtrl.actualizarEje(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('actualiza un eje', async () => {
        const eje = { update: jest.fn().mockResolvedValue(undefined) };
        Eje.findByPk.mockResolvedValue(eje);
        const res = crearRes();

        await ejeCtrl.actualizarEje(crearReq({ params: { id: '1' }, body: { nombre: 'Nuevo' } }), res);

        expect(eje.update).toHaveBeenCalledWith({ nombre: 'Nuevo' });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla actualizar el eje', async () => {
        Eje.findByPk.mockResolvedValue({ update: jest.fn().mockRejectedValue(new Error('db')) });
        const res = crearRes();

        await ejeCtrl.actualizarEje(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al eliminar un eje inexistente', async () => {
        Eje.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await ejeCtrl.eliminarEje(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('elimina un eje', async () => {
        const eje = { destroy: jest.fn().mockResolvedValue(undefined) };
        Eje.findByPk.mockResolvedValue(eje);
        const res = crearRes();

        await ejeCtrl.eliminarEje(crearReq({ params: { id: '1' } }), res);

        expect(eje.destroy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla eliminar el eje', async () => {
        Eje.findByPk.mockResolvedValue({ destroy: jest.fn().mockRejectedValue(new Error('db')) });
        const res = crearRes();

        await ejeCtrl.eliminarEje(crearReq({ params: { id: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('correo.controller', () => {
    it('rechaza un correo vacío', async () => {
        const res = crearRes();

        await correoCtrl.enviarCorreo(crearReq({ body: { email: '   ' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve 404 si la actividad no existe', async () => {
        Agenda.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await correoCtrl.enviarCorreo(crearReq({ body: { email: 'a@b.com', actividadId: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('informa si ya existe una suscripción pendiente', async () => {
        Agenda.findByPk.mockResolvedValue({ id: 1, titulo: 'Charla' });
        Correo.findOne.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await correoCtrl.enviarCorreo(crearReq({ body: { email: 'a@b.com', actividadId: '1' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('crea un recordatorio para una actividad', async () => {
        Agenda.findByPk.mockResolvedValue({ id: 1, titulo: 'Charla' });
        Correo.findOne.mockResolvedValue(null);
        Correo.create.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await correoCtrl.enviarCorreo(crearReq({
            body: { email: ' a@b.com ', actividadId: '1', mensaje: 'Hola', empresa: 'ACME', perfil: 'Estudiante' }
        }), res);

        expect(Correo.create).toHaveBeenCalledWith(expect.objectContaining({
            email: 'a@b.com',
            actividadId: 1,
            tipo: 'recordatorio',
            asunto: 'Recordatorio: Charla'
        }));
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('crea un mensaje de contacto sin actividad', async () => {
        Correo.create.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await correoCtrl.enviarCorreo(crearReq({ body: { email: 'a@b.com' } }), res);

        expect(Correo.create).toHaveBeenCalledWith(expect.objectContaining({
            actividadId: null,
            tipo: 'contacto',
            asunto: 'Contacto ExpoJuy 2026'
        }));
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devuelve 500 si falla crear el correo', async () => {
        Correo.create.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await correoCtrl.enviarCorreo(crearReq({ body: { email: 'a@b.com' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('usuario.controller', () => {
    it('rechaza registrar un usuario existente', async () => {
        Usuario.findOne.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await usuarioCtrl.registrarUsuario(crearReq({ body: { legajo: 'L1', correo: 'a@b.com' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('registra un usuario nuevo', async () => {
        Usuario.findOne.mockResolvedValue(null);
        Usuario.create.mockResolvedValue({ legajo: 'L1' });
        const res = crearRes();

        await usuarioCtrl.registrarUsuario(crearReq({
            body: { legajo: 'L1', dni: '1', correo: 'a@b.com', nombre: 'A', apellido: 'B', password: 'x' }
        }), res);

        expect(bcrypt.hash).toHaveBeenCalledWith('x', 'salt');
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devuelve 500 si falla registrar usuario', async () => {
        Usuario.findOne.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await usuarioCtrl.registrarUsuario(crearReq({ body: {} }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rechaza login sin credenciales', async () => {
        const res = crearRes();

        await usuarioCtrl.login(crearReq({ body: {} }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve 404 si el usuario no existe', async () => {
        Usuario.findOne.mockResolvedValue(null);
        const res = crearRes();

        await usuarioCtrl.login(crearReq({ body: { identificador: 'a@b.com', password: 'x' } }), res);

        expect(HistorialAcceso.create).toHaveBeenCalledWith(expect.objectContaining({ resultado: 'fallido' }));
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('devuelve 401 si la contraseña es incorrecta', async () => {
        Usuario.findOne.mockResolvedValue({ legajo: 'L1', password: 'hash' });
        bcrypt.compare.mockResolvedValue(false);
        const res = crearRes();

        await usuarioCtrl.login(crearReq({ body: { identificador: 'a@b.com', password: 'x' } }), res);

        expect(HistorialAcceso.create).toHaveBeenCalledWith(expect.objectContaining({ resultado: 'fallido' }));
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('inicia sesión correctamente', async () => {
        Usuario.findOne.mockResolvedValue({
            legajo: 'L1', nombre: 'A', apellido: 'B', rol: 'admin', password: 'hash'
        });
        bcrypt.compare.mockResolvedValue(true);
        const res = crearRes();

        await usuarioCtrl.login(crearReq({ body: { identificador: 'L1', password: 'x' } }), res);

        expect(jwt.sign).toHaveBeenCalled();
        expect(HistorialAcceso.create).toHaveBeenCalledWith(expect.objectContaining({ resultado: 'exitoso' }));
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ msg: 'Login exitoso' }));
    });

    it('devuelve 500 si falla el login', async () => {
        Usuario.findOne.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await usuarioCtrl.login(crearReq({ body: { identificador: 'L1', password: 'x' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rechaza verificación sin correo', async () => {
        const res = crearRes();

        await usuarioCtrl.loginVerificacion(crearReq({ body: {} }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve 404 en verificación si el usuario no existe', async () => {
        Usuario.findOne.mockResolvedValue(null);
        const res = crearRes();

        await usuarioCtrl.loginVerificacion(crearReq({ body: { correo: 'a@b.com' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('verifica el login correctamente', async () => {
        Usuario.findOne.mockResolvedValue({
            legajo: 'L1', nombre: 'A', apellido: 'B', rol: 'admin'
        });
        const res = crearRes();

        await usuarioCtrl.loginVerificacion(crearReq({ body: { correo: 'a@b.com' } }), res);

        expect(jwt.sign).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ msg: 'Login exitoso' }));
    });

    it('devuelve 500 si falla la verificación', async () => {
        Usuario.findOne.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await usuarioCtrl.loginVerificacion(crearReq({ body: { correo: 'a@b.com' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('expositor.controller', () => {
    it('lista expositores paginados', async () => {
        Expositor.findAndCountAll.mockResolvedValue({ count: 1, rows: [{ id: 'e1', name: 'ACME' }] });
        const res = crearRes();

        await expositorCtrl.obtenerExpositores(crearReq({
            query: { page: '1', pageSize: '6', category: 'tech', search: 'acme' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ total: 1, hasMore: false, page: 1 })
        }));
    });

    it('marca hasMore cuando hay más páginas', async () => {
        Expositor.findAndCountAll.mockResolvedValue({ count: 10, rows: [] });
        const res = crearRes();

        await expositorCtrl.obtenerExpositores(crearReq({ query: { page: '1', pageSize: '6' } }), res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ hasMore: true })
        }));
    });

    it('devuelve 500 si falla listar expositores', async () => {
        Expositor.findAndCountAll.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await expositorCtrl.obtenerExpositores(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 si el expositor no existe', async () => {
        Expositor.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await expositorCtrl.obtenerExpositorPorId(crearReq({ params: { id: 'e1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('obtiene un expositor por id', async () => {
        Expositor.findByPk.mockResolvedValue({ id: 'e1', name: 'ACME' });
        const res = crearRes();

        await expositorCtrl.obtenerExpositorPorId(crearReq({ params: { id: 'e1' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla obtener el expositor', async () => {
        Expositor.findByPk.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await expositorCtrl.obtenerExpositorPorId(crearReq({ params: { id: 'e1' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rechaza crear expositor sin campos obligatorios', async () => {
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({ body: { name: 'ACME' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('rechaza crear expositor con logo inválido', async () => {
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({
            body: { name: 'ACME', category: 'tech', logo: 'https://ejemplo.com/logo.png' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('rechaza crear expositor si faltan stands', async () => {
        Stand.findAll.mockResolvedValue([{ id: 'A1', estado: 'disponible' }]);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({
            body: { name: 'ACME', category: 'tech', standIds: ['A1', 'A2'] }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('rechaza crear expositor con stand cedido', async () => {
        Stand.findAll.mockResolvedValue([{ id: 'A1', estado: 'cedido' }]);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({
            body: { name: 'ACME', category: 'tech', standIds: ['A1'] }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('rechaza crear expositor con stand no disponible', async () => {
        Stand.findAll.mockResolvedValue([{ id: 'A1', estado: 'reservado' }]);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({
            body: { name: 'ACME', category: 'tech', standIds: ['A1'] }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('rechaza crear expositor con stand ya asignado', async () => {
        Stand.findAll.mockResolvedValue([{ id: 'A1', estado: 'disponible', expositorId: 'otro' }]);
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({
            body: { name: 'ACME', category: 'tech', standIds: ['A1'] }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('crea un expositor con stands', async () => {
        Stand.findAll.mockResolvedValue([
            { id: 'A2', estado: 'disponible' },
            { id: 'A1', estado: 'disponible' }
        ]);
        Expositor.create.mockResolvedValue({ id: 'e1' });
        Expositor.findByPk.mockResolvedValue({ id: 'e1', name: 'ACME', stands: [] });
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({
            body: { name: 'ACME', category: 'tech', standIds: ['A2', 'A1'] }
        }), res);

        expect(Expositor.create).toHaveBeenCalledWith(expect.objectContaining({ stand: 'A1, A2' }), expect.any(Object));
        expect(Stand.update).toHaveBeenCalled();
        expect(t.commit).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('crea un expositor usando la cadena stand', async () => {
        Stand.findAll.mockResolvedValue([
            { id: 'A1', estado: 'disponible' },
            { id: 'A2', estado: 'disponible' }
        ]);
        Expositor.create.mockResolvedValue({ id: 'e1' });
        Expositor.findByPk.mockResolvedValue({ id: 'e1', name: 'ACME', stands: [] });
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({
            body: { name: 'ACME', category: 'tech', stand: 'A1, A2' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('crea un expositor sin stands', async () => {
        Expositor.create.mockResolvedValue({ id: 'e1' });
        Expositor.findByPk.mockResolvedValue({ id: 'e1', name: 'ACME', stands: [] });
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({
            body: { name: 'ACME', category: 'tech' }
        }), res);

        expect(Stand.update).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devuelve 500 si falla crear el expositor', async () => {
        Expositor.create.mockRejectedValue(new Error('db'));
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.crearExpositor(crearReq({
            body: { name: 'ACME', category: 'tech' }
        }), res);

        expect(t.rollback).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al actualizar un expositor inexistente', async () => {
        Expositor.findByPk.mockResolvedValue(null);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.actualizarExpositor(crearReq({ params: { id: 'e1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('rechaza actualizar con logo inválido', async () => {
        Expositor.findByPk.mockResolvedValue({ id: 'e1', logo: null });
        Stand.findAll.mockResolvedValue([]);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.actualizarExpositor(crearReq({
            params: { id: 'e1' },
            body: { logo: 'invalido' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('rechaza asignar stands inexistentes al actualizar', async () => {
        Expositor.findByPk.mockResolvedValue({ id: 'e1', logo: null });
        Stand.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.actualizarExpositor(crearReq({
            params: { id: 'e1' },
            body: { standIds: ['A1'] }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('rechaza asignar un stand cedido al actualizar', async () => {
        Expositor.findByPk.mockResolvedValue({ id: 'e1', logo: null });
        Stand.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'A1', estado: 'cedido' }]);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.actualizarExpositor(crearReq({
            params: { id: 'e1' },
            body: { standIds: ['A1'] }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('rechaza asignar un stand no disponible al actualizar', async () => {
        Expositor.findByPk.mockResolvedValue({ id: 'e1', logo: null });
        Stand.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'A1', estado: 'reservado' }]);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.actualizarExpositor(crearReq({
            params: { id: 'e1' },
            body: { standIds: ['A1'] }
        }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('actualiza un expositor reasignando stands', async () => {
        const expositor = { id: 'e1', logo: '/uploads/logo-viejo.webp', update: jest.fn().mockResolvedValue(undefined) };
        Expositor.findByPk
            .mockResolvedValueOnce(expositor)
            .mockResolvedValueOnce({ id: 'e1', name: 'ACME', stands: [] });
        Stand.findAll
            .mockResolvedValueOnce([{ id: 'A1' }])
            .mockResolvedValueOnce([{ id: 'A2', estado: 'disponible' }]);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.actualizarExpositor(crearReq({
            params: { id: 'e1' },
            body: { standIds: ['A2'], logo: '/uploads/logo-nuevo.webp' }
        }), res);

        expect(Stand.update).toHaveBeenCalledTimes(2);
        expect(expositor.update).toHaveBeenCalledWith(
            expect.objectContaining({ logo: '/uploads/logo-nuevo.webp', stand: 'A2' }),
            expect.any(Object)
        );
        expect(t.commit).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('actualiza un expositor sin cambiar stands', async () => {
        const expositor = { id: 'e1', logo: null, update: jest.fn().mockResolvedValue(undefined) };
        Expositor.findByPk
            .mockResolvedValueOnce(expositor)
            .mockResolvedValueOnce({ id: 'e1', name: 'ACME', stands: [] });
        Stand.findAll.mockResolvedValue([]);
        const res = crearRes();

        await expositorCtrl.actualizarExpositor(crearReq({
            params: { id: 'e1' },
            body: { name: 'Nuevo' }
        }), res);

        expect(Stand.update).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla actualizar el expositor', async () => {
        Expositor.findByPk.mockResolvedValue({
            id: 'e1', logo: null, update: jest.fn().mockRejectedValue(new Error('db'))
        });
        Stand.findAll.mockResolvedValue([]);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.actualizarExpositor(crearReq({
            params: { id: 'e1' },
            body: { name: 'Nuevo' }
        }), res);

        expect(t.rollback).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rechaza subir logo sin archivo procesado', async () => {
        const res = crearRes();

        await expositorCtrl.subirLogo(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve el logo convertido cuando no hay id', async () => {
        const res = crearRes();

        await expositorCtrl.subirLogo(crearReq({
            processedFile: { url: '/uploads/logo-x.webp', filename: 'logo-x.webp', sizeBytes: 10, width: 1, height: 1 }
        }), res);

        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('devuelve 404 al subir logo de un expositor inexistente', async () => {
        Expositor.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await expositorCtrl.subirLogo(crearReq({
            params: { id: 'e1' },
            processedFile: { url: '/uploads/logo-x.webp', filename: 'logo-x.webp', path: '/tmp/no-existe.webp' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('actualiza el logo de un expositor', async () => {
        const expositor = { id: 'e1', logo: null, update: jest.fn().mockResolvedValue(undefined) };
        Expositor.findByPk
            .mockResolvedValueOnce(expositor)
            .mockResolvedValueOnce({ id: 'e1', name: 'ACME', logo: '/uploads/logo-x.webp', stands: [] });
        const res = crearRes();

        await expositorCtrl.subirLogo(crearReq({
            params: { id: 'e1' },
            processedFile: { url: '/uploads/logo-x.webp', filename: 'logo-x.webp', sizeBytes: 10, width: 1, height: 1 }
        }), res);

        expect(expositor.update).toHaveBeenCalledWith({ logo: '/uploads/logo-x.webp' });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla actualizar el logo', async () => {
        Expositor.findByPk.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await expositorCtrl.subirLogo(crearReq({
            params: { id: 'e1' },
            processedFile: { url: '/uploads/logo-x.webp', filename: 'logo-x.webp', path: '/tmp/no-existe.webp' }
        }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve 404 al eliminar un expositor inexistente', async () => {
        Expositor.findByPk.mockResolvedValue(null);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.eliminarExpositor(crearReq({ params: { id: 'e1' } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(t.rollback).toHaveBeenCalled();
    });

    it('elimina un expositor y desvincula sus stands', async () => {
        const expositor = { id: 'e1', logo: '/uploads/logo-x.webp', destroy: jest.fn().mockResolvedValue(undefined) };
        Expositor.findByPk.mockResolvedValue(expositor);
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.eliminarExpositor(crearReq({ params: { id: 'e1' } }), res);

        expect(Stand.update).toHaveBeenCalledWith(
            { estado: 'disponible', expositorId: null },
            expect.any(Object)
        );
        expect(expositor.destroy).toHaveBeenCalled();
        expect(t.commit).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla eliminar el expositor', async () => {
        Expositor.findByPk.mockResolvedValue({
            id: 'e1', logo: null, destroy: jest.fn().mockRejectedValue(new Error('db'))
        });
        const t = await sequelize.transaction();
        const res = crearRes();

        await expositorCtrl.eliminarExpositor(crearReq({ params: { id: 'e1' } }), res);

        expect(t.rollback).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('serializa null como null', () => {
        expect(expositorCtrl.serializarExpositor(null)).toBeNull();
    });

    it('serializa un expositor con toJSON', () => {
        const dto = expositorCtrl.serializarExpositor({
            toJSON: () => ({ id: 'e1', name: 'ACME', category: 'tech', createdAt: 'x', updatedAt: 'y' })
        });

        expect(dto).toEqual(expect.objectContaining({ id: 'e1', name: 'ACME', category: 'tech' }));
    });

    it('normaliza el logo según su formato', () => {
        expect(expositorCtrl.normalizarLogo(null)).toBeNull();
        expect(expositorCtrl.normalizarLogo('   ')).toBeNull();
        expect(expositorCtrl.normalizarLogo(123)).toBeUndefined();
        expect(expositorCtrl.normalizarLogo('http://x')).toBeUndefined();
        expect(expositorCtrl.normalizarLogo('/uploads/logo-x.webp')).toBe('/uploads/logo-x.webp');
    });

    it('elimina archivos de logo válidos y evita rutas inválidas', () => {
        const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

        expositorCtrl.eliminarArchivoLogo(123);
        expositorCtrl.eliminarArchivoLogo('/uploads/otro.webp');
        expositorCtrl.eliminarArchivoLogo('/uploads/logo-x.webp');

        expect(unlinkSpy).toHaveBeenCalledTimes(1);

        existsSpy.mockRestore();
        unlinkSpy.mockRestore();
    });
});

describe('chatbot.controller', () => {
    beforeEach(() => {
        chatbotSearch.sanitizarEntrada.mockImplementation((valor) =>
            typeof valor === 'string' ? valor.trim() : ''
        );
        chatbotSearch.extraerPalabrasClave.mockReturnValue(['agenda']);
        chatbotSearch.detectarIntencion.mockReturnValue(null);
        chatbotSearch.detectarSeccion.mockReturnValue(null);
        chatbotSearch.construirFicha.mockReturnValue([]);
        chatbotSearch.buscarEnBase.mockResolvedValue([]);
    });

    it('rechaza una consulta vacía', async () => {
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: {} }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responde un saludo y registra el log', async () => {
        chatbotSearch.detectarIntencion.mockReturnValue('saludo');
        LogChatbot.create.mockResolvedValue({ id: 1 });
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: { query: 'hola' } }), res);

        expect(LogChatbot.create).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ logId: 1 })
        }));
    });

    it('responde aunque falle el log de un saludo', async () => {
        chatbotSearch.detectarIntencion.mockReturnValue('agradecimiento');
        LogChatbot.create.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: { query: 'gracias' } }), res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ logId: null })
        }));
    });

    it('responde una sección de tipo texto', async () => {
        chatbotSearch.detectarSeccion.mockReturnValue({ tipo: 'texto', mensaje: 'Texto', id: 'info' });
        LogChatbot.create.mockResolvedValue({ id: 2 });
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: { query: 'info' } }), res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ mensaje: 'Texto', logId: 2 })
        }));
    });

    it('responde una sección estática con ficha', async () => {
        chatbotSearch.detectarSeccion.mockReturnValue({ tipo: 'estatico', mensaje: 'Estático', id: 'mapa' });
        chatbotSearch.construirFicha.mockReturnValue([{ texto: 'Mapa' }]);
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: { query: 'mapa' } }), res);

        expect(chatbotSearch.construirFicha).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde con resultados de la sección agenda', async () => {
        chatbotSearch.detectarSeccion.mockReturnValue({ id: 'agenda', etiqueta: 'Agenda', origen: 'agenda' });
        chatbotSearch.buscarEnBase.mockResolvedValue([{ id: 1 }]);
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: { query: 'agenda' } }), res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ resultados: [{ id: 1 }] })
        }));
    });

    it('responde con resultados de otra sección', async () => {
        chatbotSearch.detectarSeccion.mockReturnValue({ id: 'noticia', etiqueta: 'Noticias', origen: 'noticia' });
        chatbotSearch.buscarEnBase.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: { query: 'noticias' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responde con resultados sin sección reconocida', async () => {
        chatbotSearch.buscarEnBase.mockResolvedValue([{ id: 1 }]);
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: { query: 'algo' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('usa el fallback cuando no hay resultados', async () => {
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: { query: 'nada' } }), res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                mensaje: expect.stringContaining('No encontré información')
            })
        }));
    });

    it('devuelve 500 si falla la consulta', async () => {
        chatbotSearch.buscarEnBase.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await chatbotCtrl.consultar(crearReq({ body: { query: 'algo' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('rechaza una búsqueda vacía', async () => {
        const res = crearRes();

        await chatbotCtrl.buscar(crearReq({ query: {} }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('busca términos y devuelve resultados', async () => {
        chatbotSearch.buscarEnBase.mockResolvedValue([{ id: 1 }]);
        const res = crearRes();

        await chatbotCtrl.buscar(crearReq({ query: { q: 'agenda', limit: '5' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla la búsqueda', async () => {
        chatbotSearch.buscarEnBase.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await chatbotCtrl.buscar(crearReq({ query: { q: 'agenda' } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('devuelve sugerencias', async () => {
        const res = crearRes();

        await chatbotCtrl.sugerencias(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.any(Array)
        }));
    });

    it('rechaza feedback sin booleano', async () => {
        const res = crearRes();

        await chatbotCtrl.registrarFeedback(crearReq({ params: { id: '1' }, body: { fue_util: 'si' } }), res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('devuelve 404 si el log de feedback no existe', async () => {
        LogChatbot.findByPk.mockResolvedValue(null);
        const res = crearRes();

        await chatbotCtrl.registrarFeedback(crearReq({ params: { id: '1' }, body: { fue_util: true } }), res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('registra el feedback de un log', async () => {
        const log = { fue_util: null, save: jest.fn().mockResolvedValue(undefined) };
        LogChatbot.findByPk.mockResolvedValue(log);
        const res = crearRes();

        await chatbotCtrl.registrarFeedback(crearReq({ params: { id: '1' }, body: { fue_util: true } }), res);

        expect(log.fue_util).toBe(true);
        expect(log.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('devuelve 500 si falla registrar feedback', async () => {
        LogChatbot.findByPk.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await chatbotCtrl.registrarFeedback(crearReq({ params: { id: '1' }, body: { fue_util: true } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('obtiene la analítica con métricas', async () => {
        LogChatbot.count.mockResolvedValue(10);
        LogChatbot.findOne.mockResolvedValue({ total_evaluadas: 5, latencia_promedio_ms: 12 });
        LogChatbot.findAll.mockResolvedValue([{ intencion: 'saludo', total: 5 }]);
        const res = crearRes();

        await chatbotCtrl.obtenerAnalitica(crearReq(), res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ totalConsultas: 10, evaluadas: 5, utiles: 10, porcentajeUtilidad: 200 })
        }));
    });

    it('obtiene la analítica sin evaluaciones', async () => {
        LogChatbot.count.mockResolvedValue(0);
        LogChatbot.findOne.mockResolvedValue(null);
        LogChatbot.findAll.mockResolvedValue([]);
        const res = crearRes();

        await chatbotCtrl.obtenerAnalitica(crearReq(), res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ porcentajeUtilidad: null })
        }));
    });

    it('devuelve 500 si falla obtener la analítica', async () => {
        LogChatbot.count.mockRejectedValue(new Error('db'));
        const res = crearRes();

        await chatbotCtrl.obtenerAnalitica(crearReq(), res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
