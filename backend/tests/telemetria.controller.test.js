jest.mock('../config/database', () => ({
  define: jest.fn().mockReturnValue({
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    hasOne: jest.fn()
  }),
  transaction: jest.fn().mockResolvedValue({
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue()
  })
}));

jest.mock('../src/models', () => {
  return {
    VisitaStand: {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn()
    },
    ResenaStand: {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn()
    },
    AsistenciaAgenda: {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn()
    },
    LogChatbot: {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      findByPk: jest.fn()
    },
    Stand: {
      findByPk: jest.fn()
    },
    Usuario: {
      findByPk: jest.fn()
    },
    Agenda: {
      findByPk: jest.fn()
    },
    Eje: {
      findByPk: jest.fn()
    },
    Expositor: {
      findByPk: jest.fn()
    }
  };
});

const { VisitaStand, ResenaStand, AsistenciaAgenda, LogChatbot, Stand, Usuario, Agenda } = require('../src/models');
const visitaStandCtrl = require('../src/controllers/visitaStand.controller');
const resenaStandCtrl = require('../src/controllers/resenaStand.controller');
const asistenciaAgendaCtrl = require('../src/controllers/asistenciaAgenda.controller');
const chatbotCtrl = require('../src/controllers/chatbot.controller');

describe('Telemetría y Nuevos Modelos Controller Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('VisitaStand Controller', () => {
    it('debe rechazar registro si faltan campos obligatorios', async () => {
      req.body = { stand_id: 'C92' };
      await visitaStandCtrl.registrarVisita(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('debe rechazar canal inválido', async () => {
      req.body = {
        stand_id: 'C92',
        canal: 'canal_inexistente',
        dispositivo: 'mobile_android',
        tiempo_permanencia_seg: 120
      };
      await visitaStandCtrl.registrarVisita(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Canal inválido') }));
    });

    it('debe registrar visita telemétrica con éxito cuando los datos son válidos', async () => {
      req.body = {
        stand_id: 'C92',
        canal: 'mapa_3d',
        dispositivo: 'desktop_chrome',
        tiempo_permanencia_seg: 45,
        calificacion: 5
      };
      Stand.findByPk.mockResolvedValue({ id: 'C92' });
      VisitaStand.create.mockResolvedValue({ id: 1, ...req.body });

      await visitaStandCtrl.registrarVisita(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('Telemetría de visita registrada')
      }));
    });
  });

  describe('ResenaStand Controller', () => {
    it('debe rechazar reseña con puntuación fuera de rango', async () => {
      req.body = {
        stand_id: 'C92',
        usuario_id: 'ADM-001',
        puntuacion: 10
      };
      await resenaStandCtrl.crearResena(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('entre 1 y 5') }));
    });

    it('debe crear reseña exitosamente', async () => {
      req.body = {
        stand_id: 'C92',
        usuario_id: 'ADM-001',
        puntuacion: 4,
        comentario: 'Excelente stand y presentación'
      };
      Stand.findByPk.mockResolvedValue({ id: 'C92' });
      Usuario.findByPk.mockResolvedValue({ legajo: 'ADM-001' });
      ResenaStand.create.mockResolvedValue({ id: 1, ...req.body });

      await resenaStandCtrl.crearResena(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('AsistenciaAgenda Controller', () => {
    it('debe inscribir usuario a una actividad de agenda', async () => {
      req.body = {
        agenda_id: 1,
        usuario_id: 'ADM-001'
      };
      Agenda.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ legajo: 'ADM-001' });
      AsistenciaAgenda.findOne.mockResolvedValue(null);
      AsistenciaAgenda.create.mockResolvedValue({ id: 1, agenda_id: 1, usuario_id: 'ADM-001', estado: 'inscripto' });

      await asistenciaAgendaCtrl.inscribir(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('debe rechazar inscripción duplicada', async () => {
      req.body = {
        agenda_id: 1,
        usuario_id: 'ADM-001'
      };
      Agenda.findByPk.mockResolvedValue({ id: 1 });
      Usuario.findByPk.mockResolvedValue({ legajo: 'ADM-001' });
      AsistenciaAgenda.findOne.mockResolvedValue({ id: 1, agenda_id: 1, usuario_id: 'ADM-001' });

      await asistenciaAgendaCtrl.inscribir(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('ya se encuentra registrado') }));
    });
  });

  describe('Chatbot Feedback y Analítica', () => {
    it('debe registrar feedback booleano para log de chatbot', async () => {
      req.params = { id: 10 };
      req.body = { fue_util: true };

      const mockLog = { id: 10, fue_util: null, save: jest.fn().mockResolvedValue() };
      LogChatbot.findByPk.mockResolvedValue(mockLog);

      await chatbotCtrl.registrarFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockLog.fue_util).toBe(true);
      expect(mockLog.save).toHaveBeenCalled();
    });

    it('debe obtener métricas analíticas del chatbot', async () => {
      LogChatbot.count.mockResolvedValueOnce(50).mockResolvedValueOnce(45);
      LogChatbot.findOne.mockResolvedValue({
        total_consultas: 50,
        latencia_promedio_ms: 28.5,
        total_evaluadas: 48
      });
      LogChatbot.findAll.mockResolvedValue([
        { intencion: 'agenda', total: 20, latencia_media_ms: 22.0 }
      ]);

      await chatbotCtrl.obtenerAnalitica(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ totalConsultas: 50 })
      }));
    });
  });
});
