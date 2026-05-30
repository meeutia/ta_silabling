jest.mock('../../src/models/Associations', () => ({
  User: {},
  Role: {},
  Pelanggan: {},
}));

jest.mock('../../src/utils/mailer', () => ({
  sendMail: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const {
  buildUserPayload,
  generateRefreshToken,
  generateToken,
  getRefreshExpiryDate,
  hashRefreshToken,
} = require('../../src/services/auth.service');

describe('Unit Test - auth.service pure functions', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      JWT_SECRET: 'jwt-secret-unit-test-minimal-16',
      JWT_EXPIRES_IN: '15m',
      REFRESH_TOKEN_EXPIRES_IN_DAYS: '7',
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('generateToken menghasilkan JWT berisi NIK dan role', () => {
    const token = generateToken({ nik: '1300000000000001', id_role: 'RL-002' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded).toMatchObject({
      nik: '1300000000000001',
      id_role: 'RL-002',
    });
  });

  test('generateRefreshToken menghasilkan token acak yang panjang', () => {
    const tokenA = generateRefreshToken();
    const tokenB = generateRefreshToken();

    expect(tokenA).toHaveLength(96);
    expect(tokenB).toHaveLength(96);
    expect(tokenA).not.toBe(tokenB);
  });

  test('hashRefreshToken menghasilkan hash sha256 deterministik', () => {
    const token = 'refresh-token-contoh';

    expect(hashRefreshToken(token)).toHaveLength(64);
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toBe(token);
  });

  test('getRefreshExpiryDate menghasilkan tanggal kedaluwarsa di masa depan', () => {
    const before = Date.now();
    const expiry = getRefreshExpiryDate();

    expect(expiry).toBeInstanceOf(Date);
    expect(expiry.getTime()).toBeGreaterThan(before);
  });

  test('buildUserPayload menyusun payload user dengan role dan profil pelanggan', () => {
    const userInstance = {
      get: () => ({
        nik: '1300000000000001',
        username: 'pelanggan01',
        email: 'pelanggan@mail.test',
        id_role: 'RL-001',
        Role: { nama_role: 'Pelanggan' },
        Pelanggans: [{
          id_pelanggan: 'PLG-001',
          no_telp: '081234567890',
          alamat: 'Padang',
          nama_instansi: 'Instansi Uji',
          pic: 'Dewi',
          email_kontak: 'kontak@mail.test',
        }],
      }),
    };

    expect(buildUserPayload(userInstance)).toEqual({
      nik: '1300000000000001',
      username: 'pelanggan01',
      email: 'pelanggan@mail.test',
      id_role: 'RL-001',
      nama_role: 'Pelanggan',
      id_pelanggan: 'PLG-001',
      no_telp: '081234567890',
      alamat: 'Padang',
      nama_instansi: 'Instansi Uji',
      pic: 'Dewi',
      email_kontak: 'kontak@mail.test',
    });
  });
});
