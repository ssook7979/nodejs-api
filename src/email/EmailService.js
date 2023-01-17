const transporter = require('../config/emailTransporter');

const sendAccountActivation = async (email, token) => {
  transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account Activation',
    text: `Token is ${token}`,
  });
};

module.exports = { sendAccountActivation };
