const request = require('supertest');
const app = require('../index.js');

describe('API Controller - Galeria', () => {
  it('Debería consultar los eventos de la Galeria oficial', async () => {
    const res = await request(app).get('/api/galeria');
    expect([200, 404]).toContain(res.statusCode);
  });
});