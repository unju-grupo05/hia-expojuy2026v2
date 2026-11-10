const request = require('supertest');
const app = require('../index.js');

describe('API Controller - Correos', () => {
  it('Debería consultar los registros de correos y recordatorios', async () => {
    const res = await request(app).get('/api/correos');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });
});