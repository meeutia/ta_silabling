const { Op } = require('sequelize');
const {
  Fppl,
  Invoice,
  Payment,
} = require('../../models/Associations');

const XENDIT_API_BASE = process.env.XENDIT_API_BASE || 'https://api.xendit.co';

function getXenditAuthHeader() {
  const secretKey = process.env.XENDIT_SECRET_KEY;

  if (!secretKey) {
    throw new Error('XENDIT_SECRET_KEY belum diatur di file .env backend.');
  }

  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

async function parseXenditResponse(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function requestXendit(path, payload) {
  const response = await fetch(`${XENDIT_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: getXenditAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseXenditResponse(response);

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error_code ||
      data?.errors?.[0]?.message ||
      'Gagal membuat sesi pembayaran Xendit.';

    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function getXendit(path) {
  const response = await fetch(`${XENDIT_API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Authorization: getXenditAuthHeader(),
      Accept: 'application/json',
    },
  });

  const data = await parseXenditResponse(response);

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error_code ||
      data?.errors?.[0]?.message ||
      'Gagal mengambil status sesi pembayaran Xendit.';

    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function getAllowedXenditPaymentChannels() {
  return String(process.env.XENDIT_ALLOWED_PAYMENT_CHANNELS || '')
    .split(',')
    .map((channel) => channel.trim().toUpperCase())
    .filter(Boolean);
}

async function createXenditPaymentSession(payload) {
  const envAllowed = getAllowedXenditPaymentChannels();

  const finalPayload = {
    ...payload,
    ...(payload?.allowed_payment_channels?.length > 0
      ? { allowed_payment_channels: payload.allowed_payment_channels }
      : envAllowed.length > 0
      ? { allowed_payment_channels: envAllowed }
      : {}),
  };

  return requestXendit('/sessions', finalPayload);
}

function getWebhookData(payload = {}) {
  return payload.data && typeof payload.data === 'object' ? payload.data : payload;
}

function normalizeSessionStatus(payload = {}) {
  const event = String(payload.event || '').toLowerCase();
  const data = getWebhookData(payload);
  const status = String(data.status || '').toUpperCase();

  if (event === 'payment_session.completed') return 'COMPLETED';
  if (event === 'payment_session.expired') return 'EXPIRED';
  if (event === 'payment_session.cancelled' || event === 'payment_session.canceled') return 'CANCELLED';
  if (event === 'payment_session.failed') return 'FAILED';

  return status || 'UNKNOWN';
}

async function findPaymentForXenditWebhook(data, transaction) {
  const conditions = [];
  const sessionId = data.payment_session_id || data.id;

  if (sessionId) {
    conditions.push({ gateway_session_id: sessionId });
  }

  if (data.reference_id) {
    conditions.push({ gateway_reference_id: data.reference_id });
  }

  if (conditions.length === 0) return null;

  return Payment.findOne({
    where: { [Op.or]: conditions },
    include: [
      {
        model: Invoice,
        include: [Fppl],
      },
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

module.exports = {
  createXenditPaymentSession,
  findPaymentForXenditWebhook,
  getAllowedXenditPaymentChannels,
  getWebhookData,
  getXendit,
  normalizeSessionStatus,
  requestXendit,
};
