jest.mock('../config/database', () => ({ transaction: jest.fn() }));
jest.mock('../src/models/reunionB2B.model', () => ({ create: jest.fn() }));
jest.mock('../src/models/expositor.model', () => ({ findByPk: jest.fn(), findOne: jest.fn() }));
jest.mock('../src/services/email.service', () => ({ enviarEmailB2BExpositor: jest.fn() }));

const {
    validateRequest,
    sanitizePayload,
    normalizeTime
} = require('../src/controllers/reunionB2B.controller');

const FECHA_FUTURA = '2999-12-31';
const FECHA_PASADA = '2020-01-01';

function payloadValido(overrides = {}) {
    return {
        nombreCliente: 'Ana Gomez',
        empresaCliente: 'Comercial del Norte',
        emailCliente: 'ana@example.com',
        telefonoCliente: '3884123456',
        empresaExpositora: 'Minas del Sur',
        expositorId: 'EXP-001',
        fechaSolicitada: FECHA_FUTURA,
        horaInicioSolicitada: '10:00',
        horaFinSolicitada: '11:30',
        cantidadAsistentes: 3,
        motivo: 'Reunion comercial',
        modalidad: 'presencial',
        observaciones: null,
        ...overrides
    };
}

describe('normalizeTime', () => {
    it('expande HH:mm a HH:mm:ss', () => {
        expect(normalizeTime('10:00')).toBe('10:00:00');
    });

    it('respeta el valor cuando ya trae segundos', () => {
        expect(normalizeTime('10:00:30')).toBe('10:00:30');
    });

    it('devuelve null para formatos invalidos', () => {
        expect(normalizeTime('10 AM')).toBeNull();
        expect(normalizeTime('')).toBeNull();
        expect(normalizeTime(undefined)).toBeNull();
    });

    it('devuelve null cuando la hora o los minutos estan fuera de rango', () => {
        expect(normalizeTime('25:00')).toBeNull();
        expect(normalizeTime('10:75')).toBeNull();
        expect(normalizeTime('10:00:99')).toBeNull();
    });

    it('acepta los limites validos del rango', () => {
        expect(normalizeTime('00:00')).toBe('00:00:00');
        expect(normalizeTime('23:59')).toBe('23:59:00');
    });
});

describe('sanitizePayload', () => {
    it('normaliza espacios, email y cantidad de asistentes', () => {
        const limpio = sanitizePayload({
            nombreCliente: '  Ana Gomez  ',
            empresaCliente: ' Comercial del Norte ',
            emailCliente: '  ANA@Example.COM ',
            telefonoCliente: ' 3884123456 ',
            empresaExpositora: ' Minas del Sur ',
            expositorId: 'EXP-001',
            fechaSolicitada: FECHA_FUTURA,
            horaInicioSolicitada: '10:00',
            horaFinSolicitada: '11:30',
            cantidadAsistentes: '3',
            motivo: '  Motivo  ',
            modalidad: 'presencial'
        });

        expect(limpio.nombreCliente).toBe('Ana Gomez');
        expect(limpio.empresaCliente).toBe('Comercial del Norte');
        expect(limpio.emailCliente).toBe('ana@example.com');
        expect(limpio.telefonoCliente).toBe('3884123456');
        expect(limpio.empresaExpositora).toBe('Minas del Sur');
        expect(limpio.cantidadAsistentes).toBe(3);
        expect(limpio.motivo).toBe('Motivo');
    });

    it('deja observaciones en null cuando no vienen', () => {
        expect(sanitizePayload({}).observaciones).toBeNull();
    });
});

describe('validateRequest', () => {
    it('acepta una solicitud valida', () => {
        expect(validateRequest(payloadValido())).toBeNull();
    });

    it('rechaza cuando faltan campos obligatorios', () => {
        const data = payloadValido();
        delete data.emailCliente;
        delete data.motivo;

        const error = validateRequest(data);

        expect(error).toMatch(/Faltan campos obligatorios/);
        expect(error).toContain('emailCliente');
        expect(error).toContain('motivo');
    });

    it('rechaza campos obligatorios en blanco', () => {
        expect(validateRequest(payloadValido({ empresaCliente: '   ' })))
            .toMatch(/Faltan campos obligatorios/);
    });

    it('rechaza emails con formato invalido', () => {
        const error = validateRequest(payloadValido({ emailCliente: 'ana@@example' }));

        expect(error).toBe('El correo electrónico no tiene un formato válido.');
    });

    it('rechaza fechas con formato invalido', () => {
        const error = validateRequest(payloadValido({ fechaSolicitada: '31-12-2999' }));

        expect(error).toBe('La fecha solicitada no puede ser anterior al día actual.');
    });

    it('rechaza fechas anteriores al dia actual', () => {
        const error = validateRequest(payloadValido({ fechaSolicitada: FECHA_PASADA }));

        expect(error).toBe('La fecha solicitada no puede ser anterior al día actual.');
    });

    it('rechaza horas con formato invalido', () => {
        const error = validateRequest(payloadValido({ horaInicioSolicitada: '10h' }));

        expect(error).toBe('Las horas solicitadas deben tener formato HH:mm.');
    });

    it('rechaza una hora de fin anterior o igual a la de inicio', () => {
        expect(validateRequest(payloadValido({
            horaInicioSolicitada: '11:30',
            horaFinSolicitada: '10:00'
        }))).toBe('La hora de finalización debe ser posterior a la hora de inicio.');

        expect(validateRequest(payloadValido({
            horaInicioSolicitada: '10:00',
            horaFinSolicitada: '10:00'
        }))).toBe('La hora de finalización debe ser posterior a la hora de inicio.');
    });

    it('rechaza cantidad de asistentes no entera o fuera de rango', () => {
        const esperado = 'La cantidad de asistentes debe ser un entero entre 1 y 999.';

        expect(validateRequest(payloadValido({ cantidadAsistentes: 0 }))).toBe(esperado);
        expect(validateRequest(payloadValido({ cantidadAsistentes: 1000 }))).toBe(esperado);
        expect(validateRequest(payloadValido({ cantidadAsistentes: 2.5 }))).toBe(esperado);
        expect(validateRequest(payloadValido({ cantidadAsistentes: 'tres' }))).toBe(esperado);
    });

    it('rechaza una modalidad desconocida', () => {
        expect(validateRequest(payloadValido({ modalidad: 'telepatia' })))
            .toBe('La modalidad debe ser presencial o virtual.');
    });

    it('rechaza textos de contacto que superan la longitud maxima', () => {
        const error = validateRequest(payloadValido({ nombreCliente: 'a'.repeat(161) }));

        expect(error).toBe('Uno de los datos de contacto supera la longitud permitida.');
    });

    it('rechaza motivo u observaciones que superan la longitud maxima', () => {
        const error = validateRequest(payloadValido({ motivo: 'a'.repeat(5001) }));

        expect(error).toBe('El motivo u observaciones superan la longitud permitida.');
    });

    it('devuelve el primer error encontrado en el orden de las reglas', () => {
        // Email y fecha invalidos a la vez: gana el email, que se valida primero.
        const error = validateRequest(payloadValido({
            emailCliente: 'invalido',
            fechaSolicitada: FECHA_PASADA
        }));

        expect(error).toBe('El correo electrónico no tiene un formato válido.');
    });
});
