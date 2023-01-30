import User from './User';
import { hash as _hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { Op } from 'sequelize';
import { sendAccountActivation } from '../email/EmailService';
import sequelize from '../config/database';
import EmailException from '../email/EmailException';
import InvalidTokenException from './InvalidTokenException';
import UserNotFoundException from './UserNotFoundException';

const generateToken = (length: number) => {
  return randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body: Partial<User>) => {
  const { username, email, password } = body;
  const hash = await _hash(password || '', 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: generateToken(10),
  } as User;
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });
  try {
    await sendAccountActivation(email || '', user.activationToken || '');
    transaction.commit();
  } catch (err: unknown) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const findByEmail = async (email: string) => {
  return await User.findOne({ where: { email } });
};

const activate = async (token: string) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenException();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const getUsers = async (
  page: number,
  size: number,
  authenticatedUser?: User
) => {
  const usersWithCount = await User.findAndCountAll({
    where: {
      inactive: false,
      id: { [Op.not]: authenticatedUser ? authenticatedUser.id : 0 },
    },
    attributes: ['id', 'username', 'email'],
    limit: size,
    offset: page * size,
  });
  return {
    content: usersWithCount.rows,
    page,
    size,
    totalPages: Math.ceil(usersWithCount.count / size),
  };
};

const getUser = async (id: number) => {
  const user = await User.findOne({
    where: { id, inactive: false },
    attributes: ['id', 'username', 'email'],
  });
  if (!user) {
    throw new UserNotFoundException();
  }
  return user;
};

const updateUser = async (id: string, updatedBody: Partial<User>) => {
  const user = await User.findOne({ where: { id } });
  if (!user) {
    throw new UserNotFoundException();
  }
  if (updatedBody.username) {
    user.username = updatedBody.username;
    await user.save();
  }
};

export { save, findByEmail, activate, getUsers, getUser, updateUser };
