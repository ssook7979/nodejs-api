const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('Username cannot be null.')
    .bail()
    .isLength({ min: 4 })
    .withMessage('Must have min 4 and max 32 characters.'),
  check('password')
    .notEmpty()
    .withMessage('Password cannot be null.')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters.')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage(
      'Password must have at least 1 uppercase, 1 lowercase and 1 number.'
    ),
  check('email')
    .notEmpty()
    .withMessage('Email cannot be null.')
    .bail()
    .isEmail()
    .withMessage('Email is not valid.')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        console.log(user);
        throw new Error('Email in use.');
      }
      return true;
    }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((error) => {
        validationErrors[error.param] = error.msg;
      });
      return res.status(400).send({ validationErrors });
    }
    await UserService.save(req.body);
    return res.send({ message: 'User created' });
  }
);

module.exports = router;
