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
import { SMTPServer } from 'smtp-server';

let lastMail: string, server: SMTPServer;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    secure: false,
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody: string;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('invalid mailbox');
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
      stream.on('error', (e) => console.log(e));
      stream.on('connect', (info) => console.log(info));
    },
  });

  server.listen(8587, '127.0.0.1');
  await sequelize.sync();
  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const putUser = async (
  id: number = 5,
  body: any = null,
  options: any = {}
): Promise<any> => {
  const agent = request(app).put('/api/1.0/users/' + id);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (options.auth) {
    const { email, password } = options.auth;
    /*
     * manually...
    const merged = `${email}:${password}`;
    const base64 = Buffer.from(merged).toString('base64');
    agent.set('Authorization', base64);
    */
    agent.auth(email, password);
  }
  return await agent.send(body);
};

const addUser = async (user = { ...activeUser }): Promise<any> => {
  const hash = await _hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

describe('User update', () => {
  test('returns forbidden when request sent without basic authorization', async () => {
    const response = await putUser();
    expect(response.status).toBe(403);
  });
  test.each`
    language | message
    ${'ko'}  | ${ko.unauthorized_user_update}
    ${'en'}  | ${en.unauthorized_user_update}
  `(
    `returns error body with $message for unauthorized request when language is set to $language`,
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putUser(5, null, { language });
      const body = response.body;

      expect(response.status).toBe(403);
      expect(body.path).toBe('/api/1.0/users/5');
      expect(body.timestamp).toBeGreaterThan(nowInMillis);
      expect(body.message).toBe(message);
    }
  );
  test('returns forbidden when update request is sent with incorrect email in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: { email: 'user1000@mail', password: 'P4ssword' },
    });
    expect(response.status).toBe(403);
  });
  test('returns forbidden when update request is sent with correct credentials but for different user', async () => {
    const userToBeUpdated = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com',
    });
    const response = await putUser(userToBeUpdated.id, null, {
      auth: { email: 'user1000@mail', password: 'password' },
    });
    expect(response.status).toBe(403);
  });
  test('returns forbidden when update request is sent by inactive user with correct credentials and for its own user', async () => {
    const inactiveUser = await addUser({
      ...activeUser,
      inactive: true,
    });
    const response = await putUser(inactiveUser.id, null, {
      auth: { email: 'user1000@mail', password: 'password' },
    });
    expect(response.status).toBe(403);
  });
  test('returns 200 ok when valid update request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: 'user1@mail', password: 'P4ssword' },
    });
  });
  test('updates username in database when valid update request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser?.username).toBe(validUpdate.username);
  });
});
