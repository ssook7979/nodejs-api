import { randomString } from '../shared/generator';
import User from '../user/User';
import Token from './Token';
import { Op } from 'sequelize';

const ONE_WEEK_IN_MILLIS = 7 * 24 * 60 * 60 * 1000;

const createToken = async (user: Partial<User>) => {
  if (!user.id) return;
  const token = randomString(32);
  await Token.create({
    token,
    userId: user.id,
    lastUsedAt: new Date(),
  });
  return token;
};

const verify = async (token: string) => {
  const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLIS);
  const tokenInDB = await Token.findOne({
    where: { token, lastUsedAt: { [Op.gt]: oneWeekAgo } },
  });
  if (tokenInDB) {
    tokenInDB.lastUsedAt = new Date();
    tokenInDB.save();
    const userId = tokenInDB?.userId;
    return { id: userId };
  }
};

const deleteToken = async (token: string) => {
  await Token.destroy({ where: { token } });
};

const deleteTokenByUserId = async (userId: string) => {
  await Token.destroy({ where: { userId: parseInt(userId) } });
  console.log(userId, await Token.findAll({ where: { userId } }));
};

const scheduledCleanup = () => {
  setInterval(async () => {
    const oneWeekAgo = new Date(Date.now() - ONE_WEEK_IN_MILLIS);
    await Token.destroy({ where: { lastUsedAt: { [Op.lt]: oneWeekAgo } } });
  }, 60 * 60 * 1000);
};

const clearTokens = async (userId: number) => {
  await Token.destroy({ where: { userId } });
};

export {
  createToken,
  verify,
  deleteToken,
  deleteTokenByUserId,
  scheduledCleanup,
  clearTokens,
};
