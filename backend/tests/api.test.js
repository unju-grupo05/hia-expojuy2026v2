const request = require('supertest');
const app = require('../src/app'); // Asegurar exportación de app express

describe('Pruebas Integrales de API - Backend ExpoJuy', () => {

  // Test 1: Verificar disponibilidad del servicio de Salud (Healthcheck)
  test('1. GET /api/healthcheck debe responder 200 OK y estado "UP"', async () => {
    const res = await request(app).get('/api/healthcheck');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });

  // Test 2: Control de acceso a endpoints protegidos (Autenticación JWT)
  test('2. GET /api/admin/metrícas debe rebotar con 401 si no hay token JWT', async () => {
    const res = await request(app).get('/api/admin/metricas');
    expect(res.statusCode).toEqual(401);
  });

  // Test 3: Validación del Motor de Búsqueda Heurística / Chatbot PachAI
  test('3. POST /api/chatbot/query debe responder estructurado ante una consulta', async () => {
    const res = await request(app)
      .post('/api/chatbot/query')
      .send({ mensaje: '¿Dónde queda el stand de robótica?' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('respuesta');
  });
});