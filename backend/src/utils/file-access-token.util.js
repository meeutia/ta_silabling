const crypto = require('crypto');

const DEFAULT_EXPIRES_IN_SECONDS = 10 * 60;

function getSecret() {
  const secret = process.env.FILE_ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

  if (!secret || String(secret).trim().length < 16) {
    const error = new Error('FILE_ACCESS_TOKEN_SECRET wajib diisi minimal 16 karakter untuk akses file aman.');
    error.statusCode = 500;
    throw error;
  }

  return String(secret).trim();
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function createFileAccessToken({ scope, path, expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS, meta = {} } = {}) {
  const cleanScope = String(scope || '').trim();
  const cleanPath = String(path || '').trim();

  if (!cleanScope || !cleanPath) {
    throw new Error('Scope dan path file wajib dikirim untuk token akses file.');
  }

  const payload = {
    scope: cleanScope,
    path: cleanPath,
    exp: Math.floor(Date.now() / 1000) + Number(expiresInSeconds || DEFAULT_EXPIRES_IN_SECONDS),
    meta,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifyFileAccessToken(token, expectedScope = '') {
  const value = String(token || '').trim();

  if (!value || !value.includes('.')) {
    const error = new Error('Token akses file tidak valid.');
    error.statusCode = 401;
    throw error;
  }

  const [encodedPayload, signature] = value.split('.');
  const expectedSignature = signPayload(encodedPayload);

  const signatureBuffer = Buffer.from(signature || '');
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  const validSignature =
    signatureBuffer.length === expectedSignatureBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);

  if (!validSignature) {
    const error = new Error('Token akses file tidak valid.');
    error.statusCode = 401;
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    const error = new Error('Token akses file tidak valid.');
    error.statusCode = 401;
    throw error;
  }

  if (expectedScope && payload.scope !== expectedScope) {
    const error = new Error('Token akses file tidak sesuai.');
    error.statusCode = 403;
    throw error;
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    const error = new Error('Token akses file sudah kedaluwarsa.');
    error.statusCode = 401;
    throw error;
  }

  return payload;
}

module.exports = {
  createFileAccessToken,
  verifyFileAccessToken,
};
