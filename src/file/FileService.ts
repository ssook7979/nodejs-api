import * as fs from 'fs';
import * as path from 'path';
import config from 'config';
import { randomString } from '../shared/generator';

const uploadDir: string = config.get('uploadDir');
const profileDir: string = config.get('profileDir');
const profileFolder: string = path.join('.', uploadDir, profileDir);

const createFolders = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  const profileFolder = path.join('.', uploadDir, profileDir);
  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
};

const saveProfileImage = (base64File: string) => {
  const filename = randomString(32);
  const filePath = path.join(profileFolder, filename);
  fs.writeFileSync(filePath, base64File, { encoding: 'base64' });
  return filename;
};

export { createFolders, saveProfileImage };
