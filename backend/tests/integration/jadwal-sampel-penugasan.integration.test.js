'use strict';

require('../fixtures/integration-mocks');

const request = require('supertest');
const app = require('../../src/app');
const RequestService = require('../../src/services/request/request.service');
const RequestWorkflowService = require('../../src/services/request/request-workflow.service');
const ScheduleChangeService = require('../../src/services/schedule/schedule-change.service');
const assignmentService = require('../../src/services/assignment.service');
const {
  FUTURE_DATE,
  FUTURE_DATE_2,
  INVALID_TIME,
  Roles,
  VALID_TIME,
  authHeader,
  nikByRole,
  validAssignmentPayload,
  validReceiveSamplesPayload,
  validScheduleChangePayload,
  validScheduleConfirmationPayload,
  validScheduleDecisionPayload,
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

describe('Integration Testing - Jadwal, Sampel, dan Penugasan', () => {
  test('IT-031 Admin menentukan jadwal pengambilan sampel', async () => {
    RequestWorkflowService.createOrUpdateSamplingSchedule.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      jenis_pengambilan_sampel: 'Laboratorium',
      jadwal: {
        tanggal_pengambilan: FUTURE_DATE,
        jam_pengambilan: VALID_TIME,
      },
    });

    const response = await request(app)
      .post('/requests/REG-001/sampling-schedule')
      .set(authHeader(Roles.ADMIN))
      .send({
        tanggalPengambilan: FUTURE_DATE,
        jamPengambilan: VALID_TIME,
        idPegawaiPcc: 'PGW-001',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Jadwal pengambilan');
    expect(RequestWorkflowService.createOrUpdateSamplingSchedule).toHaveBeenCalledWith({
      idRegistrasi: 'REG-001',
      tanggalPengambilan: FUTURE_DATE,
      jamPengambilan: VALID_TIME,
      idPegawaiPcc: 'PGW-001',
    });
  });

  test('IT-032 Sistem menolak jadwal di luar jam kerja', async () => {
    const response = await request(app)
      .post('/requests/REG-001/sampling-schedule')
      .set(authHeader(Roles.ADMIN))
      .send({
        tanggalPengambilan: FUTURE_DATE,
        jamPengambilan: INVALID_TIME,
        idPegawaiPcc: 'PGW-001',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('jam operasional');
    expect(RequestWorkflowService.createOrUpdateSamplingSchedule).not.toHaveBeenCalled();
  });

  test('IT-033 Pelanggan mengajukan perubahan jadwal sampel', async () => {
    ScheduleChangeService.createScheduleChangeRequest.mockResolvedValueOnce({
      id_pengajuan_jadwal: 'PJ-001',
      id_registrasi: 'REG-001',
      status: 'Menunggu Persetujuan Admin',
    });

    const response = await request(app)
      .post('/requests/schedule-changes')
      .set(authHeader(Roles.CUSTOMER))
      .send(validScheduleChangePayload())
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Pengajuan perubahan jadwal berhasil dikirim.');
    expect(ScheduleChangeService.createScheduleChangeRequest).toHaveBeenCalledWith(expect.objectContaining({ idRegistrasi: 'REG-001' }), nikByRole[Roles.CUSTOMER]);
  });

  test('IT-034 Admin melihat daftar pengajuan perubahan jadwal', async () => {
    ScheduleChangeService.listScheduleChangeRequests.mockResolvedValueOnce([
      { id_pengajuan_jadwal: 'PJ-001', status: 'Menunggu Persetujuan Admin' },
    ]);

    const response = await request(app)
      .get('/requests/schedule-changes?status=Menunggu%20Persetujuan%20Admin')
      .set(authHeader(Roles.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(ScheduleChangeService.listScheduleChangeRequests).toHaveBeenCalledWith({
      status: 'Menunggu Persetujuan Admin',
      jenisJadwal: undefined,
    });
  });

  test('IT-035 Admin menyetujui pengajuan perubahan jadwal', async () => {
    ScheduleChangeService.decideScheduleChangeRequest.mockResolvedValueOnce({
      id_pengajuan_jadwal: 'PJ-001',
      status: 'Disetujui',
    });

    const response = await request(app)
      .post('/requests/schedule-changes/PJ-001/decision')
      .set(authHeader(Roles.ADMIN))
      .send(validScheduleDecisionPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Pengajuan perubahan jadwal berhasil diproses.');
    expect(ScheduleChangeService.decideScheduleChangeRequest).toHaveBeenCalledWith('PJ-001', expect.objectContaining({ action: 'approve' }), nikByRole[Roles.ADMIN]);
  });

  test('IT-036 Admin menolak pengajuan perubahan jadwal tanpa catatan ditolak validator', async () => {
    const response = await request(app)
      .post('/requests/schedule-changes/PJ-001/decision')
      .set(authHeader(Roles.ADMIN))
      .send({ action: 'reject' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Catatan penolakan wajib diisi.');
    expect(ScheduleChangeService.decideScheduleChangeRequest).not.toHaveBeenCalled();
  });

  test('IT-037 Pelanggan mengonfirmasi persetujuan jadwal sampel', async () => {
    ScheduleChangeService.confirmScheduleApproval.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status_konfirmasi: 'Disetujui Pelanggan',
    });

    const response = await request(app)
      .post('/requests/REG-001/schedule-confirmation')
      .set(authHeader(Roles.CUSTOMER))
      .send(validScheduleConfirmationPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Persetujuan jadwal berhasil disimpan.');
    expect(ScheduleChangeService.confirmScheduleApproval).toHaveBeenCalledWith(expect.objectContaining({ idRegistrasi: 'REG-001' }), nikByRole[Roles.CUSTOMER]);
  });

  test('IT-038 Admin menerima dan generate sampel setelah pembayaran sukses', async () => {
    RequestWorkflowService.receiveSamplesAndGenerateCodes.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status: 'Sampel Diterima',
      sampels: [{ no_sampel: '37/AM/VI/2026', diterima_pada: `${FUTURE_DATE}T09:00:00.000Z` }],
    });
    assignmentService.getSubkontrakItems.mockResolvedValueOnce([]);

    const response = await request(app)
      .post('/requests/REG-001/samples/receive')
      .set(authHeader(Roles.ADMIN))
      .send(validReceiveSamplesPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Sampel berhasil diterima');
    expect(RequestWorkflowService.receiveSamplesAndGenerateCodes).toHaveBeenCalledWith('REG-001', expect.any(Object), nikByRole[Roles.ADMIN]);
  });

  test('IT-039 Sistem menolak penerimaan sampel jika daftar sampel kosong', async () => {
    const response = await request(app)
      .post('/requests/REG-001/samples/receive')
      .set(authHeader(Roles.ADMIN))
      .send({ sampels: [] })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Data sampel');
    expect(RequestWorkflowService.receiveSamplesAndGenerateCodes).not.toHaveBeenCalled();
  });

  test('IT-040 Penyelia melihat opsi analis untuk penugasan', async () => {
    RequestService.getAnalystOptions.mockResolvedValueOnce([
      { nik: nikByRole[Roles.ANALIS], nama: 'Analis Uji' },
    ]);

    const response = await request(app)
      .get('/requests/analysts/options')
      .set(authHeader(Roles.PENYELIA))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data[0].nik).toBe(nikByRole[Roles.ANALIS]);
    expect(RequestService.getAnalystOptions).toHaveBeenCalledTimes(1);
  });

  test('IT-041 Penyelia melihat referensi analis dari modul assignment', async () => {
    assignmentService.getAnalystOptions.mockResolvedValueOnce([
      { nik: nikByRole[Roles.ANALIS], nama: 'Analis Uji' },
    ]);

    const response = await request(app)
      .get('/assignments/references/analysts')
      .set(authHeader(Roles.PENYELIA))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(assignmentService.getAnalystOptions).toHaveBeenCalledTimes(1);
  });

  test('IT-042 Penyelia melihat sampel siap ditugaskan', async () => {
    assignmentService.getPendingItems.mockResolvedValueOnce([
      { no_sampel: '37/AM/VI/2026', status: 'Siap Ditugaskan' },
    ]);

    const response = await request(app)
      .get('/assignments/pending-items')
      .set(authHeader(Roles.PENYELIA))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(assignmentService.getPendingItems).toHaveBeenCalledTimes(1);
  });

  test('IT-043 Penyelia membuat penugasan analis', async () => {
    assignmentService.createAssignment.mockResolvedValueOnce({
      id_penugasan: 'PNG-001',
      id_user_analis: nikByRole[Roles.ANALIS],
      status: 'Ditugaskan',
    });

    const response = await request(app)
      .post('/assignments')
      .set(authHeader(Roles.PENYELIA))
      .send(validAssignmentPayload())
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Penugasan berhasil dibuat.');
    expect(response.body.data.id_penugasan).toBe('PNG-001');
    expect(assignmentService.createAssignment).toHaveBeenCalledWith(expect.any(Object), nikByRole[Roles.PENYELIA]);
  });

  test('IT-044 Sistem menolak pembuatan penugasan jika data assignment kosong', async () => {
    const response = await request(app)
      .post('/assignments')
      .set(authHeader(Roles.PENYELIA))
      .send(validAssignmentPayload({ assignments: [] }))
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('item yang ditugaskan');
    expect(assignmentService.createAssignment).not.toHaveBeenCalled();
  });

  test('IT-045 Penyelia memonitor status penugasan analis', async () => {
    assignmentService.getAssignmentMonitor.mockResolvedValueOnce([
      { id_penugasan: 'PNG-001', status: 'Berjalan', tanggal_tenggat: FUTURE_DATE_2 },
    ]);

    const response = await request(app)
      .get('/assignments/monitor')
      .set(authHeader(Roles.PENYELIA))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data[0].id_penugasan).toBe('PNG-001');
    expect(assignmentService.getAssignmentMonitor).toHaveBeenCalledTimes(1);
  });
});
