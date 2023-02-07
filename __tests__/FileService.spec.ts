import {
  describe,
  expect,
  test,
  beforeAll,
  beforeEach,
  afterAll,
  jest,
} from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import config from 'config';
import * as FileService from '../src/file/FileService';

afterAll(() => {
  const uploadDir: string = config.get('uploadDir');
  const profileDir: string = config.get('profileDir');
  const profileFolder: string = path.join('.', uploadDir, profileDir);
  const files = fs.readdirSync(profileFolder);
  for (const file of files) {
    fs.unlinkSync(path.join(profileFolder, file));
  }
});

describe('Create folers', () => {
  test('creates upload folder', () => {
    FileService.createFolders();
    const uploadDir: string = config.get('uploadDir');
    expect(fs.existsSync(uploadDir)).toBe(true);
  });
  test('creates profile folder under upload folder', () => {
    FileService.createFolders();
    const uploadDir: string = config.get('uploadDir');
    const profileDir: string = config.get('profileDir');
    const profileFolder = path.join('.', uploadDir, profileDir);
    expect(fs.existsSync(profileFolder)).toBe(true);
  });
});
