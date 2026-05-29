export const PASSWORD_POLICY_MESSAGE = 'Password minimal 8 karakter dan harus mengandung huruf serta angka.';
export const USERNAME_POLICY_MESSAGE = 'Username wajib 3-30 karakter, hanya boleh huruf, angka, titik, underscore, atau strip, dan tidak boleh diawali/diakhiri titik/strip/underscore.';

export function validatePasswordPolicy(password = '') {
  const value = String(password || '');

  if (!value || value.length < 8) {
    return { valid: false, message: PASSWORD_POLICY_MESSAGE };
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return { valid: false, message: PASSWORD_POLICY_MESSAGE };
  }

  return { valid: true, message: '' };
}

export function validateUsernamePolicy(username = '') {
  const value = String(username || '').trim();

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

  return { valid: true, message: '' };
}
