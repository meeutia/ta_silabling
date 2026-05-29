const XENDIT_API_BASE = process.env.XENDIT_API_BASE || 'https://api.xendit.co';

function getAuthHeader() {
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
      Authorization: getAuthHeader(),
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

function getAllowedPaymentChannels() {
  return String(process.env.XENDIT_ALLOWED_PAYMENT_CHANNELS || '')
    .split(',')
    .map((channel) => channel.trim())
    .filter(Boolean);
}

async function createPaymentSession(payload) {
  // Prefer allowed_payment_channels provided in the payload (per-request).
  // If none provided, fall back to the environment configuration.
  const envAllowed = getAllowedPaymentChannels();

  const finalPayload = {
    ...payload,
    ...(payload && payload.allowed_payment_channels && payload.allowed_payment_channels.length > 0
      ? { allowed_payment_channels: payload.allowed_payment_channels }
      : envAllowed.length > 0
      ? { allowed_payment_channels: envAllowed }
      : {}),
  };

  return requestXendit('/sessions', finalPayload);
}

module.exports = {
  createPaymentSession,
};
