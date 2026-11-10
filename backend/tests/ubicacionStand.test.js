const request = require('supertest');
const app = require('../index.js');

describe('API Controller - Ubicacion', () => {
  it('Debería consultar los eventos de la ubicacion', async () => {
    const res = await request(app).get('/api/ubicacion');
    expect([200, 404]).toContain(res.statusCode);
  });
});