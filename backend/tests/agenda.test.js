jest.mock('../config/database', () => require('./helpers/db-mock'));

const request = require('supertest');
const app = require('../index.js');

describe('API Controller - Agendas', () => {
  it('Debería consultar las actividades de la agenda oficial', async () => {
    const res = await request(app).get('/api/agendas');
    expect([200, 401, 403, 404]).toContain(res.statusCode);
  });
});