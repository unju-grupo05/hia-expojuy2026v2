jest.mock('../config/database', () => ({ transaction: jest.fn() }));
jest.mock('../src/models/expositor.model', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../src/models/stand.model', () => ({}));
jest.mock('../src/models/ubicacionStand.model', () => ({}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const TMP_UPLOADS = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-logo-test-'));
process.env.UPLOADS_DIR = TMP_UPLOADS;

const {
    serializarExpositor,
    normalizarLogo,
    eliminarArchivoLogo
} = require('../src/controllers/expositor.controller');
const { optimizeLogoToWebp, optimizeToWebp } = require('../src/middlewares/upload.middleware');

const UPLOADS_DIR = path.resolve(TMP_UPLOADS);

/** Mock minimo de express: solo status/json encadenables. */
function mockRes() {
    const res = { statusCode: null, body: null };
    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    return res;
}

/** Ejecuta un middleware async con buffers reales de imagen y devuelve el req mutado. */
async function runPipeline(middleware, { buffer, originalname = 'logo.png', mimetype = 'image/png' }) {
    const req = { file: { buffer, originalname, mimetype } };
    const res = mockRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    return { req, res };
}

/** Crea una imagen PNG de las dimensiones indicadas. */
function pngDe(width, height) {
    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 12, g: 90, b: 160, alpha: 1 }
        }
    }).png().toBuffer();
}

async function leerMetadata(ruta) {
    const instancia = sharp(ruta);
    try {
        return await instancia.metadata();
    } finally {
        instancia.destroy();
    }
}


async function limpiarArchivos(archivos) {
    const pendientes = [];

    for (const archivo of archivos) {
        let borrado = false;

        for (let intento = 0; intento < 10 && !borrado; intento += 1) {
            try {
                if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
                borrado = true;
            } catch (err) {
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
        }

        if (!borrado) pendientes.push(archivo);
    }

    if (pendientes.length > 0) {
        console.warn(`Aviso: quedaron ${pendientes.length} archivo(s) de prueba sin borrar:`, pendientes);
    }
}

afterAll(() => {
    const restantes = fs.existsSync(TMP_UPLOADS) ? fs.readdirSync(TMP_UPLOADS) : [];
    if (restantes.length > 0) {
        console.warn(`Aviso: quedaron ${restantes.length} archivo(s) en el temporal de pruebas.`);
    }
});

describe('normalizarLogo', () => {
    it('acepta la ruta /uploads/<archivo> generada por el endpoint de subida', () => {
        expect(normalizarLogo('/uploads/logo-2f1c.webp')).toBe('/uploads/logo-2f1c.webp');
    });

    it('normaliza a null cuando se quiere quitar el logo', () => {
        expect(normalizarLogo(null)).toBeNull();
        expect(normalizarLogo(undefined)).toBeNull();
        expect(normalizarLogo('')).toBeNull();
        expect(normalizarLogo('   ')).toBeNull();
    });

    it('rechaza URLs externas y rutas fuera de /uploads', () => {
        expect(normalizarLogo('https://evil.example.com/logo.webp')).toBeUndefined();
        expect(normalizarLogo('/etc/passwd')).toBeUndefined();
        expect(normalizarLogo('../../uploads/logo-2f1c.webp')).toBeUndefined();
    });

    it('rechaza valores que no son string', () => {
        expect(normalizarLogo(123)).toBeUndefined();
        expect(normalizarLogo({ url: '/uploads/logo-2f1c.webp' })).toBeUndefined();
    });
});

describe('serializarExpositor', () => {
    it('expone el campo logo en el contrato publico', () => {
        const dto = serializarExpositor({
            id: 7,
            name: 'Minas del Sur',
            stand: 'A-12',
            category: 'mineria',
            logo: '/uploads/logo-abc.webp',
            secretField: 'no debe viajar'
        });

        expect(dto.logo).toBe('/uploads/logo-abc.webp');
        expect(dto.secretField).toBeUndefined();
    });

    it('devuelve null cuando el expositor no tiene logo', () => {
        expect(serializarExpositor({ id: 7, name: 'Sin logo' }).logo).toBeNull();
    });

    it('soporta instancias Sequelize mediante toJSON', () => {
        const instance = { toJSON: () => ({ id: 1, name: 'Con toJSON', logo: '/uploads/logo-x.webp' }) };
        expect(serializarExpositor(instance).logo).toBe('/uploads/logo-x.webp');
    });
});

describe('eliminarArchivoLogo', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('borra solo el archivo cuyo nombre corresponde a un logo UUID', () => {
        const existeSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

        eliminarArchivoLogo('/uploads/logo-8f14e45f-ea0e-4e1b-a1f0.webp');

        expect(unlinkSpy).toHaveBeenCalledWith(
            path.join(UPLOADS_DIR, 'logo-8f14e45f-ea0e-4e1b-a1f0.webp')
        );
        existeSpy.mockRestore();
    });

    it('ignora imagenes de galeria, rutas ajenas y payloads no string', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

        eliminarArchivoLogo('/uploads/galeria-normalizada.webp');
        eliminarArchivoLogo('/uploads/logo-foto.png');
        eliminarArchivoLogo('/otra-carpeta/logo-8f14e45f.webp');
        eliminarArchivoLogo(null);
        eliminarArchivoLogo(undefined);

        expect(unlinkSpy).not.toHaveBeenCalled();
    });
});

describe('optimizeLogoToWebp', () => {
    const generados = [];

    afterAll(async () => {
        await limpiarArchivos(generados);
    });

    it('reduce una imagen grande a un WebP de 150x150 como maximo', async () => {
        const { req } = await runPipeline(optimizeLogoToWebp, { buffer: await pngDe(1200, 600) });
        generados.push(req.processedFile.path);

        const meta = await leerMetadata(req.processedFile.path);

        expect(meta.format).toBe('webp');
        expect(meta.width).toBeLessThanOrEqual(150);
        expect(meta.height).toBeLessThanOrEqual(150);
        expect(meta.width).toBe(150);
        expect(meta.height).toBe(75);
        expect(req.processedFile.mimeType).toBe('image/webp');
        expect(req.processedFile.url).toBe(`/uploads/${req.processedFile.filename}`);
        expect(req.processedFile.filename).toMatch(/^logo-[0-9a-f-]{36}\.webp$/);
    });

    it('encaja un logo cuadrado sin deformarlo', async () => {
        const { req } = await runPipeline(optimizeLogoToWebp, { buffer: await pngDe(400, 400) });
        generados.push(req.processedFile.path);

        const meta = await leerMetadata(req.processedFile.path);
        expect([meta.width, meta.height]).toEqual([150, 150]);
    });

    it('no agranda una imagen mas chica que el limite', async () => {
        const { req } = await runPipeline(optimizeLogoToWebp, { buffer: await pngDe(64, 32) });
        generados.push(req.processedFile.path);

        const meta = await leerMetadata(req.processedFile.path);
        expect([meta.width, meta.height]).toEqual([64, 32]);
    });

    it('descarta metadatos EXIF del archivo generado', async () => {
        const conExif = await sharp(await pngDe(300, 300))
            .withMetadata({ exif: { IFD0: { Copyright: 'Expo Jujuy' } } })
            .toBuffer();

        const { req } = await runPipeline(optimizeLogoToWebp, { buffer: conExif });
        generados.push(req.processedFile.path);

        const meta = await leerMetadata(req.processedFile.path);
        expect(meta.exif).toBeUndefined();
    });

    it('responde 400 si no hay buffer en la peticion', async () => {
        const res = mockRes();
        const next = jest.fn();

        await optimizeLogoToWebp({ file: null }, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('responde 500 cuando sharp no puede decodificar el archivo', async () => {
        const res = mockRes();
        const next = jest.fn();
        const req = { file: { buffer: Buffer.from('esto no es una imagen'), originalname: 'logo.png' } };
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await optimizeLogoToWebp(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
        consoleSpy.mockRestore();
    });
});

describe('optimizeToWebp (galeria, sin regresiones)', () => {
    const generados = [];

    afterAll(async () => {
        await limpiarArchivos(generados);
    });

    it('mantiene el limite de 1920px y no usa el prefijo de logo', async () => {
        const { req } = await runPipeline(optimizeToWebp, { buffer: await pngDe(2400, 1200) });
        generados.push(req.processedFile.path);

        const meta = await leerMetadata(req.processedFile.path);
        expect(meta.format).toBe('webp');
        expect(meta.width).toBe(1920);
        expect(meta.height).toBe(960);
        expect(req.processedFile.filename).not.toMatch(/^logo-/);
    });
});