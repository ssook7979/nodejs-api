import express, { json } from 'express';
import { handle } from 'i18next-http-middleware';
import UserRouter from './user/UserRouter';
import AuthenticationRouter from './auth/AuthenticationRouter';
import ErrorHandler from './error/ErrorHandler';
import i18next from './config/i18next';

const app = express();

app.use(handle(i18next));

app.use(json());

app.use(UserRouter);
app.use(AuthenticationRouter);

app.use(ErrorHandler);

console.log('env: ' + process.env.NODE_ENV);

export default app;
