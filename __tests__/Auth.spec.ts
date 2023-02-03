import { describe, expect, test, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import User from '../src/user/User';
import sequelize from '../src/config/database';
import { hash as _hash } from 'bcrypt';
import en from '../locales/en/translation.json';
import ko from '../locales/ko/translation.json';
import Token from '../src/auth/Token';
import { fail } from 'assert';

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true, cascade: true });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await _hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postAuthentication = async (
  credentials: { email?: string; password?: string },
  options: { language?: string } = {}
) => {
  const agent = request(app).post('/api/1.0/auth');
  if (options.language) {
    agent.set({ 'Accept-Language': options.language });
  }
  return await agent.send(credentials);
};

const postLogout = async (options: any = {}) => {
  const agent = request(app).post('/api/1.0/logout');
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('Authentication', () => {
  test('returns 200 when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(200);
  });
  test('returns only user id, username and token when login success', async () => {
    const user = await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'token']);
  });
  test('returns 401 when user does not exist', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user2@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(401);
  });
  test('returns proper error body when authentication fails', async () => {
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });
  test.each`
    language | message
    ${'en'}  | ${en.authentication_failure}
    ${'ko'}  | ${ko.authentication_failure}
  `(
    `returns $message when authentication fails and language is set as $language`,
    async ({ language, message }) => {
      const response = await postAuthentication(
        {
          email: 'user1@mail.com',
          password: 'wrong-password',
        },
        { language }
      );
      expect(response.body.message).toBe(message);
    }
  );
  test('returns 401 when password is wrong', async () => {
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'wrong-password',
    });
    expect(response.status).toBe(401);
  });
  test('returns 403 when loggin in with an inactive account', async () => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(403);
  });
  test('returns proper error body when loggin in with an inactive account', async () => {
    await addUser({ ...activeUser, inactive: true });
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });
  test.each`
    language | message
    ${'en'}  | ${en.authentication_failure}
    ${'ko'}  | ${ko.authentication_failure}
  `(
    `returns $message when authentication fails for inactive accountand language is set as $language`,
    async ({ language, message }) => {
      const response = await postAuthentication(
        {
          email: 'user1@mail.com',
          password: 'wrong-password',
        },
        { language }
      );
      expect(response.body.message).toBe(message);
    }
  );
  test('returns 401 when email is not valid', async () => {
    const response = await postAuthentication({
      password: 'P4ssword',
    });
    expect(response.status).toBe(401);
  });
  test('returns 401 when password is not valid', async () => {
    const response = await postAuthentication({
      email: 'user1@mail.com',
    });
    expect(response.status).toBe(401);
  });
  test('returns token in response body when credentials are correct', async () => {
    const user = await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.body.token).not.toBe(undefined);
  });
});
describe('logout', () => {
  test('returns 200 ok when unauthorized request send for logout', async () => {
    const response = await postLogout();
    expect(response.status).toBe(200);
  });
  test('removes the token from database', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const token = response.body.token;
    await postLogout({ token });
    const storedToken = await Token.findOne({ where: { token } });
    expect(storedToken).toBeNull();
  });
});
describe('Token Expiration', () => {
  const putUser = async (
    id: number = 5,
    body: any = null,
    options: any = {}
  ): Promise<any> => {
    const agent = request(app).put('/api/1.0/users/' + id);
    if (options.language) {
      agent.set('Accept-Language', options.language);
    }
    if (options.token) {
      agent.set('Authorization', `Bearer ${options.token}`);
    }
    return await agent.send(body);
  };
  test('returns 403 when token is older than 1 week', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1);
    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: oneWeekAgo,
    });
    const validUpdate = { username: 'user1-updated' };
    if (savedUser.id) {
      const response = await putUser(savedUser.id, validUpdate, { token });
      expect(response.status).toBe(403);
    } else {
      fail();
    }
  });
  test('refreshes lastUsedAt when unexpired token is used', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });
    const validUpdate = { username: 'user1-updated' };
    const rightBeforeSendingRequest = new Date();
    if (savedUser.id) {
      await putUser(savedUser.id, validUpdate, { token });
      const tokenInDB = await Token.findOne({ where: { token } });
      expect(tokenInDB?.lastUsedAt.getTime()).toBeGreaterThan(
        rightBeforeSendingRequest.getTime()
      );
    } else {
      fail();
    }
  });
  test('refreshes lastUsedAt when unexpired token is used for unauthenticated endpoint', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });
    const rightBeforeSendingRequest = new Date();
    if (savedUser.id) {
      const response = await request(app)
        .get('/api/1.0/users/5')
        .set('Authorization', `Bearer ${token}`)
        .send();
      const tokenInDB = await Token.findOne({ where: { token } });
      expect(tokenInDB?.lastUsedAt.getTime()).toBeGreaterThan(
        rightBeforeSendingRequest.getTime()
      );
    } else {
      fail();
    }
  });
});
