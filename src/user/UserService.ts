import { create, findOne, findAndCountAll } from './User';
import { hash as _hash } from 'bcrypt';
import { randomBytes } from 'crypto';
import { sendAccountActivation } from '../email/EmailService';
import { transaction as _transaction } from '../config/database';
import EmailException from '../email/EmailException';
import InvalidTokenException from './InvalidTokenException';
import UserNotFoundException from './UserNotFoundException';

const generateToken = (length: number) => {
  return randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
  const { username, email, password } = body;
  const hash = await _hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: generateToken(10),
  };
  const transaction = await _transaction();
  await create(user, { transaction });
  try {
    await sendAccountActivation(email, user.activationToken);
    transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw new EmailException(err);
  }
};

const findByEmail = async (email: string) => {
  return await findOne({ where: { email } });
};

const activate = async (token: string) => {
  const user = await findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenException();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const getUsers = async (page: number, size: number) => {
  const usersWithCount = await findAndCountAll({
    where: { inactive: false },
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
  const user = await findOne({
    where: { id, inactive: false },
    attributes: ['id', 'username', 'email'],
  });
  if (!user) {
    throw new UserNotFoundException();
  }
  return user;
};

export default { save, findByEmail, activate, getUsers, getUser };
