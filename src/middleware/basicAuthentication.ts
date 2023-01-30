import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import ForbiddenException from '../auth/ForbiddenException';
import * as UserService from '../user/UserService';

const basicAuthentication = async (req: Request, res: Response, next: any) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('ascii');
    const [email, password] = decoded.split(':');
    const user = await UserService.findByEmail(email);

    if (user && !user.inactive) {
      const match = await bcrypt.compare(password, user.password || '');
      if (match) {
        req.authenticatedUser = user;
      }
    }
  }
  next();
};

export default basicAuthentication;
