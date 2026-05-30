'use strict';

require('../fixtures/integration-mocks');

const request = require('supertest');
const app = require('../../src/app');
const lhuService = require('../../src/services/lhu/lhu.service');
const pickupService = require('../../src/services/lhu/lhu-pickup.service');
const {
  Roles,
  authHeader,
  nikByRole,
  validFinalizeLhuPayload,
  validPickupCompletePayload,
  validPickupSchedulePayload,
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

describe('Integration Testing - LHU, Approval Kalab, dan Pengambilan LHU', () => {
  test('IT-061 QC melihat antrean finalisasi LHU', async () => {
    lhuService.getFinalizationQueue.mockResolvedValueOnce([
      { id_registrasi: 'REG-001', status: 'Disetujui Kasi' },
    ]);

    const response = await request(app)
      .get('/lhu/finalization-queue')
      .set(authHeader(Roles.QC))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(lhuService.getFinalizationQueue).toHaveBeenCalledTimes(1);
  });

  test('IT-062 QC melihat detail finalisasi LHU berdasarkan registrasi', async () => {
    lhuService.getFinalizationDetail.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      sampels: [{ no_sampel: '37/AM/VI/2026' }],
    });

    const response = await request(app)
      .get('/lhu/finalization/detail?idRegistrasi=REG-001')
      .set(authHeader(Roles.QC))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id_registrasi).toBe('REG-001');
    expect(lhuService.getFinalizationDetail).toHaveBeenCalledWith('REG-001');
  });

  test('IT-063 QC melihat pilihan paket baku mutu untuk LHU', async () => {
    lhuService.getPaketBmOptions.mockResolvedValueOnce([
      { id_pkt_bm: 'PKT-001', nama_paket: 'Baku Mutu Air' },
    ]);

    const response = await request(app)
      .get('/lhu/finalization/paket-bm?idRegistrasi=REG-001')
      .set(authHeader(Roles.QC))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data[0].id_pkt_bm).toBe('PKT-001');
    expect(lhuService.getPaketBmOptions).toHaveBeenCalledWith('REG-001');
  });

  test('IT-064 QC menyusun LHU dari hasil yang sudah disetujui Kasi', async () => {
    lhuService.finalizeLhu.mockResolvedValueOnce({
      nomor_lhu: 'LHU-001',
      id_registrasi: 'REG-001',
      status_lhu: 'Menunggu Approval Kalab',
      file_draft_path: '/lhu/draft/LHU-001.pdf',
    });

    const response = await request(app)
      .post('/lhu/finalization/finalize')
      .set(authHeader(Roles.QC))
      .send(validFinalizeLhuPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('LHU berhasil dibuat');
    expect(response.body.data.nomor_lhu).toBe('LHU-001');
    expect(lhuService.finalizeLhu).toHaveBeenCalledWith('REG-001', expect.any(Object), nikByRole[Roles.QC]);
  });

  test('IT-065 Kalab menyetujui LHU yang telah disusun QC', async () => {
    lhuService.approveByKalab.mockResolvedValueOnce({
      nomor_lhu: 'LHU-001',
      status_lhu: 'Disahkan Kalab',
      file_final_path: '/lhu/final/LHU-001.pdf',
    });

    const response = await request(app)
      .post('/lhu/kalab/approve')
      .set(authHeader(Roles.KALAB))
      .send({ nomorLhu: 'LHU-001' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('LHU berhasil disahkan');
    expect(lhuService.approveByKalab).toHaveBeenCalledWith('LHU-001', nikByRole[Roles.KALAB]);
  });

  test('IT-066 Admin melihat antrean pengambilan LHU', async () => {
    pickupService.getPickupQueue.mockResolvedValueOnce([
      { id_registrasi: 'REG-001', status_lhu: 'Disahkan Kalab' },
    ]);

    const response = await request(app)
      .get('/lhu/pickup/queue')
      .set(authHeader(Roles.ADMIN))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(pickupService.getPickupQueue).toHaveBeenCalledTimes(1);
  });

  test('IT-067 Admin menjadwalkan pengambilan LHU final', async () => {
    pickupService.schedulePickup.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status_lhu: 'Dijadwalkan Pengambilan',
    });

    const response = await request(app)
      .post('/lhu/pickup/schedule')
      .set(authHeader(Roles.ADMIN))
      .send(validPickupSchedulePayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Jadwal pengambilan LHU berhasil disimpan.');
    expect(pickupService.schedulePickup).toHaveBeenCalledWith(expect.objectContaining({ idRegistrasi: 'REG-001' }), nikByRole[Roles.ADMIN]);
  });

  test('IT-068 Admin menandai LHU sudah diambil pelanggan', async () => {
    pickupService.completePickup.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      status_lhu: 'Diambil',
      nama_pengambil: 'Dewi Pelanggan',
    });

    const response = await request(app)
      .post('/lhu/pickup/complete')
      .set(authHeader(Roles.ADMIN))
      .send(validPickupCompletePayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Pengambilan LHU berhasil ditandai.');
    expect(pickupService.completePickup).toHaveBeenCalledWith(expect.objectContaining({ idRegistrasi: 'REG-001' }), nikByRole[Roles.ADMIN]);
  });
});
