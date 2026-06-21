const { toCamelCaseDeep } = require('./case-transform.util');

/**
 * Standardize API successful responses.
 * Response data dikirim dalam camelCase sebagai kontrak utama frontend.
 */
const successResponse = (res, message, responseData = null, statusCode = 200) => {
  const body = { success: true, message };
  if (responseData !== null) body.data = toCamelCaseDeep(responseData);
  return res.status(statusCode).json(body);
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
  const data = {
    success: false,
    message: sanitizeServerMessage(message, statusCode),
  };

  if (errors !== null && Number(statusCode) < 500) {
    data.errors = toCamelCaseDeep(errors);
  }

  return res.status(statusCode).json(data);
};

module.exports = {
  successResponse,
  errorResponse,
};
