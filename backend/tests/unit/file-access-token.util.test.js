const {
  createFileAccessToken,
  verifyFileAccessToken,
} = require('../../src/utils/file-access-token.util');

describe('Unit Test - file-access-token.util', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, FILE_ACCESS_TOKEN_SECRET: 'rahasia-file-token-minimal-16' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('membuat dan memverifikasi token akses file dengan scope yang benar', () => {
    const token = createFileAccessToken({
      scope: 'invoice',
      path: 'invoices/INV-001.pdf',
      expiresInSeconds: 60,
      meta: { id: 'INV-001' },
    });

    const payload = verifyFileAccessToken(token, 'invoice');

    expect(payload).toMatchObject({
      scope: 'invoice',
      path: 'invoices/INV-001.pdf',
      meta: { id: 'INV-001' },
    });
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('menolak token dengan scope yang tidak sesuai', () => {
    const token = createFileAccessToken({ scope: 'invoice', path: 'invoices/INV-001.pdf' });

    expect(() => verifyFileAccessToken(token, 'lhu')).toThrow('Token akses file tidak sesuai.');
  });

  test('menolak token yang sudah kedaluwarsa', () => {
    const token = createFileAccessToken({
      scope: 'invoice',
      path: 'invoices/INV-001.pdf',
      expiresInSeconds: -1,
    });

    expect(() => verifyFileAccessToken(token, 'invoice')).toThrow('Token akses file sudah kedaluwarsa.');
  });

  test('menolak token yang diubah signature-nya', () => {
    const token = createFileAccessToken({ scope: 'invoice', path: 'invoices/INV-001.pdf' });
    const tamperedToken = `${token.slice(0, -2)}xx`;

    expect(() => verifyFileAccessToken(tamperedToken, 'invoice')).toThrow('Token akses file tidak valid.');
  });

  test('menolak pembuatan token tanpa scope atau path', () => {
    expect(() => createFileAccessToken({ scope: '', path: 'invoices/INV-001.pdf' })).toThrow('Scope dan path file wajib dikirim untuk token akses file.');
    expect(() => createFileAccessToken({ scope: 'invoice', path: '' })).toThrow('Scope dan path file wajib dikirim untuk token akses file.');
  });
});
