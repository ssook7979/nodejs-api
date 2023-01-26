import { Request, Response, Router } from 'express';
import { findByEmail, save, activate, getUsers, getUser } from './UserService';
import { check, validationResult } from 'express-validator';
import ValidationExceptinon from '../error/ValidationException';
import pagination, { TPagination } from '../middleware/pagination';

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
      const validationErrors = {} as { [key: string]: any };
      errors.array().forEach((error) => {
        validationErrors[error.param] = req.t(error.msg);
      });
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
    const { page, size } = req.pagination;
    const users = await getUsers(page, size);
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

export default router;
