const {
  createFileAccessToken,
  verifyFileAccessToken,
} = require('../../src/utils/file-access-token.util');

describe('Unit Test - file-access-token.util', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T00:00:00.000Z'));
    process.env = { ...OLD_ENV, FILE_ACCESS_TOKEN_SECRET: 'rahasia-file-minimal-16-karakter' };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = OLD_ENV;
  });

  test('createFileAccessToken menghasilkan dua bagian token bertanda tangan', () => {
    const token = createFileAccessToken({ scope: 'lhu', path: '/lhu/a.pdf' });
    expect(token.split('.')).toHaveLength(2);
  });

  test('verifyFileAccessToken mengembalikan payload, metadata, dan nilai yang telah dibersihkan', () => {
    const token = createFileAccessToken({ scope: 'invoice', path: '/invoices/INV.pdf', meta: { nik: '1301' } });
    expect(verifyFileAccessToken(token, 'invoice')).toMatchObject({
      scope: 'invoice', path: '/invoices/INV.pdf', meta: { nik: '1301' },
    });
    const cleanedToken = createFileAccessToken({ scope: ' worksheet ', path: ' /worksheets/a.xlsx ' });
    expect(verifyFileAccessToken(cleanedToken)).toMatchObject({ scope: 'worksheet', path: '/worksheets/a.xlsx' });
  });

  test('createFileAccessToken menolak scope atau path kosong', () => {
    expect(() => createFileAccessToken({ scope: '', path: '/lhu/a.pdf' })).toThrow('Scope dan path file wajib dikirim');
    expect(() => createFileAccessToken({ scope: 'lhu', path: '' })).toThrow('Scope dan path file wajib dikirim');
  });

  test('token tidak dapat dibuat ketika secret tidak tersedia atau terlalu pendek', () => {
    delete process.env.FILE_ACCESS_TOKEN_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => createFileAccessToken({ scope: 'lhu', path: '/lhu/a.pdf' })).toThrow('minimal 16 karakter');
  });

  test('verifyFileAccessToken menolak token tanpa format payload.signature', () => {
    try {
      verifyFileAccessToken('token-rusak');
      throw new Error('seharusnya gagal');
    } catch (error) {
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Token akses file tidak valid.');
    }
  });

  test('verifyFileAccessToken menolak signature yang dimodifikasi', () => {
    const token = createFileAccessToken({ scope: 'lhu', path: '/lhu/a.pdf' });
    const [payload] = token.split('.');
    expect(() => verifyFileAccessToken(`${payload}.signature-palsu`)).toThrow('Token akses file tidak valid.');
  });

  test('verifyFileAccessToken menolak scope berbeda dan token kedaluwarsa', () => {
    const wrongScopeToken = createFileAccessToken({ scope: 'lhu', path: '/lhu/a.pdf' });
    expect(() => verifyFileAccessToken(wrongScopeToken, 'invoice')).toThrow('Token akses file tidak sesuai.');

    const expiredToken = createFileAccessToken({ scope: 'lhu', path: '/lhu/a.pdf', expiresInSeconds: 1 });
    jest.advanceTimersByTime(2000);
    expect(() => verifyFileAccessToken(expiredToken, 'lhu')).toThrow('Token akses file sudah kedaluwarsa.');
  });
});
