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
    throw new Error('Konfigurasi SMTP belum lengkap. Pastikan SMTP_HOST, SMTP_PORT, SMTP_USER, dan SMTP_PASS sudah diisi.');
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

function normalizeRecipientList(value) {
  return String(Array.isArray(value) ? value.join(',') : value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function assertAcceptedBySmtp(info, to) {
  const recipients = normalizeRecipientList(to);
  const accepted = Array.isArray(info?.accepted) ? info.accepted.map(String) : [];
  const rejected = Array.isArray(info?.rejected) ? info.rejected.map(String) : [];
  const pending = Array.isArray(info?.pending) ? info.pending.map(String) : [];

  const rejectedRecipients = recipients.filter((recipient) => rejected.includes(recipient));
  if (rejectedRecipients.length) {
    throw new Error(`Email ditolak SMTP untuk penerima: ${rejectedRecipients.join(', ')}`);
  }

  const acceptedRecipients = recipients.filter((recipient) => accepted.includes(recipient));
  if (!acceptedRecipients.length && !info?.messageId) {
    const pendingInfo = pending.length ? ` Pending: ${pending.join(', ')}.` : '';
    throw new Error(`Email belum dikonfirmasi diterima SMTP.${pendingInfo}`);
  }

  return {
    messageId: info?.messageId || null,
    accepted,
    rejected,
    pending,
    response: info?.response || null,
  };
}

async function sendMail({ to, subject, text, html, attachments = [] }) {
  const recipients = normalizeRecipientList(to);
  if (!recipients.length) {
    throw new Error('Email tujuan belum diisi.');
  }

  const transporter = nodemailer.createTransport(getMailerConfig());
  const defaultAttachments = getDefaultEmailAttachments(html);

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: recipients.join(','),
    subject,
    text,
    html,
    attachments: [...defaultAttachments, ...attachments],
  });

  return assertAcceptedBySmtp(info, recipients.join(','));
}

async function verifyConnection() {
  const transporter = nodemailer.createTransport(getMailerConfig());
  await transporter.verify();
  return true;
}

module.exports = {
  sendMail,
  verifyConnection,
};
