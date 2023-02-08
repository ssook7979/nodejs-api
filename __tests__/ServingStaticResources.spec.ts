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
import app from '../src/app';
import * as fs from 'fs';
import * as path from 'path';
import config from 'config';

const uploadDir: string = config.get('uploadDir');
const profileDir: string = config.get('profileDir');
const profileFolder: string = path.join('.', uploadDir, profileDir);

describe('Profile Images', () => {
  const copyFile = () => {
    const filePath = path.join('.', '__tests__', 'resource', 'test-png.png');
    const storedFileName = 'test-file';
    const targetPath = path.join(profileFolder, storedFileName);
    fs.copyFileSync(filePath, targetPath);
    return storedFileName;
  };

  test('returns 404 when file not found', async () => {
    const response = await request(app).get('/images/123456');
    expect(response.status).toBe(404);
  });

  test('returns 200 ok when file exists', async () => {
    const storedFileName = copyFile();
    const response = await request(app).get('/images/' + storedFileName);
    expect(response.status).toBe(200);
  });

  test('returns cache for 1 year in response', async () => {
    const storedFileName = copyFile();
    const response = await request(app).get('/images/' + storedFileName);
    const oneYearInSeconds = 365 * 24 * 60 * 60;
    expect(response.header['cache-control']).toContain(
      `max-age=${oneYearInSeconds}`
    );
  });
});
