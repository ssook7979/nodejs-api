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
import bcrypt from 'bcrypt';
import app from '../src/app';
import en from '../locales/en/translation.json';
import ko from '../locales/ko/translation.json';
import User from '../src/user/User';
import sequelize from '../src/config/database';
import Token from '../src/auth/Token';

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

const addUser = async (user: any = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
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

const putPasswordUpdate = (body = {}, options: any = {}) => {
  const agent = request(app).put('/api/1.0/user/password');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(body);
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
  describe('Password Update', () => {
    test('returns 403 when password update request does not have the valid pasword', async () => {
      const response = await putPasswordUpdate({
        password: 'P4ssword',
        passwordResetToken: 'abcd',
      });
      expect(response.status).toBe(403);
    });
  });
  test.each`
    language | message
    ${'ko'}  | ${ko.unauthorized_password_reset}
    ${'en'}  | ${en.unauthorized_password_reset}
  `(
    'returns $message when language is $language after trying to update with invalid token',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putPasswordUpdate(
        { password: 'P4ssword', passwordResetToken: 'abcd' },
        { language }
      );
      expect(response.body.path).toBe('/api/1.0/user/password');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
  test('returns 403 when password update request with invalid password pattern and reset token is invalid', async () => {
    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });
  test('returns 400 invalid when trying to update with invalid password pattern and reset token is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    const resposne = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'test-token',
    });
    expect(resposne.status).toBe(400);
  });
  test.each`
    language | password          | message
    ${'en'}  | ${null}           | ${en.password_null}
    ${'en'}  | ${'pass'}         | ${en.password_size}
    ${'en'}  | ${'passpass'}     | ${en.password_invalid}
    ${'en'}  | ${'ALLUPPERCASE'} | ${en.password_invalid}
    ${'en'}  | ${'12341234'}     | ${en.password_invalid}
    ${'en'}  | ${'lowerUpper'}   | ${en.password_invalid}
    ${'en'}  | ${'Upperlower'}   | ${en.password_invalid}
    ${'en'}  | ${'UPPER1234'}    | ${en.password_invalid}
    ${'en'}  | ${'lower1234'}    | ${en.password_invalid}
    ${'ko'}  | ${null}           | ${ko.password_null}
    ${'ko'}  | ${'pass'}         | ${ko.password_size}
    ${'ko'}  | ${'passpass'}     | ${ko.password_invalid}
    ${'ko'}  | ${'ALLUPPERCASE'} | ${ko.password_invalid}
    ${'ko'}  | ${'12341234'}     | ${ko.password_invalid}
    ${'ko'}  | ${'lowerUpper'}   | ${ko.password_invalid}
    ${'ko'}  | ${'Upperlower'}   | ${ko.password_invalid}
    ${'ko'}  | ${'UPPER1234'}    | ${ko.password_invalid}
    ${'ko'}  | ${'lower1234'}    | ${ko.password_invalid}
  `(
    `returns validation error $message when language is set to $language and the value is $password`,
    async ({ language, password, message }) => {
      const user = await addUser();
      user.passwordResetToken = 'test-token';
      await user.save();
      const resposne = await putPasswordUpdate(
        {
          password,
          passwordResetToken: 'test-token',
        },
        { language }
      );
      expect(resposne.body.validationErrors['password']).toBe(message);
    }
  );
  test('returns 200 when valid password is sent with valid reset token', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    const resposne = await putPasswordUpdate({
      password: 'Passw0rd',
      passwordResetToken: 'test-token',
    });
    expect(resposne.status).toBe(200);
  });
  test('updates the password in database when the request is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    const resposne = await putPasswordUpdate({
      password: 'Passw0rd',
      passwordResetToken: 'test-token',
    });
    const userInDB = await User.findOne({ where: { email: 'user1@mail.com' } });
    if (!userInDB) fail();
    expect(userInDB.password).not.toBe(user.password);
  });
  test('clears the reset token in database when the request is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    const resposne = await putPasswordUpdate({
      password: 'Passw0rd',
      passwordResetToken: 'test-token',
    });
    const userInDB = await User.findOne({ where: { email: 'user1@mail.com' } });
    if (!userInDB) fail();
    expect(userInDB.passwordResetToken).toBeFalsy();
  });
  test('activate and clears the activation token if the account is inactive', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    user.activationToken = 'activation-token';
    user.inactive = true;
    await user.save();
    const resposne = await putPasswordUpdate({
      password: 'Passw0rd',
      passwordResetToken: 'test-token',
    });
    const userInDB = await User.findOne({ where: { email: 'user1@mail.com' } });
    if (!userInDB) fail();
    expect(userInDB.activationToken).toBeFalsy();
    expect(userInDB.inactive).toBe(false);
  });
  test('clears all tokens of user after valid password reset', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    await Token.create({
      token: 'token-1',
      userId: user.id,
      lastUsedAt: new Date(),
    });
    await putPasswordUpdate({
      password: 'Passw0rd',
      passwordResetToken: 'test-token',
    });
    const tokens = await Token.findAll({ where: { userId: user.id } });
    expect(tokens.length).toBe(0);
  });
});
