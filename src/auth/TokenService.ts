import jwt from 'jsonwebtoken';
import User from '../user/User';

const createToken = (user: Partial<User>) => {
  return jwt.sign({ id: user.id }, 'this-is-our-secret');
};

const verify = (token: string) => {
  return jwt.verify(token, 'this-is-our-secret');
};

export { createToken, verify };
