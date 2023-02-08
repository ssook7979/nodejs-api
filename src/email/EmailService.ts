import nodemailer from 'nodemailer';
import transporter from '../config/emailTransporter';

export const sendAccountActivation = async (email: string, token: string) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `
    <div>
      <b>Please click below link to activate your account.</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/login?token=${token}"></a>
    </div>
    `,
  });
  if (process.env.NODE_ENV === 'development') {
    console.log('url: ' + nodemailer.getTestMessageUrl(info));
  }
};

export const sendPasswordReset = async (email: string, token: string) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'PasswordReset',
    html: `
    <div>
      <b>Please click below link to reset your password.</b>
    </div>
    <div>
      <a href="http://localhost:8080/#/password-reset?token=${token}">Reset</a>
    </div>
    `,
  });
  if (process.env.NODE_ENV === 'development') {
    console.log('url: ' + nodemailer.getTestMessageUrl(info));
  }
};
