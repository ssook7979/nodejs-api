import { describe, expect, test, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import User from '../src/user/User';
import sequelize from '../src/config/database';
import { user_not_found } from '../locales/en/translation.json';
import { user_not_found as _user_not_found } from '../locales/ko/translation.json';

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true, cascade: true });
});

const auth = async (auth: { email: string; password: string }) => {
  let token;
  if (auth) {
    const response = await request(app).post('/api/1.0/auth').send(auth);
    token = response.body.token;
  }
  return token;
};

const getUsers = (options: any = {}) => {
  const agent = request(app).get('/api/1.0/users');
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

const addUsers = async (activeUserCount: number, inactiveUserCount = 0) => {
  const hash = await bcrypt.hash('P4ssword', 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
      password: hash,
    });
  }
};

const getUser = async (id: number | null) => {
  return request(app).get('/api/1.0/users/' + id);
};

describe('Listing Users', () => {
  test('returns 200 ok when there are no user in database', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });
  test('returns page object as response body', async () => {
    const response = await getUsers();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });
  test('returns 10 users in page content when there are 11 users in database', async () => {
    await addUsers(11);
    const response = await request(app).get('/api/1.0/users');
    expect(response.body.content.length).toBe(10);
  });
  test('returns 6 users in page content when there are active 6 users and inactive 5 users in database', async () => {
    await addUsers(6, 5);
    const response = await getUsers();
    expect(response.body.content.length).toBe(6);
  });
  test('returns only id, username, email and image in content array for each user', async () => {
    await addUsers(11);
    const response = await getUsers();
    const user = response.body.content[0];
    expect(Object.keys(user)).toEqual(['id', 'username', 'email', 'image']);
  });
  test('returns 2 as totalPages when there are 15 active and 7 inactive users in database', async () => {
    await addUsers(15, 7);
    const response = await getUsers();
    expect(response.body.totalPages).toBe(2);
  });
  test('returns second page users and page indicator when page is set as 1 ', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: 1 });
    expect(response.body.content[0].username).toBe('user11');
    expect(response.body.page).toBe(1);
  });
  test('returns first page users when page is set below zero as request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: -5 });
    expect(response.body.page).toBe(0);
  });
  test('returns 5 users and corresponding size indicator when size is set as 5 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 5 });
    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });
  test('returns 10 users and corresponding size indicator when size is set as 1000 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 1000 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });
  test('returns 10 users and corresponding size indicator when size is set as 0 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 1000 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });
  test('returns paze as zero and size as 10 when non numeric query params provided for both', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 'size', page: 'page' });
    expect(response.body.page).toBe(0);
    expect(response.body.size).toBe(10);
  });
  test('returns user page without logged in user when request has valid authentication', async () => {
    await addUsers(11);
    const token = await auth({ email: 'user1@mail.com', password: 'P4ssword' });
    const response = await getUsers({ token });
    expect(response.body.totalPages).toBe(1);
  });
});
describe('Get User', () => {
  test('returns 404 when user not found', async () => {
    const response = await getUser(5);
    expect(response.status).toBe(404);
  });
  test.each`
    language | message
    ${'en'}  | ${user_not_found}
    ${'ko'}  | ${_user_not_found}
  `(
    `returns $message for unknown user when language is set to $language`,
    async () => {}
  );
  test('returns proper error when user not found', async () => {
    const nowInMillis = new Date().getTime();
    const response = await getUser(5);
    const error = response.body;
    expect(error.path).toBe('/api/1.0/users/5');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });
  test('returns 200 when an active user exists', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail.com',
      inactive: false,
    });
    const response = await getUser(user.id);
    expect(response.status).toBe(200);
  });
  test('returns id, username, email and image in response body when an active user exists', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail.com',
      inactive: false,
    });
    const response = await getUser(user.id);
    expect(Object.keys(response.body)).toEqual([
      'id',
      'username',
      'email',
      'image',
    ]);
  });
  test('returns 404 when the user is inactive', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail.com',
      inactive: true,
    });
    const response = await getUser(user.id);
    expect(response.status).toBe(404);
  });
  test('returns user page without logged in user when request has valid authentication', async () => {
    await addUsers(11);
    const token = await auth({ email: 'user1@mail.com', password: 'P4ssword' });
    const response = await getUsers({ token });
    expect(response.body.totalPages).toBe(1);
  });
});
