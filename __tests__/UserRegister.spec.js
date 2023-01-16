const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

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
    expect(response.body.message).toBe('User created');
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

  const username_null = 'Username cannot be null.';
  const username_size = 'Must have min 4 and max 32 characters.';
  const email_null = 'Email cannot be null.';
  const email_invalid = 'Email is not valid.';
  const password_null = 'Password cannot be null.';
  const password_size = 'Password must be at least 6 characters.';
  const password_invalid =
    'Password must have at least 1 uppercase, 1 lowercase and 1 number.';

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
      const response = await postUser(user, { language: 'en' });
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
    expect(response.body.validationErrors.email).toBe('Email in use.');
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
});
