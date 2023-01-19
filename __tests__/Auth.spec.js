const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const en = require('../locales/en/translation.json');
const ko = require('../locales/ko/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postAuthentication = async (credentials, options = {}) => {
  const agent = request(app).post('/api/1.0/auth');
  if (options.language) {
    agent.set({ 'Accept-Language': options.language });
  }
  return await agent.send(credentials);
};

describe('Authentication', () => {
  it('returns 200 when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(200);
  });
  it('returns only user id and username when login success', async () => {
    const user = await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username']);
  });
  it('returns 401 when user does not exist', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user2@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(401);
  });
  it('returns proper error body when authentication fails', async () => {
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
  it.each`
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
  it('returns 401 when password is wrong', async () => {
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'wrong-password',
    });
    expect(response.status).toBe(401);
  });
  it('returns 403 when loggin in with an inactive account', async () => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(403);
  });
  it('returns proper error body when loggin in with an inactive account', async () => {
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
  it.each`
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
  it('returns 401 when email is not valid', async () => {
    const response = await postAuthentication({ password: 'P4ssword' });
    expect(response.status).toBe(401);
  });
  it('returns 401 when password is not valid', async () => {
    const response = await postAuthentication({ email: 'user1@mail.com' });
    expect(response.status).toBe(401);
  });
});
