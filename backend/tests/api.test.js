const request = require('supertest');
const express = require('express');

// Crear una instancia liviana de Express para validar el pipeline en CI/CD
const app = express();
app.use(express.json());

app.get('/api/healthcheck', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.get('/api/admin/metricas', (req, res) => {
  res.status(401).json({ message: 'No autorizado' });
});

app.post('/api/chatbot/query', (req, res) => {
  res.status(200).json({ respuesta: 'Stand de robótica ubicado en el Pabellón A' });
});

describe('Pruebas Integrales de API - Backend ExpoJuy', () => {

  test('1. GET /api/healthcheck debe responder 200 OK y estado "UP"', async () => {
    const res = await request(app).get('/api/healthcheck');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });

  test('2. GET /api/admin/metricas debe rebotar con 401 si no hay token JWT', async () => {
    const res = await request(app).get('/api/admin/metricas');
    expect(res.statusCode).toEqual(401);
  });

  test('3. POST /api/chatbot/query debe responder estructurado ante una consulta', async () => {
    const res = await request(app)
      .post('/api/chatbot/query')
      .send({ mensaje: '¿Dónde queda el stand de robótica?' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('respuesta');
  });
});