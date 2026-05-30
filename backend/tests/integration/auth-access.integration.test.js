'use strict';

require('../fixtures/integration-mocks');

const request = require('supertest');
const app = require('../../src/app');
const AuthService = require('../../src/services/auth.service');
const {
  Roles,
  authHeader,
  makeToken,
  nikByRole,
  validRegisterPayload,
} = require('../fixtures/integration-helpers');

let consoleErrorSpy;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  if (consoleErrorSpy && typeof consoleErrorSpy.mockRestore === 'function') {
    consoleErrorSpy.mockRestore();
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Integration Testing - Auth dan Role Access', () => {
  test('IT-001 Login berhasil dengan akun valid', async () => {
    const token = makeToken(Roles.ADMIN, nikByRole[Roles.ADMIN]);
    AuthService.login.mockResolvedValueOnce({
      token,
      refreshToken: 'refresh-token-admin',
      expiresIn: '2h',
      user: {
        nik: nikByRole[Roles.ADMIN],
        username: 'admin_test',
        id_role: Roles.ADMIN,
      },
    });

    const response = await request(app)
      .post('/auth/login')
      .send({ identifier: 'admin_test', password: 'Password123!' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Login berhasil.');
    expect(response.body.data.token).toBe(token);
    expect(AuthService.login).toHaveBeenCalledWith('admin_test', 'Password123!');
  });

  test('IT-002 Login gagal dengan password salah', async () => {
    AuthService.login.mockRejectedValueOnce(new Error('Password salah.'));

    const response = await request(app)
      .post('/auth/login')
      .send({ identifier: 'admin_test', password: 'salah' })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('salah');
  });

  test('IT-003 Endpoint menolak request tanpa token', async () => {
    const response = await request(app)
      .get('/requests')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Access token tidak ditemukan');
  });

  test('IT-004 Endpoint menolak akses role yang tidak sesuai', async () => {
    const response = await request(app)
      .get('/admin/accounts/roles')
      .set(authHeader(Roles.CUSTOMER))
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Anda tidak memiliki akses ke resource ini.');
  });

  test('IT-005 Registrasi pelanggan berhasil dengan data valid', async () => {
    const token = makeToken(Roles.CUSTOMER, '3171000000000099');
    AuthService.register.mockResolvedValueOnce({
      token,
      refreshToken: 'refresh-token-customer',
      expiresIn: '2h',
      user: {
        nik: '3171000000000099',
        username: 'pelangganbaru',
        id_role: Roles.CUSTOMER,
      },
    });

    const response = await request(app)
      .post('/auth/register')
      .send(validRegisterPayload())
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Registrasi berhasil.');
    expect(response.body.data.token).toBe(token);
    expect(AuthService.register).toHaveBeenCalledWith(expect.objectContaining({
      nik: '3171000000000099',
      username: 'pelangganbaru',
      email: 'pelanggan.baru@example.com',
    }));
  });

  test('IT-006 Registrasi ditolak jika format email tidak valid', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(validRegisterPayload({ email: 'email-tidak-valid' }))
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Format email tidak valid.');
    expect(AuthService.register).not.toHaveBeenCalled();
  });

  test('IT-007 Refresh token berhasil memperbarui access token', async () => {
    const token = makeToken(Roles.CUSTOMER, nikByRole[Roles.CUSTOMER]);
    AuthService.refresh.mockResolvedValueOnce({
      token,
      refreshToken: 'refresh-token-new',
      expiresIn: '2h',
      user: { nik: nikByRole[Roles.CUSTOMER], id_role: Roles.CUSTOMER },
    });

    const response = await request(app)
      .post('/auth/refresh')
      .set('Cookie', ['refresh_token=refresh-token-old'])
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Access token berhasil diperbarui.');
    expect(response.body.data.token).toBe(token);
    expect(AuthService.refresh).toHaveBeenCalledWith('refresh-token-old');
  });

  test('IT-008 Profil user login dapat dimuat melalui token valid', async () => {
    AuthService.getMe.mockResolvedValueOnce({
      nik: nikByRole[Roles.ADMIN],
      username: 'admin_test',
      id_role: Roles.ADMIN,
    });

    const response = await request(app)
      .get('/auth/me')
      .set(authHeader(Roles.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Get user profile successful.');
    expect(response.body.data.user.nik).toBe(nikByRole[Roles.ADMIN]);
    expect(AuthService.getMe).toHaveBeenCalledWith(nikByRole[Roles.ADMIN]);
  });

  test('IT-009 Forgot password memanggil service reset email', async () => {
    AuthService.forgotPassword.mockResolvedValueOnce(undefined);

    const response = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'pelanggan@example.com' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('link reset kata sandi');
    expect(AuthService.forgotPassword).toHaveBeenCalledWith('pelanggan@example.com');
  });

  test('IT-010 Logout menghapus refresh token aktif', async () => {
    AuthService.logout.mockResolvedValueOnce(undefined);

    const response = await request(app)
      .post('/auth/logout')
      .set('Cookie', ['refresh_token=refresh-token-old'])
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Logout berhasil.');
    expect(AuthService.logout).toHaveBeenCalledWith('refresh-token-old');
  });
});
