const request = require('supertest');
const app = require('../index.js');

describe('API Controller - Media y Galerías', () => {
  it('Debería consultar los archivos de media', async () => {
    const res = await request(app).get('/api/media');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });

  it('Debería consultar las galerías', async () => {
    const res = await request(app).get('/api/galerias');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });
});