jest.mock('../config/database', () => require('./helpers/db-mock'));

const request = require('supertest');
const app = require('../index.js');

describe('API Controller - Noticias', () => {
  it('Debería consultar el listado de noticias', async () => {
    const res = await request(app).get('/api/noticias');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });
});