const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Konfigurasi SMTP belum lengkap.');
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
}

function getDefaultEmailAttachments(html = '') {
  const attachments = [];
  const htmlText = String(html || '');

  if (!htmlText.includes('cid:silabling-logo-email')) {
    return attachments;
  }

  const logoCandidates = [
    path.join(__dirname, '../assets/email/logo-uptd-lab-sumbar-email.png'),
    path.join(__dirname, '../assets/email/logo-uptd-lab-sumbar.png'),
  ];

  const logoPath = logoCandidates.find((candidate) => fs.existsSync(candidate));

  if (logoPath) {
    attachments.push({
      filename: 'logo-uptd-lab-sumbar-email.png',
      path: logoPath,
      cid: 'silabling-logo-email',
      contentType: 'image/png',
      contentDisposition: 'inline',
      headers: {
        'Content-ID': '<silabling-logo-email>',
        'X-Attachment-Id': 'silabling-logo-email',
      },
    });
  }

  return attachments;
}


async function sendMail({ to, subject, text, html, attachments = [] }) {
  const transporter = nodemailer.createTransport(getMailerConfig());
  const defaultAttachments = getDefaultEmailAttachments(html);

  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
    attachments: [...defaultAttachments, ...attachments],
  });
}

module.exports = {
  sendMail,
};