const crypto = require('crypto');

const PASSWORD_POLICY_MESSAGE = 'Password minimal 8 karakter dan harus mengandung huruf serta angka.';
const USERNAME_POLICY_MESSAGE = 'Username wajib 3-30 karakter, hanya boleh huruf, angka, titik, underscore, atau strip, dan tidak boleh diawali/diakhiri titik/strip/underscore.';

function normalizePassword(password) {
  return String(password || '');
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function validatePasswordPolicy(password) {
  const value = normalizePassword(password);

  if (!value || value.length < 8) {
    return {
      valid: false,
      message: PASSWORD_POLICY_MESSAGE,
    };
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return {
      valid: false,
      message: PASSWORD_POLICY_MESSAGE,
    };
  }

  return {
    valid: true,
    message: null,
  };
}

function assertPasswordPolicy(password, message = PASSWORD_POLICY_MESSAGE) {
  const result = validatePasswordPolicy(password);

  if (!result.valid) {
    throw new Error(message || result.message || PASSWORD_POLICY_MESSAGE);
  }

  return normalizePassword(password);
}

function validateUsernamePolicy(username) {
  const value = normalizeUsername(username);

  if (!value) {
    return { valid: false, message: 'Username wajib diisi.' };
  }

  if (value.length < 3 || value.length > 30) {
    return { valid: false, message: USERNAME_POLICY_MESSAGE };
  }

  if (/\s/.test(value)) {
    return { valid: false, message: 'Username tidak boleh mengandung spasi.' };
  }

  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    return { valid: false, message: USERNAME_POLICY_MESSAGE };
  }

  if (/^[._-]|[._-]$/.test(value)) {
    return { valid: false, message: USERNAME_POLICY_MESSAGE };
  }

  return { valid: true, message: null };
}

function assertUsernamePolicy(username, message = USERNAME_POLICY_MESSAGE) {
  const result = validateUsernamePolicy(username);

  if (!result.valid) {
    throw new Error(result.message || message || USERNAME_POLICY_MESSAGE);
  }

  return normalizeUsername(username);
}

function generateTemporaryPassword() {
  // Prefix huruf + token acak + angka 2 digit memastikan policy selalu terpenuhi.
  const randomPart = crypto.randomBytes(6).toString('base64url');
  const numericPart = String(crypto.randomInt(10, 100));
  return `Silab${randomPart}${numericPart}`;
}

module.exports = {
  PASSWORD_POLICY_MESSAGE,
  USERNAME_POLICY_MESSAGE,
  validatePasswordPolicy,
  assertPasswordPolicy,
  validateUsernamePolicy,
  assertUsernamePolicy,
  generateTemporaryPassword,
};
