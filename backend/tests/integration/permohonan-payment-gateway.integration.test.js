'use strict';

require('../fixtures/integration-mocks');

const request = require('supertest');
const app = require('../../src/app');
const RequestService = require('../../src/services/request/request.service');
const RequestListService = require('../../src/services/request/request-list.service');
const RequestWorkflowService = require('../../src/services/request/request-workflow.service');
const PaymentService = require('../../src/services/payment/payment.service');
const {
  Roles,
  authHeader,
  nikByRole,
  validKirimRequestPayload,
  validMethodSelection,
  validRequestPayload,
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

describe('Integration Testing - Permohonan dan Payment Gateway', () => {
  test('IT-011 Pelanggan membuat permohonan valid dengan pengambilan laboratorium', async () => {
    RequestService.createRequest.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status: 'Menunggu Verifikasi Admin',
    });

    const response = await request(app)
      .post('/requests')
      .set(authHeader(Roles.CUSTOMER))
      .send(validRequestPayload())
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Permohonan pengujian berhasil dibuat.');
    expect(response.body.data.idRegistrasi).toBe('REG-001');
    expect(RequestService.createRequest).toHaveBeenCalledWith(nikByRole[Roles.CUSTOMER], expect.any(Object));
  });

  test('IT-012 Sistem menolak permohonan jika data pelanggan wajib kosong', async () => {
    const response = await request(app)
      .post('/requests')
      .set(authHeader(Roles.CUSTOMER))
      .send(validRequestPayload({ emailPic: '' }))
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Data pelanggan tidak lengkap.');
    expect(RequestService.createRequest).not.toHaveBeenCalled();
  });

  test('IT-013 Sistem menolak permohonan jika email PIC tidak valid', async () => {
    const response = await request(app)
      .post('/requests')
      .set(authHeader(Roles.CUSTOMER))
      .send(validRequestPayload({ emailPic: 'pic-salah' }))
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('format email');
    expect(RequestService.createRequest).not.toHaveBeenCalled();
  });

  test('IT-014 Sistem menolak permohonan jika nomor telepon tidak valid', async () => {
    const response = await request(app)
      .post('/requests')
      .set(authHeader(Roles.CUSTOMER))
      .send(validRequestPayload({ noTelp: '12345' }))
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('No. Telp');
    expect(RequestService.createRequest).not.toHaveBeenCalled();
  });

  test('IT-015 Pelanggan membuat permohonan valid dengan metode sampel dikirim', async () => {
    RequestService.createRequest.mockResolvedValueOnce({
      id_registrasi: 'REG-002',
      status: 'Menunggu Verifikasi Admin',
      metode_pengambilan: 'kirim',
    });

    const response = await request(app)
      .post('/requests')
      .set(authHeader(Roles.CUSTOMER))
      .send(validKirimRequestPayload())
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.idRegistrasi).toBe('REG-002');
    expect(RequestService.createRequest).toHaveBeenCalledWith(nikByRole[Roles.CUSTOMER], expect.objectContaining({ metodePengambilan: 'kirim' }));
  });

  test('IT-016 Pelanggan melihat riwayat permohonan sendiri', async () => {
    RequestListService.listRequests.mockResolvedValueOnce([
      { id_registrasi: 'REG-001', status: 'Menunggu Verifikasi Admin' },
    ]);

    const response = await request(app)
      .get('/requests')
      .set(authHeader(Roles.CUSTOMER))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(RequestListService.listRequests).toHaveBeenCalledWith(nikByRole[Roles.CUSTOMER], Roles.CUSTOMER, undefined);
  });

  test('IT-017 Pelanggan melihat detail permohonan miliknya', async () => {
    RequestService.detailRequest.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status: 'Menunggu Verifikasi Admin',
      pelanggan: { nik: nikByRole[Roles.CUSTOMER] },
    });

    const response = await request(app)
      .get('/requests/REG-001')
      .set(authHeader(Roles.CUSTOMER))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.idRegistrasi).toBe('REG-001');
    expect(RequestService.detailRequest).toHaveBeenCalledWith('REG-001', nikByRole[Roles.CUSTOMER], Roles.CUSTOMER);
  });

  test('IT-018 Pelanggan melihat riwayat aktivitas permohonan', async () => {
    RequestService.getRequestActivityLogs.mockResolvedValueOnce([
      { aktivitas: 'Permohonan dibuat', created_at: '2026-06-01T09:00:00.000Z' },
    ]);

    const response = await request(app)
      .get('/requests/REG-001/activity-logs')
      .set(authHeader(Roles.CUSTOMER))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('riwayat aktivitas');
    expect(RequestService.getRequestActivityLogs).toHaveBeenCalledWith('REG-001', nikByRole[Roles.CUSTOMER], Roles.CUSTOMER);
  });

  test('IT-019 Admin melihat daftar permohonan masuk', async () => {
    RequestListService.listRequests.mockResolvedValueOnce([
      { id_registrasi: 'REG-001', status: 'Menunggu Verifikasi Admin' },
      { id_registrasi: 'REG-002', status: 'Menunggu Verifikasi Admin' },
    ]);

    const response = await request(app)
      .get('/requests?status=Menunggu%20Verifikasi%20Admin')
      .set(authHeader(Roles.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(RequestListService.listRequests).toHaveBeenCalledWith(nikByRole[Roles.ADMIN], Roles.ADMIN, 'Menunggu Verifikasi Admin');
  });

  test('IT-020 Admin memverifikasi permohonan', async () => {
    RequestWorkflowService.verifyRequest.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status: 'Menunggu Penentuan Metode',
    });

    const response = await request(app)
      .put('/requests/REG-001/verify')
      .set(authHeader(Roles.ADMIN))
      .send({ action: 'approve', catatan: 'Data lengkap.' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Permohonan disetujui');
    expect(RequestWorkflowService.verifyRequest).toHaveBeenCalledWith('REG-001', 'approve', 'Data lengkap.', undefined, nikByRole[Roles.ADMIN]);
  });

  test('IT-021 Admin menolak permohonan dengan catatan', async () => {
    RequestWorkflowService.verifyRequest.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status: 'Ditolak Admin',
      catatan_penolakan: 'Dokumen permohonan belum lengkap.',
    });

    const response = await request(app)
      .put('/requests/REG-001/verify')
      .set(authHeader(Roles.ADMIN))
      .send({ action: 'reject', catatan: 'Dokumen permohonan belum lengkap.' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Permohonan ditolak.');
    expect(RequestWorkflowService.verifyRequest).toHaveBeenCalledWith('REG-001', 'reject', 'Dokumen permohonan belum lengkap.', undefined, nikByRole[Roles.ADMIN]);
  });

  test('IT-022 Edit permohonan lama ditolak karena alur revisi tidak memakai update langsung', async () => {
    const response = await request(app)
      .put('/requests/REG-001')
      .set(authHeader(Roles.CUSTOMER))
      .send(validRequestPayload())
      .expect(410);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Edit permohonan lama sudah tidak digunakan');
  });

  test('IT-023 Kasi melihat detail permohonan untuk penentuan metode', async () => {
    RequestService.getKasiRequestDetail.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      parameter: [{ id_parameter: 'PAR-001' }],
    });

    const response = await request(app)
      .get('/requests/REG-001/methods')
      .set(authHeader(Roles.KASI))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Detail permohonan');
    expect(RequestService.getKasiRequestDetail).toHaveBeenCalledWith('REG-001');
  });

  test('IT-024 Kasi menetapkan metode atau parameter uji', async () => {
    RequestWorkflowService.assignMethods.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status: 'Menunggu Pembayaran',
      selected_methods: ['MET-001'],
    });

    const response = await request(app)
      .put('/requests/REG-001/methods')
      .set(authHeader(Roles.KASI))
      .send(validMethodSelection())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Metode berhasil ditentukan');
    expect(RequestWorkflowService.assignMethods).toHaveBeenCalledWith('REG-001', validMethodSelection().selections, nikByRole[Roles.KASI]);
  });

  test('IT-025 Kasi menetapkan rincian biaya atau tagihan', async () => {
    RequestWorkflowService.assignMethods.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status: 'Menunggu Pembayaran',
      invoice: {
        total_tagihan: 250000,
        status_pembayaran: 'Belum Dibayar',
      },
    });

    const response = await request(app)
      .put('/requests/REG-001/methods')
      .set(authHeader(Roles.KASI))
      .send(validMethodSelection())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.invoice.totalTagihan).toBe(250000);
    expect(RequestWorkflowService.assignMethods).toHaveBeenCalledTimes(1);
  });

  test('IT-026 Sistem menolak penentuan metode jika pilihan metode kosong', async () => {
    const response = await request(app)
      .put('/requests/REG-001/methods')
      .set(authHeader(Roles.KASI))
      .send({ selections: [] })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Pilihan metode tidak boleh kosong.');
    expect(RequestWorkflowService.assignMethods).not.toHaveBeenCalled();
  });

  test('IT-027 Kasi menolak permohonan pada tahap metode dengan alasan', async () => {
    RequestWorkflowService.rejectRequest.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status: 'Ditolak Kasi',
    });

    const response = await request(app)
      .put('/requests/REG-001/reject')
      .set(authHeader(Roles.KASI))
      .send({ alasan: 'Metode uji belum tersedia.' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Permohonan berhasil ditolak.');
    expect(RequestWorkflowService.rejectRequest).toHaveBeenCalledWith('REG-001', 'Metode uji belum tersedia.', nikByRole[Roles.KASI]);
  });

  test('IT-028 Pelanggan membuat transaksi pembayaran melalui payment gateway', async () => {
    PaymentService.createGatewayPayment.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      payment_session_id: 'ps-123',
      payment_url: 'https://checkout.example.test/ps-123',
      status_pembayaran: 'PENDING',
    });

    const response = await request(app)
      .post('/requests/REG-001/payment')
      .set(authHeader(Roles.CUSTOMER))
      .send({ action: 'approve', paymentMethodCode: 'BCA' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('pembayaran Xendit berhasil dibuat');
    expect(response.body.data.paymentUrl).toContain('checkout.example.test');
    expect(PaymentService.createGatewayPayment).toHaveBeenCalledWith('REG-001', nikByRole[Roles.CUSTOMER], 'BCA');
  });

  test('IT-029 Pelanggan membatalkan pembayaran dan permohonan melalui keputusan pembayaran', async () => {
    PaymentService.rejectInvoiceByCustomer.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status: 'Dibatalkan Pelanggan',
      note: 'Tidak jadi melakukan pengujian.',
    });

    const response = await request(app)
      .post('/requests/REG-001/payment')
      .set(authHeader(Roles.CUSTOMER))
      .send({ action: 'reject', note: 'Tidak jadi melakukan pengujian.' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Permohonan berhasil dibatalkan oleh pelanggan.');
    expect(PaymentService.rejectInvoiceByCustomer).toHaveBeenCalledWith('REG-001', nikByRole[Roles.CUSTOMER], 'Tidak jadi melakukan pengujian.');
  });

  test('IT-030 Sistem menerima status pembayaran sukses dari payment gateway', async () => {
    PaymentService.handleXenditPaymentSessionWebhook.mockImplementationOnce((req, res) => res.status(200).json({
      success: true,
      message: 'Webhook pembayaran diproses.',
      data: {
        idRegistrasi: 'REG-001',
        statusPembayaran: 'PAID',
      },
    }));

    const response = await request(app)
      .post('/webhooks/xendit/payment-session')
      .send({
        event: 'payment_session.succeeded',
        data: {
          reference_id: 'REG-001',
          status: 'SUCCEEDED',
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.statusPembayaran).toBe('PAID');
    expect(PaymentService.handleXenditPaymentSessionWebhook).toHaveBeenCalledTimes(1);
  });
});
