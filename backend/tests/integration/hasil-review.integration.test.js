'use strict';

require('../fixtures/integration-mocks');

const request = require('supertest');
const app = require('../../src/app');
const assignmentReadService = require('../../src/services/assignment/assignment-read.service');
const assignmentWorksheetService = require('../../src/services/assignment/assignment-worksheet.service');
const assignmentPenyeliaReviewService = require('../../src/services/assignment/assignment-penyelia-review.service');
const assignmentKasiReviewService = require('../../src/services/assignment/assignment-kasi-review.service');
const {
  FUTURE_DATE_2,
  Roles,
  authHeader,
  nikByRole,
  validKasiRevisionPayload,
  validPenyeliaRevisionPayload,
  validResultsPayload,
  validSubmitPayload,
  validSubkontrakResultsPayload,
  validWorksheetDraftPayload,
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

describe('Integration Testing - Input Hasil dan Review', () => {
  test('IT-046 Penyelia melihat overview pengujian', async () => {
    assignmentReadService.getTestingOverview.mockResolvedValueOnce({
      totalSampel: 3,
      menungguHasil: 1,
      selesai: 2,
    });

    const response = await request(app)
      .get('/assignments/testing-overview')
      .set(authHeader(Roles.PENYELIA))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalSampel).toBe(3);
    expect(assignmentReadService.getTestingOverview).toHaveBeenCalledTimes(1);
  });

  test('IT-047 Analis melihat penugasan miliknya', async () => {
    assignmentReadService.getMyAssignments.mockResolvedValueOnce([
      { id_penugasan_detail: 'PD001', no_sampel: '37/AM/VI/2026', status: 'Ditugaskan' },
    ]);

    const response = await request(app)
      .get('/assignments/my')
      .set(authHeader(Roles.ANALIS))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(assignmentReadService.getMyAssignments).toHaveBeenCalledWith(nikByRole[Roles.ANALIS]);
  });

  test('IT-048 Analis melihat detail pekerjaan pengujian', async () => {
    assignmentWorksheetService.getAssignmentWorkDetail.mockResolvedValueOnce({
      id_penugasan_detail: 'PD001',
      no_sampel: '37/AM/VI/2026',
      parameter: 'pH',
    });

    const response = await request(app)
      .get('/assignments/work/PD001')
      .set(authHeader(Roles.ANALIS))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id_penugasan_detail).toBe('PD001');
    expect(assignmentWorksheetService.getAssignmentWorkDetail).toHaveBeenCalledWith('PD001', nikByRole[Roles.ANALIS]);
  });

  test('IT-049 Analis menyimpan draft worksheet pengujian', async () => {
    assignmentWorksheetService.saveWorksheetDraft.mockResolvedValueOnce({
      id_penugasan_detail: 'PD001',
      status: 'Draft',
    });

    const response = await request(app)
      .put('/assignments/work/PD001/worksheet')
      .set(authHeader(Roles.ANALIS))
      .send(validWorksheetDraftPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Worksheet draft tersimpan.');
    expect(assignmentWorksheetService.saveWorksheetDraft).toHaveBeenCalledWith('PD001', expect.any(Object), nikByRole[Roles.ANALIS]);
  });

  test('IT-050 Analis menginputkan hasil pengujian', async () => {
    assignmentWorksheetService.saveWorksheetResults.mockResolvedValueOnce({
      id_penugasan_detail: 'PD001',
      status: 'Draft Hasil',
      results: validResultsPayload().results,
    });

    const response = await request(app)
      .put('/assignments/work/PD001/results')
      .set(authHeader(Roles.ANALIS))
      .send(validResultsPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Hasil pengujian tersimpan.');
    expect(assignmentWorksheetService.saveWorksheetResults).toHaveBeenCalledWith('PD001', expect.any(Object), nikByRole[Roles.ANALIS]);
  });

  test('IT-051 Sistem menolak hasil pengujian dengan format hasil tidak valid', async () => {
    const response = await request(app)
      .put('/assignments/work/PD001/results')
      .set(authHeader(Roles.ANALIS))
      .send(validResultsPayload({ results: [{ noSampel: '37/AM/VI/2026', hasil: 'abc' }] }))
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('harus berupa angka');
    expect(assignmentWorksheetService.saveWorksheetResults).not.toHaveBeenCalled();
  });

  test('IT-052 Analis mengirim hasil pengujian ke Penyelia', async () => {
    assignmentWorksheetService.submitWorksheet.mockResolvedValueOnce({
      id_penugasan_detail: 'PD001',
      status: 'Menunggu Review Penyelia',
    });

    const response = await request(app)
      .post('/assignments/work/PD001/submit')
      .set(authHeader(Roles.ANALIS))
      .send(validSubmitPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Worksheet berhasil dikirim.');
    expect(assignmentWorksheetService.submitWorksheet).toHaveBeenCalledWith('PD001', nikByRole[Roles.ANALIS], expect.any(Object));
  });

  test('IT-053 Sistem menolak submit hasil jika file worksheet belum tersedia', async () => {
    const invalidPayload = validSubmitPayload({
      worksheet: {
        tanggalMulaiPengujian: '2026-06-02',
        tanggalSelesaiPengujian: '2026-06-03',
        dhlAkuades: '1,2',
        fileWorksheetPath: '',
      },
    });

    const response = await request(app)
      .post('/assignments/work/PD001/submit')
      .set(authHeader(Roles.ANALIS))
      .send(invalidPayload)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('File Worksheet wajib diupload.');
    expect(assignmentWorksheetService.submitWorksheet).not.toHaveBeenCalled();
  });

  test('IT-054 Penyelia melihat antrean hasil yang menunggu review', async () => {
    assignmentPenyeliaReviewService.getReviewQueue.mockResolvedValueOnce([
      { id_penugasan_detail: 'PD001', status: 'Menunggu Review Penyelia' },
    ]);

    const response = await request(app)
      .get('/assignments/review/queue')
      .set(authHeader(Roles.PENYELIA))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data[0].status).toBe('Menunggu Review Penyelia');
    expect(assignmentPenyeliaReviewService.getReviewQueue).toHaveBeenCalledTimes(1);
  });

  test('IT-055 Penyelia melihat detail hasil yang akan direview', async () => {
    assignmentPenyeliaReviewService.getReviewDetail.mockResolvedValueOnce({
      id_penugasan_detail: 'PD001',
      results: validResultsPayload().results,
    });

    const response = await request(app)
      .get('/assignments/review/detail/PD001')
      .set(authHeader(Roles.PENYELIA))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id_penugasan_detail).toBe('PD001');
    expect(assignmentPenyeliaReviewService.getReviewDetail).toHaveBeenCalledWith('PD001');
  });

  test('IT-056 Penyelia menyetujui hasil pengujian', async () => {
    assignmentPenyeliaReviewService.reviewWorksheet.mockResolvedValueOnce({
      id_penugasan_detail: 'PD001',
      status: 'Disetujui Penyelia',
    });

    const response = await request(app)
      .post('/assignments/details/PD001/approve')
      .set(authHeader(Roles.PENYELIA))
      .send({})
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Worksheet berhasil disetujui.');
    expect(assignmentPenyeliaReviewService.reviewWorksheet).toHaveBeenCalledWith('PD001', { action: 'approve' }, nikByRole[Roles.PENYELIA]);
  });

  test('IT-057 Penyelia meminta revisi hasil pengujian dengan catatan', async () => {
    assignmentPenyeliaReviewService.reviewWorksheet.mockResolvedValueOnce({
      id_penugasan_detail: 'PD001',
      status: 'Perlu Revisi Hasil',
      revisions: validPenyeliaRevisionPayload().revisions,
    });

    const response = await request(app)
      .post('/assignments/details/PD001/revise')
      .set(authHeader(Roles.PENYELIA))
      .send(validPenyeliaRevisionPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Permintaan revisi berhasil dikirim.');
    expect(assignmentPenyeliaReviewService.reviewWorksheet).toHaveBeenCalledWith('PD001', expect.objectContaining({ action: 'revise' }), nikByRole[Roles.PENYELIA]);
  });

  test('IT-058 Kasi melihat detail hasil yang telah disetujui Penyelia', async () => {
    assignmentKasiReviewService.getKasiReviewDetail.mockResolvedValueOnce({
      no_sampel: '37/AM/VI/2026',
      status_review: 'Disetujui Penyelia',
    });

    const response = await request(app)
      .get('/assignments/kasi-review/detail?noSampel=37%2FAM%2FVI%2F2026')
      .set(authHeader(Roles.KASI))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status_review).toBe('Disetujui Penyelia');
    expect(assignmentKasiReviewService.getKasiReviewDetail).toHaveBeenCalledWith('37/AM/VI/2026');
  });

  test('IT-059 Kasi menyetujui hasil pengujian', async () => {
    assignmentKasiReviewService.approveKasiReview.mockResolvedValueOnce({
      no_sampel: '37/AM/VI/2026',
      status_review: 'Disetujui Kasi',
    });

    const response = await request(app)
      .post('/assignments/kasi-review/approve')
      .set(authHeader(Roles.KASI))
      .send({ noSampel: '37/AM/VI/2026' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Hasil sampel berhasil disetujui Kasi Pengujian.');
    expect(assignmentKasiReviewService.approveKasiReview).toHaveBeenCalledWith('37/AM/VI/2026', nikByRole[Roles.KASI]);
  });

  test('IT-060 Kasi meminta revisi hasil pengujian dengan catatan', async () => {
    assignmentKasiReviewService.reviseKasiReview.mockResolvedValueOnce({
      no_sampel: '37/AM/VI/2026',
      status_review: 'Revisi Kasi',
      revisions: validKasiRevisionPayload().revisions,
    });

    const response = await request(app)
      .post('/assignments/kasi-review/revise')
      .set(authHeader(Roles.KASI))
      .send(validKasiRevisionPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Permintaan revisi hasil berhasil dikirim.');
    expect(assignmentKasiReviewService.reviseKasiReview).toHaveBeenCalledWith(
      '37/AM/VI/2026',
      null,
      nikByRole[Roles.KASI],
      [],
      validKasiRevisionPayload().revisions
    );
  });
});
