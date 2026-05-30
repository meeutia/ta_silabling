const {
  validatePasswordPolicy,
  assertPasswordPolicy,
  validateUsernamePolicy,
  assertUsernamePolicy,
  generateTemporaryPassword,
} = require('../../src/utils/password-policy.util');

describe('Unit Test - password-policy.util', () => {
  describe('validatePasswordPolicy', () => {
    test('menerima password minimal 8 karakter berisi huruf dan angka', () => {
      expect(validatePasswordPolicy('Rahasia123')).toEqual({ valid: true, message: null });
    });

    test('menolak password kurang dari 8 karakter', () => {
      expect(validatePasswordPolicy('Abc123')).toMatchObject({ valid: false });
    });

    test('menolak password tanpa angka', () => {
      expect(validatePasswordPolicy('RahasiaAja')).toMatchObject({ valid: false });
    });

    test('menolak password tanpa huruf', () => {
      expect(validatePasswordPolicy('12345678')).toMatchObject({ valid: false });
    });

    test('assertPasswordPolicy melempar error untuk password tidak sesuai policy', () => {
      expect(() => assertPasswordPolicy('12345678')).toThrow('Password minimal 8 karakter');
    });

    test('generateTemporaryPassword selalu memenuhi policy', () => {
      const password = generateTemporaryPassword();
      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(validatePasswordPolicy(password)).toEqual({ valid: true, message: null });
    });
  });

  describe('validateUsernamePolicy', () => {
    test('menerima username valid', () => {
      expect(validateUsernamePolicy('admin.lab-01')).toEqual({ valid: true, message: null });
    });

    test('menghapus spasi di awal dan akhir username', () => {
      expect(assertUsernamePolicy('  admin_lab  ')).toBe('admin_lab');
    });

    test('menolak username kosong', () => {
      expect(validateUsernamePolicy('')).toEqual({ valid: false, message: 'Username wajib diisi.' });
    });

    test('menolak username yang mengandung spasi', () => {
      expect(validateUsernamePolicy('admin lab')).toEqual({ valid: false, message: 'Username tidak boleh mengandung spasi.' });
    });

    test('menolak username diawali titik, strip, atau underscore', () => {
      expect(validateUsernamePolicy('.admin')).toMatchObject({ valid: false });
      expect(validateUsernamePolicy('-admin')).toMatchObject({ valid: false });
      expect(validateUsernamePolicy('_admin')).toMatchObject({ valid: false });
    });

    test('menolak username diakhiri titik, strip, atau underscore', () => {
      expect(validateUsernamePolicy('admin.')).toMatchObject({ valid: false });
      expect(validateUsernamePolicy('admin-')).toMatchObject({ valid: false });
      expect(validateUsernamePolicy('admin_')).toMatchObject({ valid: false });
    });

    test('menolak karakter selain huruf, angka, titik, underscore, dan strip', () => {
      expect(validateUsernamePolicy('admin@lab')).toMatchObject({ valid: false });
    });
  });
});
