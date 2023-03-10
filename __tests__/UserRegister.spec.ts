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
import config from 'config';
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

  server.listen(config.get('mail.port'), '127.0.0.1');
  await sequelize.sync().finally();
  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: true, cascade: true });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};

type TInputUser = {
  username?: string | null;
  email?: string | null;
  password?: string | null;
  inactive?: boolean | null;
};

const postUser = (
  user: TInputUser = validUser,
  options: { language?: string } = {}
) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(user);
};

describe('User Registration', () => {
  test('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  test('returns success message when signup is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe(en.user_create_success);
  });

  test('saves the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  test('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(userList.length).toBe(1);
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  test('hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(userList.length).toBe(1);
    expect(savedUser.password).not.toBe('P4ssword');
  });

  test('returns 400 when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(400);
  });

  test('returns errors for both when username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  test.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${en.username_null}
    ${'username'} | ${'usr'}            | ${en.username_size}
    ${'username'} | ${'a'}              | ${en.username_size}
    ${'email'}    | ${null}             | ${en.email_null}
    ${'email'}    | ${'email.com'}      | ${en.email_invalid}
    ${'email'}    | ${'@email.com'}     | ${en.email_invalid}
    ${'email'}    | ${'user.email.com'} | ${en.email_invalid}
    ${'password'} | ${null}             | ${en.password_null}
    ${'password'} | ${'pass'}           | ${en.password_size}
    ${'password'} | ${'passpass'}       | ${en.password_invalid}
    ${'password'} | ${'ALLUPPERCASE'}   | ${en.password_invalid}
    ${'password'} | ${'12341234'}       | ${en.password_invalid}
    ${'password'} | ${'lowerUpper'}     | ${en.password_invalid}
    ${'password'} | ${'Upperlower'}     | ${en.password_invalid}
    ${'password'} | ${'UPPER1234'}      | ${en.password_invalid}
    ${'password'} | ${'lower1234'}      | ${en.password_invalid}
  `(
    `returns $expectedMessage when $field is invalid($value).`,
    async ({ field, value, expectedMessage }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword',
      };
      if (
        field &&
        (field === 'username' || field === 'password' || field === 'email')
      ) {
        user[field] = value || '';
        const response = await postUser(user);
        const body = response.body;
        expect(body.validationErrors[field || '']).toBe(expectedMessage);
      }
    }
  );
  /*
  it.each([
    ['username', 'Username cannot be null.'],
    ['email', 'Email cannot be null.'],
    ['password', 'Password cannot be null.'],
  ])('when %s is null %s is received', async (field, expectedMessage) => {
    const user = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword',
    };
    user[field] = null;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });*/
  test('returns Email in use when same email is already in use', async () => {
    await postUser({ ...validUser });
    const response = await postUser({ ...validUser });
    expect(response.body.validationErrors.email).toBe(en.email_in_use);
  });
  test('returns errors for both username is null and email is in use', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4sword',
    });
    expect(Object.keys(response.body.validationErrors)).toEqual([
      'username',
      'email',
    ]);
  });
  test('returns success message when signup is valid', async () => {
    const response = await postUser({ ...validUser }, { language: 'ko' });
    expect(response.body.message).toBe(ko.user_create_success);
  });
  test('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  test('creates user in inactive mode even the request body contains inactive as false', async () => {
    await postUser({ ...validUser, inactive: false });
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  test('creates an activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });
  test('sends an Account activation email with activationToken', async () => {
    await postUser();

    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });
  test('returns 502 Bad Gateway when sending email fails', async () => {
    // const mockSendAccountActivation = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
    // mockSendAccountActivation.mockRestore();
  });
  test('returns Email failure message when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe('Email failure.');
  });
  test('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });
  test('returns Validation failure message in error response body when validation falis', async () => {
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });
    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internationalization', () => {
  test.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${ko.username_null}
    ${'username'} | ${'usr'}            | ${ko.username_size}
    ${'username'} | ${'a'}              | ${ko.username_size}
    ${'email'}    | ${null}             | ${ko.email_null}
    ${'email'}    | ${'email.com'}      | ${ko.email_invalid}
    ${'email'}    | ${'@email.com'}     | ${ko.email_invalid}
    ${'email'}    | ${'user.email.com'} | ${ko.email_invalid}
    ${'password'} | ${null}             | ${ko.password_null}
    ${'password'} | ${'pass'}           | ${ko.password_size}
    ${'password'} | ${'passpass'}       | ${ko.password_invalid}
    ${'password'} | ${'ALLUPPERCASE'}   | ${ko.password_invalid}
    ${'password'} | ${'12341234'}       | ${ko.password_invalid}
    ${'password'} | ${'lowerUpper'}     | ${ko.password_invalid}
    ${'password'} | ${'Upperlower'}     | ${ko.password_invalid}
    ${'password'} | ${'UPPER1234'}      | ${ko.password_invalid}
    ${'password'} | ${'lower1234'}      | ${ko.password_invalid}
  `(
    `returns $expectedMessage when $field is invalid($value).`,
    async ({ field, value, expectedMessage }) => {
      const user: TInputUser = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword',
      };
      if (
        field &&
        (field === 'username' || field === 'password' || field === 'email')
      ) {
        user[field] = value || '';
        const response = await postUser(user, { language: 'ko' });
        const body = response.body;
        expect(body.validationErrors[field]).toBe(expectedMessage);
      }
    }
  );
  test(`returns "${en.email_failure}" when sending email fails`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'ko' });
    expect(response.body.message).toBe(ko.email_failure);
  });
  test(`returns "${ko.validation_failure}" message in error response body when validation falis`, async () => {
    const response = await postUser(
      {
        username: null,
        email: validUser.email,
        password: 'P4ssword',
      },
      { language: 'ko' }
    );
    expect(response.body.message).toBe(ko.validation_failure);
  });
});
describe('Account activation', () => {
  test('activates the account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });
  test('removes the token from user table after successful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });
  test('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    expect(response.status).toBe(400);
  });
  test.each`
    language | tokenStatus  | message
    ${'ko'}  | ${'wrong'}   | ${ko.account_activation_failure}
    ${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
    ${'ko'}  | ${'correct'} | ${ko.account_activation_success}
    ${'en'}  | ${'correct'} | ${en.account_activation_success}
  `(
    'returns $message when $tokenStatus token is sent and language is $language',
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token;
      if (tokenStatus === 'correct') {
        let users = await User.findAll();
        token = users[0].activationToken;
      } else {
        token = 'this-token-does-not-exist';
      }
      const response = await request(app)
        .post('/api/1.0/users/token/' + token)
        .set('Accept-Language', language)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});
describe('Error Model', () => {
  test('returns path, timestamp, message and validationErrors in response when validation fails', async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;

    expect(Object.keys(body)).toEqual([
      'path',
      'timestamp',
      'message',
      'validationErrors',
    ]);
  });
  test('returns path, timestamp and message in response when request fails other than validation', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(response.status).toBe(400);
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });
  test('returns path in error body', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(response.status).toBe(400);
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });
  test('returns timestamp in milliseconds within 5 seconds value in error body', async () => {
    const nowInMillis = new Date().getTime();
    const fiveSecondsLater = nowInMillis + 5 * 1000;
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(response.status).toBe(400);
    expect(body.timestamp).toBeGreaterThan(nowInMillis);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
