import User from './User';
import { hash as _hash } from 'bcrypt';
import { Op } from 'sequelize';
import { sendAccountActivation } from '../email/EmailService';
import sequelize from '../config/database';
import EmailException from '../email/EmailException';
import InvalidTokenException from './InvalidTokenException';
import { randomString } from '../shared/generator';
import NotFoundException from '../error/NotFoundException';
import * as EmailService from '../email/EmailService';
import * as TokenService from '../auth/TokenService';
import * as FileService from '../file/FileService';

const save = async (body: Partial<User>) => {
  const { username, email, password } = body;
  const hash = await _hash(password || '', 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: randomString(10),
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
    attributes: ['id', 'username', 'email', 'image'],
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
    attributes: ['id', 'username', 'email', 'image'],
  });
  if (!user) {
    throw new NotFoundException('user_not_found');
  }
  return user;
};

const updateUser = async (id: string, updatedBody: Partial<User>) => {
  const user = await User.findOne({ where: { id } });
  if (!user) {
    throw new NotFoundException('user_not_found');
  }
  if (updatedBody.username) {
    user.username = updatedBody.username;
  }
  if (updatedBody.image) {
    await FileService.deleteProfileImage(user.image);
    user.image = await FileService.saveProfileImage(updatedBody.image);
  }
  await user.save();
  return {
    id,
    username: user.username,
    email: user.email,
    image: user.image,
  };
};

const deleteUser = async (id: string) => {
  await User.destroy({ where: { id } });
};

const passwordResetRequest = async (email: string) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new NotFoundException('email_not_inuse');
  }
  user.passwordResetToken = randomString(16);
  await user.save();
  try {
    await EmailService.sendPasswordReset(email, user.passwordResetToken);
  } catch (err) {
    throw new EmailException();
  }
};

const updatePassword = async ({
  passwordResetToken,
  password,
}: {
  passwordResetToken: string;
  password: string;
}) => {
  const user = await findByPasswordResetToken(passwordResetToken);
  const hash = await _hash(password, 10);
  if (!user) throw new NotFoundException();
  user.password = hash;
  user.passwordResetToken = null;
  user.inactive = false;
  user.activationToken = null;
  user.save();
  user.id && TokenService.clearTokens(user.id);
};

const findByPasswordResetToken = (passwordResetToken: string) => {
  return User.findOne({ where: { passwordResetToken } });
};

export {
  save,
  findByEmail,
  activate,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  passwordResetRequest,
  updatePassword,
  findByPasswordResetToken,
};
