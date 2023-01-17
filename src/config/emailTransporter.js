const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 8587,
  secure: true,
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = transporter;
