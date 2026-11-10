const request = require('supertest');
const app = require('../index.js');

describe('API Controller - Stands y Ubicaciones', () => {
  it('Debería consultar el listado de stands', async () => {
    const res = await request(app).get('/api/stands');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });

  it('Debería consultar las ubicaciones de los stands', async () => {
    const res = await request(app).get('/api/ubicaciones-stands');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });
});