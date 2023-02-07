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
import { SMTPServer } from 'smtp-server';
import config from 'config';
import { fail } from 'assert';
import { hash as _hash } from 'bcrypt';
import app from '../src/app';
import en from '../locales/en/translation.json';
import ko from '../locales/ko/translation.json';
import User from '../src/user/User';
import sequelize from '../src/config/database';

let lastMail: string, server: SMTPServer;
let simulateSmtpFailure = false;

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: true, cascade: true });
});

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

  server.listen(config.get('mail.port'), '127.0.0.1');
  await sequelize.sync().finally();
  jest.setTimeout(20000);
});

afterAll(async () => {
  await server.close();
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

const postPasswordReset = async (
  email = 'user1@mail.com',
  options: any = {}
) => {
  const agent = request(app).post('/api/1.0/user/password');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send({ email });
};

describe('Password Reset Request', () => {
  test('returns 404 when a password reset request is sent for unknown e-mail', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });
  test.each`
    language | message
    ${'ko'}  | ${ko.email_not_inuse}
    ${'en'}  | ${en.email_not_inuse}
  `(
    'returns $message for unknown email for password reset request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset('user1@mail.com', { language });
      expect(response.body.path).toBe('/api/1.0/user/password');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
  test.each`
    language | message
    ${'ko'}  | ${ko.email_invalid}
    ${'en'}  | ${en.email_invalid}
  `(
    'returns 400 with validation error response having $message when request has invalid email and language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset('user1@mail', { language });
      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );
  test('returns 200 ok when a password reset request is sent for known e-mail', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(200);
  });
  test.each`
    language | message
    ${'ko'}  | ${ko.password_reset_request_success}
    ${'en'}  | ${en.password_reset_request_success}
  `(
    'returns success response body with $message for known email for password reset request when language is $language',
    async ({ language, message }) => {
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });
      expect(response.body.message).toBe(message);
    }
  );
  test('creates passwordResetToken when a password reset request is sent', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    if (userInDB) {
      expect(userInDB.passwordResetToken).not.toBeNull();
    } else {
      fail();
    }
  });
  test('sens a password reset email with passwordResetToken', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    const passwordResetToken = userInDB?.passwordResetToken;
    expect(lastMail).toContain(userInDB?.email);
    expect(lastMail).toContain(userInDB?.passwordResetToken);
  });
  test('it returns 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(502);
  });
  test.each`
    language | message
    ${'ko'}  | ${ko.email_failure}
    ${'en'}  | ${en.email_failure}
  `(
    'returns $message for unknown email for password reset request when language is $language',
    async ({ language, message }) => {
      simulateSmtpFailure = true;
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });
      expect(response.body.message).toBe(message);
    }
  );
});
