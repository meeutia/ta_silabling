const { toCamelCaseDeep } = require('./case-transform.util');

/**
 * Standardize API successful responses.
 * Response data dikirim dalam camelCase sebagai kontrak utama frontend.
 */
const successResponse = (res, message, data = null, statusCode = 200) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = toCamelCaseDeep(data);
  return res.status(statusCode).json(payload);
};

function sanitizeServerMessage(message, statusCode) {
  const isServerError = Number(statusCode) >= 500;

  if (process.env.NODE_ENV === 'production' && isServerError) {
    return 'Terjadi kesalahan pada server.';
  }

  return message || 'Terjadi kesalahan pada server.';
}

/**
 * Standardize API error responses.
 */
const errorResponse = (res, message, statusCode = 500, errors = null) => {
  const payload = {
    success: false,
    message: sanitizeServerMessage(message, statusCode),
  };

  if (errors !== null && Number(statusCode) < 500) {
    payload.errors = toCamelCaseDeep(errors);
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  errorResponse,
};
