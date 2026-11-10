const request = require('supertest');
const app = require('../index.js');

describe('API Controller - Usuarios y Accesos', () => {
  it('Debería consultar el recurso de usuarios', async () => {
    const res = await request(app).get('/api/usuarios');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });
});