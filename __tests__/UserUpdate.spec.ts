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
import * as fs from 'fs';
import * as path from 'path';
import config from 'config';
import { fail } from 'assert';

let simulateSmtpFailure = false;
const uploadDir: string = config.get('uploadDir');
const profileDir: string = config.get('profileDir');
const profileFolder: string = path.join('.', uploadDir, profileDir);

beforeAll(async () => {
  await sequelize.sync();
  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: true, cascade: true });
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
  let token;
  if (options.auth) {
    const response = await request(app)
      .post('/api/1.0/auth')
      .send(options.auth);
    token = response.body.token;
  }
  const agent = request(app).put('/api/1.0/users/' + id);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  return await agent.send(body);
};

const addUser = async (user = { ...activeUser }): Promise<any> => {
  const hash = await _hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const readFileAsBase64 = (filename = 'test-png.png') => {
  const filePath = path.join('.', '__tests__', 'resource', filename);
  return fs.readFileSync(filePath, { encoding: 'base64' });
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
  test('returns 403 when token is not valid', async () => {
    const response = await putUser(5, null, { token: '1234' });
    expect(response.status).toBe(403);
  });
  test('saves the user image when update contains image as basd64', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser?.image).toBeTruthy();
  });
  test('returns success body having only id, username, email and image', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(Object.keys(response.body)).toEqual([
      'id',
      'username',
      'email',
      'image',
    ]);
  });
  test('saves the user image to upload folder and store filename in user when update contains image as basd64', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    if (!inDBUser || !inDBUser.image) fail();
    const uploadDir: string = config.get('uploadDir');
    const profileDir: string = config.get('profileDir');
    const fileImagePath = path.join(profileFolder, inDBUser.image);
    expect(fs.existsSync(fileImagePath)).toBe(true);
  });
  test('removes the old image after user upload new one', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });

    const firstImage = response.body.image;

    await putUser(savedUser.id, validUpdate, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    if (!inDBUser || !inDBUser.image) fail();
    const fileImagePath = path.join(profileFolder, firstImage);
    expect(fs.existsSync(fileImagePath)).toBe(false);
  });
  test.each`
    username | message             | language
    ${null}  | ${en.username_null} | ${'en'}
    ${'usr'} | ${en.username_size} | ${'en'}
    ${'a'}   | ${en.username_size} | ${'en'}
    ${null}  | ${ko.username_null} | ${'ko'}
    ${'usr'} | ${ko.username_size} | ${'ko'}
    ${'a'}   | ${ko.username_size} | ${'ko'}
  `(
    `returns bad request with $message when username is updated with $username when language is set to $language.`,
    async ({ username, message, language }) => {
      const savedUser = await addUser();
      const response = await putUser(
        savedUser.id,
        { username },
        { language, auth: { email: savedUser.email, password: 'P4ssword' } }
      );
      expect(response.status).toBe(400);
      expect(response.body.validationErrors.username).toBe(message);
    }
  );
  test('returns 200 when image size is exactly 2mb', async () => {
    const testPng = readFileAsBase64();
    const pngByte = Buffer.from(testPng, 'base64').length;
    const twoMB = 1024 * 1024 * 2;
    const filling = 'a'.repeat(twoMB - pngByte);
    const fillBase64 = Buffer.from(filling).toString('base64');
    const savedUser = await addUser();
    const response = await putUser(
      savedUser.id,
      { username: 'updated-user', image: testPng + fillBase64 },
      { auth: { email: savedUser.email, password: 'P4ssword' } }
    );
    expect(response.status).toBe(200);
  });
  test('returns 400 when image size exceeds 2mb', async () => {
    const fileWithSizeOver2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const base64 = Buffer.from(fileWithSizeOver2MB).toString('base64');
    const savedUser = await addUser();
    const response = await putUser(
      savedUser.id,
      { username: 'updated-user', image: base64 },
      { auth: { email: savedUser.email, password: 'P4ssword' } }
    );
    expect(response.status).toBe(400);
  });
  test('keeps the old image after user only updates username', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });

    const firstImage = response.body.image;

    await putUser(
      savedUser.id,
      { username: 'user1-updated' },
      {
        auth: { email: 'user1@mail.com', password: 'P4ssword' },
      }
    );

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    if (!inDBUser || !inDBUser.image) fail();
    const fileImagePath = path.join(profileFolder, firstImage);
    expect(fs.existsSync(fileImagePath)).toBe(true);
  });
  test.each`
    message                  | language
    ${en.profile_image_size} | ${'en'}
    ${ko.profile_image_size} | ${'ko'}
  `(
    `returns $message when file size exceeds 2mb when language is set to $language.`,
    async ({ message, language }) => {
      const fileWithSizeOver2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
      const base64 = Buffer.from(fileWithSizeOver2MB).toString('base64');
      const savedUser = await addUser();
      const response = await putUser(
        savedUser.id,
        { username: 'updated-user', image: base64 },
        { auth: { email: savedUser.email, password: 'P4ssword' }, language }
      );
      console.log();
      expect(response.body.validationErrors.image).toBe(message);
    }
  );
  //test.each`
  //  file              | status
  //  ${'test-gif.gif'} | ${'400'}
  //  ${'test-pdf.pdf'} | ${'400'}
  //  ${'test-txt.txt'} | ${'400'}
  //`(
  //  `returns $status when uploading $file as image`,
  //  async ({ file, status }) => {
  //    const fileInBase64 = readFileAsBase64();
  //    const savedUser = await addUser();
  //    const response = await putUser(
  //      savedUser.id,
  //      { image: fileInBase64 },
  //      {
  //        auth: { email: 'user1@mail.com', password: 'P4ssword' },
  //      }
  //    );
  //
  //    +expect(response.status).toBe(status);
  //  }
  //);
});
