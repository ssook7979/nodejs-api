import express, { json } from 'express';
import i18n from './config/i18next';
import { handle } from 'i18next-http-middleware';
import UserRouter from './user/UserRouter';
import AuthenticationRouter from './auth/AuthenticationRouter';
import ErrorHandler from './error/ErrorHandler';

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { LanguageDetector } from 'i18next-http-middleware';

i18next
  .use(Backend)
  .use(LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defualtNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

const app = express();

app.use(i18n);

app.use(json());

app.use(UserRouter);
app.use(AuthenticationRouter);

app.use(ErrorHandler);

console.log('env: ' + process.env.NODE_ENV);

export default app;
