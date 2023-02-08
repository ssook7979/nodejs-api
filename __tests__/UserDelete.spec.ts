import {
  describe,
  expect,
  test,
  beforeAll,
  beforeEach,
  afterAll,
  jest,
} from '@jest/globals';
import request from 'supertest';
import { hash as _hash } from 'bcrypt';
import app from '../src/app';
import User from '../src/user/User';
import sequelize from '../src/config/database';
import en from '../locales/en/translation.json';
import ko from '../locales/ko/translation.json';
import Token from '../src/auth/Token';

beforeAll(async () => {
  await sequelize.sync();
  jest.setTimeout(20000);
});

beforeEach(async () => {
  await User.destroy({ truncate: true, cascade: true });
});

afterAll(async () => {
  jest.setTimeout(5000);
});

const deleteUser = async (id: number = 5, options: any = {}): Promise<any> => {
  const agent = request(app).delete('/api/1.0/users/' + id);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return await agent.send();
};

const addUser = async (user = { ...activeUser }): Promise<any> => {
  const hash = await _hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const auth = async (options: any = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app)
      .post('/api/1.0/auth')
      .send(options.auth);
    token = response.body.token;
  }
  return token;
};

describe('User delete', () => {
  test('returns forbidden when request sent unauthorization', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });
  test.each`
    language | message
    ${'ko'}  | ${ko.unauthorized_user_delete}
    ${'en'}  | ${en.unauthorized_user_delete}
  `(
    `returns error body with $message for unauthorized request when language is set to $language`,
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await deleteUser(5, { language });
      const body = response.body;

      expect(response.status).toBe(403);
      expect(body.path).toBe('/api/1.0/users/5');
      expect(body.timestamp).toBeGreaterThan(nowInMillis);
      expect(body.message).toBe(message);
    }
  );
  test('returns forbidden when delete request is sent with correct credentials but for different user', async () => {
    await addUser();
    const userToBeDelete = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com',
    });
    const token = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    const response = await deleteUser(userToBeDelete.id, {
      auth: { email: 'user1000@mail', password: 'password' },
    });
    expect(response.status).toBe(403);
  });
  test('returns 403 when token is not valid', async () => {
    const response = await deleteUser(5, { token: '1234' });
    expect(response.status).toBe(403);
  });
  test('returns 200 ok when request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    const response = await deleteUser(savedUser.id, {
      token,
    });
    expect(response.status).toBe(200);
  });
  test('deletes user from database when request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    await deleteUser(savedUser.id, { token });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser).toBeNull();
  });
  test('deletes token from database when delete user request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token1 = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    const token2 = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    await deleteUser(savedUser.id, { token: token1 });

    //await Token.destroy({ where: { userId: savedUser.id } });
    //expect(await Token.findAll({ where: { userId: savedUser.id } })).toBeNull();
    //expect(await Token.findAll()).toBeNull();
    expect(await Token.findOne({ where: { token: token2 } })).toBeNull();
  });
});
