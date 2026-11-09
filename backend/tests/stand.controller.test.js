jest.mock('../config/database', () => ({
    define: jest.fn().mockReturnValue({
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
        hasOne: jest.fn()
    }),
    transaction: jest.fn().mockImplementation(() => Promise.resolve({
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue()
    }))
}));
jest.mock('../src/models/ubicacionStand.model', () => ({
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOrCreate: jest.fn().mockResolvedValue([{ update: jest.fn() }]),
    belongsTo: jest.fn(),
    hasOne: jest.fn(),
    associations: {}
}));
jest.mock('../src/models/stand.model', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    hasOne: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    associations: {}
}));
jest.mock('../src/models/expositor.model', () => ({
    findByPk: jest.fn(),
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    associations: {}
}));

const Stand = require('../src/models/stand.model');
const Expositor = require('../src/models/expositor.model');
const standCtrl = require('../src/controllers/stand.controller');

describe('Stand Controller', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            query: {},
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('obtenerStands', () => {
        it('debe devolver la lista de stands con código 200', async () => {
            const mockStands = [{ id: 'A1', sector: 'Tecnología', estado: 'disponible' }];
            Stand.findAll.mockResolvedValue(mockStands);

            await standCtrl.obtenerStands(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockStands,
                message: 'Stands obtenidos con éxito'
            });
        });
    });

    describe('obtenerStandPorId', () => {
        it('debe devolver 404 si el stand no existe', async () => {
            req.params.id = 'Z99';
            Stand.findByPk.mockResolvedValue(null);

            await standCtrl.obtenerStandPorId(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                data: null,
                message: "Stand 'Z99' no encontrado."
            });
        });

        it('debe devolver 200 y el stand si existe', async () => {
            req.params.id = 'A1';
            const mockStand = { id: 'A1', sector: 'Tecnología' };
            Stand.findByPk.mockResolvedValue(mockStand);

            await standCtrl.obtenerStandPorId(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockStand,
                message: 'Stand obtenido con éxito'
            });
        });
    });

    describe('crearStand', () => {
        it('debe devolver 400 si faltan campos obligatorios', async () => {
            req.body = { id: 'A1' }; // Falta sector

            await standCtrl.crearStand(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                data: null,
                message: 'Faltan campos obligatorios (id, sector).'
            });
        });

        it('debe devolver 400 si el stand ya existe', async () => {
            req.body = { id: 'A1', sector: 'Servicios' };
            Stand.findByPk.mockResolvedValue({ id: 'A1' });

            await standCtrl.crearStand(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                data: null,
                message: "El stand con identificador 'A1' ya existe."
            });
        });

        it('debe devolver 201 al crear el stand correctamente', async () => {
            req.body = { id: 'B2', sector: 'Industria', x: 10, y: 0, z: 5 };
            Stand.findByPk
                .mockResolvedValueOnce(null) // Para la validación de existencia
                .mockResolvedValueOnce({ id: 'B2', sector: 'Industria' }); // Para la consulta con include

            Stand.create.mockResolvedValue({ id: 'B2', sector: 'Industria' });

            await standCtrl.crearStand(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { id: 'B2', sector: 'Industria' },
                message: 'Stand creado con éxito'
            });
        });
    });

    describe('asignarExpositor', () => {
        it('debe devolver 404 si el stand no existe', async () => {
            req.params.id = 'NO_EXISTE';
            Stand.findByPk.mockResolvedValue(null);

            await standCtrl.asignarExpositor(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                data: null,
                message: "Stand 'NO_EXISTE' no encontrado."
            });
        });

        it('debe devolver 400 si el expositor no existe', async () => {
            req.params.id = 'A1';
            req.body = { expositorId: 'EXP-999' };
            Stand.findByPk.mockResolvedValue({ id: 'A1', update: jest.fn() });
            Expositor.findByPk.mockResolvedValue(null);

            await standCtrl.asignarExpositor(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                data: null,
                message: "El expositor con ID 'EXP-999' no existe."
            });
        });
    });
});
