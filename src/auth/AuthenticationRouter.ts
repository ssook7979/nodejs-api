import express from 'express';
import bcrypt from 'bcrypt';
import AuthenticationException from './AuthenticationException';
import ForbiddenException from './ForbiddenException';
import { check, validationResult } from 'express-validator';
import { findByEmail } from '../user/UserService';
import * as TokenService from './TokenService';

const router = express.Router();

router.post(
  '/api/1.0/auth',
  check('email').isEmail(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AuthenticationException());
    }
    const { email, password } = req.body;
    const user = await findByEmail(email);
    if (!user) {
      return next(new AuthenticationException());
    }
    const match = await bcrypt.compare(password, user.password || '');
    if (!match) {
      return next(new AuthenticationException());
    }
    if (user.inactive) {
      return next(new ForbiddenException());
    }

    res.send({
      id: user.id,
      username: user.username,
      token: await TokenService.createToken(user),
      image: user.image,
    });
  }
);
router.post('/api/1.0/logout', async (req, res) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.substring(7);
    await TokenService.deleteToken(token);
  }
  res.send();
});

export default router;
