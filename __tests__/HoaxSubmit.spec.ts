import { describe, expect, test, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';

const postHoax = (body?: any) => {
  return request(app).post('/api/1.0/hoaxes').send(body);
};

describe('Post hoax', () => {
  test('returns 401 when hoax post request has no authentication', async () => {
    const response = await postHoax();
    expect(response.status).toBe(401);
  });
});

describe('Post Hoax', () => {
test('returns 401 when hoax post request has no authentication', async () => {
    postHoax({})
})
})