import request from 'supertest';
import app from '../src/app';
import { destroy, findAll } from '../src/user/User';
import { sync } from '../src/config/database';
import {
  user_create_success,
  username_null,
  username_size,
  email_null,
  email_invalid,
  password_null,
  password_size,
  password_invalid,
  email_in_use,
  validation_failure,
  account_activation_failure,
  account_activation_success,
} from '../locales/en/translation.json';
import {
  user_create_success as _user_create_success,
  username_null as _username_null,
  username_size as _username_size,
  email_null as _email_null,
  email_invalid as _email_invalid,
  password_null as _password_null,
  password_size as _password_size,
  password_invalid as _password_invalid,
  email_failure,
  validation_failure as _validation_failure,
  account_activation_failure as _account_activation_failure,
  account_activation_success as _account_activation_success,
} from '../locales/ko/translation.json';
import { SMTPServer } from 'smtp-server';

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  // TODO: resolve connection error
  server = new SMTPServer({
    secure: false,
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('invalid mailbox');
          err.responseCode = 553;
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
  await sync();
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
});

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};

const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(user);
};

describe('User Registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe(user_create_success);
  });

  it('saves the user to database', async () => {
    await postUser();
    const userList = await findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await findAll();
    const savedUser = userList[0];
    expect(userList.length).toBe(1);
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const userList = await findAll();
    const savedUser = userList[0];
    expect(userList.length).toBe(1);
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('returns 400 when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(400);
  });

  it('returns errors for both when username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${username_null}
    ${'username'} | ${'usr'}            | ${username_size}
    ${'username'} | ${'a'}              | ${username_size}
    ${'email'}    | ${null}             | ${email_null}
    ${'email'}    | ${'email.com'}      | ${email_invalid}
    ${'email'}    | ${'@email.com'}     | ${email_invalid}
    ${'email'}    | ${'user.email.com'} | ${email_invalid}
    ${'password'} | ${null}             | ${password_null}
    ${'password'} | ${'pass'}           | ${password_size}
    ${'password'} | ${'passpass'}       | ${password_invalid}
    ${'password'} | ${'ALLUPPERCASE'}   | ${password_invalid}
    ${'password'} | ${'12341234'}       | ${password_invalid}
    ${'password'} | ${'lowerUpper'}     | ${password_invalid}
    ${'password'} | ${'Upperlower'}     | ${password_invalid}
    ${'password'} | ${'UPPER1234'}      | ${password_invalid}
    ${'password'} | ${'lower1234'}      | ${password_invalid}
  `(
    `returns $expectedMessage when $field is invalid($value).`,
    async ({ field, value, expectedMessage }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
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
  it('returns Email in use when same email is already in use', async () => {
    await postUser({ ...validUser });
    const response = await postUser({ ...validUser });
    expect(response.body.validationErrors.email).toBe(email_in_use);
  });
  it('returns errors for both username is null and email is in use', async () => {
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
  it('returns success message when signup is valid', async () => {
    const response = await postUser({ ...validUser }, { language: 'ko' });
    expect(response.body.message).toBe(_user_create_success);
  });
  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  it('creates user in inactive mode even the request body contains inactive as false', async () => {
    await postUser({ ...validUser, inactive: false });
    const users = await findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  it('creates an activationToken for user', async () => {
    await postUser();
    const users = await findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });
  it('sends an Account activation email with activationToken', async () => {
    await postUser();

    const users = await findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });
  it('returns 502 Bad Gateway when sending email fails', async () => {
    // const mockSendAccountActivation = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
    // mockSendAccountActivation.mockRestore();
  });
  it('returns Email failure message when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe('Email failure.');
  });
  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await findAll();
    expect(users.length).toBe(0);
  });
  it('returns Validation failure message in error response body when validation falis', async () => {
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });
    expect(response.body.message).toBe(validation_failure);
  });
});

describe('Internationalization', () => {
  it.each`
    field         | value               | expectedMessage
    ${'username'} | ${null}             | ${_username_null}
    ${'username'} | ${'usr'}            | ${_username_size}
    ${'username'} | ${'a'}              | ${_username_size}
    ${'email'}    | ${null}             | ${_email_null}
    ${'email'}    | ${'email.com'}      | ${_email_invalid}
    ${'email'}    | ${'@email.com'}     | ${_email_invalid}
    ${'email'}    | ${'user.email.com'} | ${_email_invalid}
    ${'password'} | ${null}             | ${_password_null}
    ${'password'} | ${'pass'}           | ${_password_size}
    ${'password'} | ${'passpass'}       | ${_password_invalid}
    ${'password'} | ${'ALLUPPERCASE'}   | ${_password_invalid}
    ${'password'} | ${'12341234'}       | ${_password_invalid}
    ${'password'} | ${'lowerUpper'}     | ${_password_invalid}
    ${'password'} | ${'Upperlower'}     | ${_password_invalid}
    ${'password'} | ${'UPPER1234'}      | ${_password_invalid}
    ${'password'} | ${'lower1234'}      | ${_password_invalid}
  `(
    `returns $expectedMessage when $field is invalid($value).`,
    async ({ field, value, expectedMessage }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await postUser(user, { language: 'ko' });
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );
  it(`returns "${email_failure}" when sending email fails`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'ko' });
    expect(response.body.message).toBe(email_failure);
  });
  it(`returns "${_validation_failure}" message in error response body when validation falis`, async () => {
    const response = await postUser(
      {
        username: null,
        email: validUser.email,
        password: 'P4ssword',
      },
      { language: 'ko' }
    );
    expect(response.body.message).toBe(_validation_failure);
  });
});
describe('Account activation', () => {
  it('activates the account when correct token is sent', async () => {
    await postUser();
    let users = await findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await findAll();
    expect(users[0].inactive).toBe(false);
  });
  it('removes the token from user table after successful activation', async () => {
    await postUser();
    let users = await findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await findAll();
    expect(users[0].activationToken).toBeFalsy();
  });
  it('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    expect(response.status).toBe(400);
  });
  it.each`
    language | tokenStatus  | message
    ${'ko'}  | ${'wrong'}   | ${_account_activation_failure}
    ${'en'}  | ${'wrong'}   | ${account_activation_failure}
    ${'ko'}  | ${'correct'} | ${_account_activation_success}
    ${'en'}  | ${'correct'} | ${account_activation_success}
  `(
    'returns $message when $tokenStatus token is sent and language is $language',
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token;
      if (tokenStatus === 'correct') {
        let users = await findAll();
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
  it('returns path, timestamp, message and validationErrors in response when validation fails', async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;
    expect(Object.keys(body)).toEqual([
      'path',
      'timestamp',
      'message',
      'validationErrors',
    ]);
  });
  it('returns path, timestamp and message in response when request fails other than validation', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(response.status).toBe(400);
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });
  it('returns path in error body', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(response.status).toBe(400);
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });
  it('returns timestamp in milliseconds within 5 seconds value in error body', async () => {
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
