'use strict';

require('../fixtures/integration-mocks');

const request = require('supertest');
const app = require('../../src/app');
const lhuService = require('../../src/services/lhu/lhu.service');
const lhuFinalizationService = require('../../src/services/lhu/lhu-finalization.service');
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

describe('Integration Testing - LHU dan Pengambilan LHU', () => {
  test('IT-061 QC melihat antrean finalisasi LHU', async () => {
    lhuFinalizationService.getFinalizationQueue.mockResolvedValueOnce([
      { id_registrasi: 'REG-001', status: 'Disetujui Kasi' },
    ]);

    const response = await request(app)
      .get('/lhu/finalization-queue')
      .set(authHeader(Roles.QC))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(lhuFinalizationService.getFinalizationQueue).toHaveBeenCalledTimes(1);
  });

  test('IT-062 QC melihat detail finalisasi LHU berdasarkan registrasi', async () => {
    lhuFinalizationService.getFinalizationDetail.mockResolvedValueOnce({
      id_registrasi: 'REG-001',
      sampels: [{ no_sampel: '37/AM/VI/2026' }],
    });

    const response = await request(app)
      .get('/lhu/finalization/detail?idRegistrasi=REG-001')
      .set(authHeader(Roles.QC))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id_registrasi).toBe('REG-001');
    expect(lhuFinalizationService.getFinalizationDetail).toHaveBeenCalledWith('REG-001', null);
  });

  test('IT-063 QC melihat pilihan paket baku mutu untuk LHU', async () => {
    lhuFinalizationService.getPaketBmOptions.mockResolvedValueOnce([
      { id_pkt_bm: 'PKT-001', nama_paket: 'Baku Mutu Air' },
    ]);

    const response = await request(app)
      .get('/lhu/finalization/paket-bm?idRegistrasi=REG-001')
      .set(authHeader(Roles.QC))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data[0].id_pkt_bm).toBe('PKT-001');
    expect(lhuFinalizationService.getPaketBmOptions).toHaveBeenCalledWith('REG-001');
  });

  test('IT-064 QC menyusun LHU dari hasil yang sudah disetujui Kasi', async () => {
    lhuFinalizationService.finalizeLhu.mockResolvedValueOnce({
      nomor_lhu: 'LHU-001',
      id_registrasi: 'REG-001',
      status_lhu: 'Disahkan',
      file_draft_path: '/lhu/draft/LHU-001.pdf',
    });

    const response = await request(app)
      .post('/lhu/finalization/finalize')
      .set(authHeader(Roles.QC))
      .send(validFinalizeLhuPayload())
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('LHU berhasil difinalisasi');
    expect(response.body.data.nomor_lhu).toBe('LHU-001');
    expect(lhuFinalizationService.finalizeLhu).toHaveBeenCalledWith('REG-001', expect.any(Object), nikByRole[Roles.QC]);
  });


  test('IT-066 Admin melihat antrean pengambilan LHU', async () => {
    pickupService.getPickupQueue.mockResolvedValueOnce([
      { id_registrasi: 'REG-001', status_lhu: 'Disahkan' },
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
