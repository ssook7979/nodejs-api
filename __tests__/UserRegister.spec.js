const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const ko = require('../locales/ko/translation.json');
const nodemailerStub = require('nodemailer-stub');
const EmailService = require('../src/email/EmailService');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
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
    expect(response.body.message).toBe(en.user_create_success);
  });

  it('saves the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(userList.length).toBe(1);
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
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
    expect(response.body.validationErrors.email).toBe(en.email_in_use);
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
    expect(response.body.message).toBe(ko.user_create_success);
  });
  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  it('creates user in inactive mode even the request body contains inactive as false', async () => {
    await postUser({ ...validUser, inactive: false });
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  it('creates an activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });
  it('sends an Account activation email with activationToken', async () => {
    await postUser();
    const lastMail = nodemailerStub.interactsWithMail.lastMail();
    expect(lastMail.to[0]).toContain('user1@mail.com');
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail.content).toContain(savedUser.activationToken);
  });
  it('returns 502 Bad Gateway when sending email fails', async () => {
    const mockSendAccountActivation = jest
      .spyOn(EmailService, 'sendAccountActivation')
      .mockRejectedValue({ message: 'Failed to deliver email' });
    const response = await postUser();
    expect(response.status).toBe(502);
    mockSendAccountActivation.mockRestore();
  });
  it('returns Email failure message when sending email fails', async () => {
    const mockSendAccountActivation = jest
      .spyOn(EmailService, 'sendAccountActivation')
      .mockRejectedValue({ message: 'Failed to deliver email' });
    const response = await postUser();
    mockSendAccountActivation.mockRestore();
    expect(response.body.message).toBe('Email failure.');
  });
});

describe('Internationalization', () => {
  it.each`
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
  it(`returns "${ko.email_failure}" when sending email fails`, async () => {
    const mockSendAccountActivation = jest
      .spyOn(EmailService, 'sendAccountActivation')
      .mockRejectedValue({ message: 'Failed to deliver email' });
    const response = await postUser({ ...validUser }, { language: 'ko' });
    mockSendAccountActivation.mockRestore();
    expect(response.body.message).toBe(ko.email_failure);
  });
});
