const express = require('express');
const router = express.Router();
const UserService = require('./UserService');

const validateUsername = (req, res, next) => {
  const user = req.body;
  if (!user.username) {
    return res
      .status(400)
      .send({ validationErrors: { username: 'Username cannot be null.' } });
  }
  next();
};

const validateEmail = (req, res, next) => {
  const user = req.body;
  if (!user.email) {
    return res
      .status(400)
      .send({ validationErrors: { email: 'Email cannot be null.' } });
  }
  next();
};

router.post(
  '/api/1.0/users',
  validateUsername,
  validateEmail,
  async (req, res) => {
    await UserService.save(req.body);
    return res.send({ message: 'User created' });
  }
);

module.exports = router;
