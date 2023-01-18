const request = require('supertest');
const app = require('../src/app');

describe('Listing Users', () => {
  it('returns 200 ok when there are no user in database', async () => {
    const response = await request(app).get('/api/1.0users');
    expect(response.status).toBe(200);
  });
  it('returns page object as response body', async () => {
    const response = await request(app).get('/api/1.0users');
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });
});
