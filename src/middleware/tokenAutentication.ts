import { Request, Response } from 'express';
import * as TokenService from '../auth/TokenService';

const tokenAuthentication = async (req: Request, res: Response, next: any) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.substring(7);
    try {
      const user = await TokenService.verify(token);
      if (typeof user !== 'string') {
        req.authenticatedUser = { id: user.id };
      }
    } catch (err) {
      console.error(err);
    }
  }
  next();
};

export default tokenAuthentication;
