/*
 * System smoke testing SILABLING.
 *
 * Pengujian ini memperlakukan Express application sebagai sistem eksternal:
 * request dikirim melalui HTTP menggunakan Supertest dan hasil dinilai dari
 * status, header, respons JSON, serta redirect yang terlihat dari luar.
 *
 * Pengujian ini tidak menggantikan 40 skenario system testing manual pada
 * Lampiran J karena alur penuh tetap membutuhkan frontend, database uji,
 * akun tiap role, data master, dan payment sandbox.
 */

process.env.NODE_ENV = 'test';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.JSON_BODY_LIMIT = '2mb';
process.env.URLENCODED_BODY_LIMIT = '2mb';
process.env.ENABLE_LEGACY_FILE_STATIC = 'false';

const request = require('supertest');
const { SilablingApplication } = require('../../src/app');

const paymentService = {
  handleXenditPaymentSessionWebhook: jest.fn((req, res) =>
    res.status(200).json({ success: true, message: 'Webhook diterima.' })),
  syncXenditPaymentStatusFromReturn: jest.fn(async () => ({ status: 'COMPLETED' })),
};

const app = new SilablingApplication({ paymentService }).getApp();

describe('System Smoke Testing SILABLING', () => {
  test('ST-SMOKE-001 health endpoint dapat diakses', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'OK',
      data: { service: 'SILABLING API' },
    });
  });

  test('ST-SMOKE-002 security headers terpasang', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('ST-SMOKE-003 endpoint tidak dikenal menghasilkan 404', async () => {
    const response = await request(app).get('/endpoint-tidak-ada');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Endpoint tidak ditemukan.');
  });

  test('ST-SMOKE-004 origin frontend yang diizinkan menerima header CORS', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  test('ST-SMOKE-005 origin asing ditolak oleh CORS', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://example.invalid');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Origin tidak diizinkan oleh CORS.');
  });

  test('ST-SMOKE-006 akses langsung invoice lama diblokir', async () => {
    const response = await request(app).get('/invoices/contoh.pdf');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Akses file langsung sudah dinonaktifkan');
  });

  test('ST-SMOKE-007 akses langsung worksheet lama diblokir', async () => {
    const response = await request(app).get('/worksheets/contoh.xlsx');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Akses file langsung sudah dinonaktifkan');
  });

  test('ST-SMOKE-008 request JSON melebihi batas ditolak', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ payload: 'x'.repeat(2 * 1024 * 1024 + 2048) });

    expect(response.status).toBe(413);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('terlalu besar');
  });

  test('ST-SMOKE-009 return pembayaran sukses diarahkan ke frontend', async () => {
    const response = await request(app)
      .get('/payment/return/success')
      .query({ session_id: 'SESSION-001' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('http://localhost:5173/pelanggan/status');
    expect(response.headers.location).toContain('session_id=SESSION-001');
    expect(response.headers.location).toContain('gateway_status=COMPLETED');
    expect(response.headers.location).toContain('payment=success');
  });

  test('ST-SMOKE-010 return pembayaran batal diarahkan ke frontend', async () => {
    const response = await request(app)
      .get('/payment/return/cancel')
      .query({ session_id: 'SESSION-002' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('http://localhost:5173/pelanggan/status');
    expect(response.headers.location).toContain('payment=failed');
  });

  test('ST-SMOKE-011 health endpoint merespons di bawah tiga detik', async () => {
    const startedAt = process.hrtime.bigint();
    const response = await request(app).get('/health');
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    expect(response.status).toBe(200);
    expect(elapsedMs).toBeLessThan(3000);
  });
});
