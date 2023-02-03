import jwt from 'jsonwebtoken';
import randomString from '../shared/generator';
import User from '../user/User';
import Token from './Token';

const createToken = async (user: Partial<User>) => {
  if (!user.id) return;
  const token = randomString(32);
  await Token.create({
    token,
    userId: user.id,
  });
  return token;
};

const verify = async (token: string) => {
  const tokenInDB = await Token.findOne({ where: { token } });

  const userId = tokenInDB?.userId;
  return { id: userId };
};

const deleteToken = async (token: string) => {
  await Token.destroy({ where: { token } });
};

const deleteTokenByUserId = async (userId: string) => {
  await Token.destroy({ where: { userId: parseInt(userId) } });
  console.log(userId, await Token.findAll({ where: { userId } }));
};

export { createToken, verify, deleteToken, deleteTokenByUserId };
