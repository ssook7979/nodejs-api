import { Request, Response, Router } from 'express';
import { findByEmail, save, activate, getUsers, getUser } from './UserService';
import { check, validationResult } from 'express-validator';
import ValidationExceptinon from '../error/ValidationException';
import pagination, { TPagination } from '../middleware/pagination';
import ForbiddenException from '../auth/ForbiddenException';
import * as UserService from '../user/UserService';
import * as TokenService from '../auth/TokenService';
import User from './User';

const router = Router();

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4 })
    .withMessage('username_size'),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_invalid'),
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      const user = await findByEmail(email);
      if (user) {
        throw new Error('email_in_use');
      }
      return true;
    }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationExceptinon(errors.array()));
    }
    try {
      await save(req.body);
      return res.send({ message: req.t('user_create_success') });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/api/1.0/users/token/:token', async (req, res, next) => {
  const token = req.params.token;
  try {
    await activate(token);
    res.send({ message: req.t('account_activation_success') });
  } catch (err) {
    next(err);
  }
});

export interface ListRequest extends Request {
  pagination: TPagination;
}

router.get(
  '/api/1.0/users',
  pagination,
  async (req: Request, res: Response) => {
    const authenticatedUser = req.authenticatedUser;
    const { page, size } = req.pagination;
    const users = await getUsers(page, size, authenticatedUser);
    res.send(users);
  }
);

router.get('/api/1.0/users/:id', async (req: Request, res: Response, next) => {
  try {
    const user = await getUser(parseInt(req.params.id));
    res.send(user);
  } catch (err) {
    next(err);
  }
});
router.put(
  '/api/1.0/users/:id',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4 })
    .withMessage('username_size'),
  async (req: Request, res: Response, next) => {
    const authenticatedUser = req.authenticatedUser;
    if (
      !authenticatedUser ||
      authenticatedUser.id !== parseInt(req.params.id)
    ) {
      return next(new ForbiddenException('unauthorized_user_update'));
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationExceptinon(errors.array()));
    }
    const user = await UserService.updateUser(req.params.id, req.body);
    return res.send(user);
  }
);
router.delete(
  '/api/1.0/users/:id',
  async (req: Request, res: Response, next) => {
    const authenticatedUser = req.authenticatedUser;
    if (
      !authenticatedUser ||
      authenticatedUser.id !== parseInt(req.params.id)
    ) {
      return next(new ForbiddenException('unauthorized_user_delete'));
    }
    await UserService.deleteUser(req.params.id);
    const authorization = req.headers.authorization;
    const token = authorization?.substring(7);
    if (token) await TokenService.deleteToken(token);
    res.send();
  }
);
router.post(
  '/api/1.0/user/password',
  check('email').isEmail().withMessage('email_invalid'),
  async (req: Request, res: Response, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationExceptinon(errors.array()));
    }
    try {
      await UserService.passwordResetRequest(req.body.email);
      res.send({ message: req.t('password_reset_request_success') });
    } catch (err) {
      next(err);
    }
  }
);

const passwordResetTokenValidator = async (
  req: Request,
  res: Response,
  next: any
) => {
  const user = await UserService.findByPasswordResetToken(
    req.body.passwordResetToken
  );
  if (!user) {
    return next(new ForbiddenException('unauthorized_password_reset'));
  }
  next();
};

router.put(
  '/api/1.0/user/password',
  passwordResetTokenValidator,
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_invalid'),
  async (req: Request, res: Response, next) => {
    const user = await User.findOne({
      where: { passwordResetToken: req.body.passwordResetToken },
    });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationExceptinon(errors.array()));
    }
    await UserService.updatePassword(req.body);
    res.send();
  }
);

export default router;
