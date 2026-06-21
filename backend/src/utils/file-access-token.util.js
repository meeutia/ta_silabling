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

function signRequestData(encodedRequestData) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(encodedRequestData)
    .digest('base64url');
}

function createFileAccessToken({ scope, path, expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS, meta = {} } = {}) {
  const cleanScope = String(scope || '').trim();
  const cleanPath = String(path || '').trim();

  if (!cleanScope || !cleanPath) {
    throw new Error('Scope dan path file wajib dikirim untuk token akses file.');
  }

  const requestData = {
    scope: cleanScope,
    path: cleanPath,
    exp: Math.floor(Date.now() / 1000) + Number(expiresInSeconds || DEFAULT_EXPIRES_IN_SECONDS),
    meta,
  };

  const encodedRequestData = base64UrlEncode(JSON.stringify(requestData));
  const signature = signRequestData(encodedRequestData);

  return `${encodedRequestData}.${signature}`;
}

function verifyFileAccessToken(token, expectedScope = '') {
  const value = String(token || '').trim();

  if (!value || !value.includes('.')) {
    const error = new Error('Token akses file tidak valid.');
    error.statusCode = 401;
    throw error;
  }

  const [encodedRequestData, signature] = value.split('.');
  const expectedSignature = signRequestData(encodedRequestData);

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

  let requestData;
  try {
    requestData = JSON.parse(base64UrlDecode(encodedRequestData));
  } catch {
    const error = new Error('Token akses file tidak valid.');
    error.statusCode = 401;
    throw error;
  }

  if (expectedScope && requestData.scope !== expectedScope) {
    const error = new Error('Token akses file tidak sesuai.');
    error.statusCode = 403;
    throw error;
  }

  if (!requestData.exp || requestData.exp < Math.floor(Date.now() / 1000)) {
    const error = new Error('Token akses file sudah kedaluwarsa.');
    error.statusCode = 401;
    throw error;
  }

  return requestData;
}

module.exports = {
  createFileAccessToken,
  verifyFileAccessToken,
};
