import express, { json } from 'express';
import { handle } from 'i18next-http-middleware';
import config from 'config';
import * as path from 'path';
import UserRouter from './user/UserRouter';
import AuthenticationRouter from './auth/AuthenticationRouter';
import ErrorHandler from './error/ErrorHandler';
import i18next from './config/i18next';
import tokenAuthentication from './middleware/tokenAutentication';
import * as FileService from '../src/file/FileService';

const uploadDir: string = config.get('uploadDir');
const profileDir: string = config.get('profileDir');
const profileFolder: string = path.join('.', uploadDir, profileDir);

const ONE_YEAR_IN_MILLI = 365 * 24 * 60 * 60 * 1000;

FileService.createFolders();

const app = express();

app.use(handle(i18next));

app.use(json({ limit: '3mb' }));

app.use(
  '/images',
  express.static(profileFolder, { maxAge: ONE_YEAR_IN_MILLI })
);

app.use(tokenAuthentication);

app.use(UserRouter);
app.use(AuthenticationRouter);

app.use(ErrorHandler);

console.log('env: ' + process.env.NODE_ENV);

export default app;
