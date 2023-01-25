import nodemailer from 'nodemailer';
import config from 'config';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

const mailConfig = config.get('mail') as SMTPTransport.Options;

export default nodemailer.createTransport({ ...mailConfig });
