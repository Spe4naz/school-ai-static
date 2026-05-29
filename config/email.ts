// config/email.js
const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const SMTP_HOST = process.env.SMTP_HOST;
  if (!SMTP_HOST) {
    throw new Error('SMTP_HOST is not configured. Email functionality is disabled.');
  }

  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS || '' } : undefined,
  });

  return _transporter;
}

module.exports = { getTransporter };
