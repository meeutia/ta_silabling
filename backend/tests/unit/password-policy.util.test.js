const crypto = require('crypto');
const {
  PASSWORD_POLICY_MESSAGE,
  validatePasswordPolicy,
  assertPasswordPolicy,
  validateUsernamePolicy,
  assertUsernamePolicy,
  generateTemporaryPassword,
} = require('../../src/utils/password-policy.util');

describe('Unit Test - password-policy.util', () => {
  test('menerima password yang memenuhi panjang, huruf, dan angka', () => {
    expect(validatePasswordPolicy('Silab123')).toEqual({ valid: true, message: null });
  });

  test.each([
    ['', 'password kosong'],
    ['Abc123', 'kurang dari delapan karakter'],
    ['Password', 'tanpa angka'],
  ])('menolak %s (%s)', (value) => {
    expect(validatePasswordPolicy(value)).toEqual({ valid: false, message: PASSWORD_POLICY_MESSAGE });
  });

  test('assertPasswordPolicy mengembalikan nilai valid dan memakai pesan kustom saat gagal', () => {
    expect(assertPasswordPolicy('Abcd1234')).toBe('Abcd1234');
    expect(() => assertPasswordPolicy('123', 'Password baru tidak valid.')).toThrow('Password baru tidak valid.');
  });

  test('menerima username valid dan membuang spasi di awal serta akhir', () => {
    expect(validateUsernamePolicy(' user.name-01 ')).toEqual({ valid: true, message: null });
    expect(assertUsernamePolicy(' user.name-01 ')).toBe('user.name-01');
  });

  test.each([
    ['', 'Username wajib diisi.'],
    ['ab', expect.stringContaining('3-30 karakter')],
    ['user name', 'Username tidak boleh mengandung spasi.'],
  ])('menolak username tidak valid %#', (value, expectedMessage) => {
    const result = validateUsernamePolicy(value);
    expect(result.valid).toBe(false);
    if (typeof expectedMessage === 'string') expect(result.message).toBe(expectedMessage);
    else expect(result.message).toEqual(expectedMessage);
  });

  test('generateTemporaryPassword selalu menghasilkan password yang memenuhi policy', () => {
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('abcdef'));
    jest.spyOn(crypto, 'randomInt').mockReturnValue(42);
    const generated = generateTemporaryPassword();
    expect(generated).toBe('SilabYWJjZGVm42');
    expect(validatePasswordPolicy(generated).valid).toBe(true);
  });
});
