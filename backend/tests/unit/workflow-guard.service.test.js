const RequestStatus = require('../../src/constants/request-status');
const { SCHEDULE_CHANGE_STATUS, SCHEDULE_STATUS } = require('../../src/constants/workflow-status.constant');
const guard = require('../../src/services/workflow/workflow-guard.service');

describe('Unit Test - workflow-guard.service', () => {
  test('normalizeStatus mengubah alias lama menjadi status aktif', () => {
    expect(guard.normalizeStatus('Selesai Diambil')).toBe(RequestStatus.COMPLETED);
    expect(guard.normalizeStatus('Menunggu Verifikasi Pembayaran')).toBe(RequestStatus.WAITING_PAYMENT);
  });

  test('createWorkflowError memasang statusCode default dan kustom', () => {
    expect(guard.createWorkflowError('Gagal')).toMatchObject({ message: 'Gagal', statusCode: 400 });
    expect(guard.createWorkflowError('Gagal', 409).statusCode).toBe(409);
  });

  test('isRequestCompleted hanya true untuk status selesai setelah normalisasi', () => {
    expect(guard.isRequestCompleted(RequestStatus.COMPLETED)).toBe(true);
    expect(guard.isRequestCompleted('Selesai Diambil')).toBe(true);
    expect(guard.isRequestCompleted(RequestStatus.TESTING_PROCESS)).toBe(false);
  });

  test('assertRequestNotCompleted menolak permohonan selesai', () => {
    expect(() => guard.assertRequestNotCompleted(RequestStatus.COMPLETED)).toThrow('Permohonan sudah selesai');
    expect(() => guard.assertRequestNotCompleted(RequestStatus.TESTING_PROCESS)).not.toThrow();
  });

  test('isLhuPickedUp membaca status pengambilan dan waktu pengambilan', () => {
    expect(guard.isLhuPickedUp({ status_pengambilan: SCHEDULE_STATUS.PICKED_UP })).toBe(true);
    expect(guard.isLhuPickedUp({ diambil_pada: '2026-06-03T09:00:00Z' })).toBe(true);
    expect(guard.isLhuPickedUp({ status_pengambilan: 'Terjadwal' })).toBe(false);
  });

  test('assertLhuNotPickedUp menolak LHU yang telah diambil', () => {
    expect(() => guard.assertLhuNotPickedUp({ diambil_pada: '2026-06-03' })).toThrow('LHU sudah diambil');
    expect(() => guard.assertLhuNotPickedUp({ status_pengambilan: 'Terjadwal' })).not.toThrow();
  });

  test('assertScheduleChangePending hanya menerima pengajuan pending', () => {
    expect(() => guard.assertScheduleChangePending(SCHEDULE_CHANGE_STATUS.PENDING)).not.toThrow();
    expect(() => guard.assertScheduleChangePending(SCHEDULE_CHANGE_STATUS.APPROVED)).toThrow('sudah diproses');
  });

  test('assertCanApproveScheduleChange menolak permohonan selesai dan LHU telah diambil', () => {
    expect(() => guard.assertCanApproveScheduleChange({ requestStatus: RequestStatus.COMPLETED, scheduleKind: 'LHU' })).toThrow('Permohonan sudah selesai');
    expect(() => guard.assertCanApproveScheduleChange({
      requestStatus: RequestStatus.WAITING_LHU_PICKUP,
      scheduleKind: 'LHU',
      schedule: { status_pengambilan: SCHEDULE_STATUS.PICKED_UP },
    })).toThrow('LHU sudah diambil');
  });

  test('assertCanApproveScheduleChange mengizinkan perubahan jadwal sampel sebelum selesai', () => {
    expect(() => guard.assertCanApproveScheduleChange({
      requestStatus: RequestStatus.WAITING_SAMPLE_PICKUP,
      scheduleKind: 'SAMPEL',
      schedule: { status_pengambilan: SCHEDULE_STATUS.PICKED_UP },
    })).not.toThrow();
  });
});
