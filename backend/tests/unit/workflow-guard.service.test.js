const RequestStatus = require('../../src/constants/request-status');
const {
  SCHEDULE_CHANGE_STATUS,
  SCHEDULE_STATUS,
} = require('../../src/constants/workflow-status.constant');
const workflowGuard = require('../../src/services/workflow/workflow-guard.service');

describe('Unit Test - workflow-guard.service untuk proteksi alur bisnis final', () => {
  test('normalizeStatus mengubah alias lama menjadi status aktif', () => {
    expect(workflowGuard.normalizeStatus('Selesai Diambil')).toBe(RequestStatus.COMPLETED);
    expect(workflowGuard.normalizeStatus('Menunggu Verifikasi Pembayaran')).toBe(RequestStatus.WAITING_PAYMENT);
  });

  test('assertRequestNotCompleted menolak proses ulang permohonan selesai', () => {
    expect(() => workflowGuard.assertRequestNotCompleted(RequestStatus.COMPLETED)).toThrow('Permohonan sudah selesai dan tidak dapat diproses ulang.');
    expect(() => workflowGuard.assertRequestNotCompleted(RequestStatus.TESTING_PROCESS)).not.toThrow();
  });

  test('assertLhuNotPickedUp menolak perubahan saat LHU sudah diambil', () => {
    expect(() => workflowGuard.assertLhuNotPickedUp({ status_pengambilan: SCHEDULE_STATUS.PICKED_UP })).toThrow('LHU sudah diambil dan tidak dapat diproses ulang.');
    expect(() => workflowGuard.assertLhuNotPickedUp({ diambil_pada: '2026-06-12T09:00:00.000Z' })).toThrow('LHU sudah diambil dan tidak dapat diproses ulang.');
    expect(() => workflowGuard.assertLhuNotPickedUp({ status_pengambilan: 'Terjadwal' })).not.toThrow();
  });

  test('assertScheduleChangePending hanya menerima pengajuan perubahan jadwal yang masih pending', () => {
    expect(() => workflowGuard.assertScheduleChangePending(SCHEDULE_CHANGE_STATUS.PENDING)).not.toThrow();
    expect(() => workflowGuard.assertScheduleChangePending(SCHEDULE_CHANGE_STATUS.APPROVED)).toThrow('Pengajuan perubahan jadwal sudah diproses.');
  });

  test('assertCanApproveScheduleChange menolak approval jadwal LHU jika permohonan selesai', () => {
    expect(() => workflowGuard.assertCanApproveScheduleChange({
      requestStatus: RequestStatus.COMPLETED,
      scheduleKind: 'LHU',
      schedule: { status_pengambilan: 'Terjadwal' },
    })).toThrow('Permohonan sudah selesai dan tidak dapat diproses ulang.');
  });

  test('assertCanApproveScheduleChange menolak approval jadwal LHU jika LHU sudah diambil', () => {
    expect(() => workflowGuard.assertCanApproveScheduleChange({
      requestStatus: RequestStatus.WAITING_LHU_PICKUP,
      scheduleKind: 'LHU',
      schedule: { status_pengambilan: SCHEDULE_STATUS.PICKED_UP },
    })).toThrow('LHU sudah diambil dan tidak dapat diproses ulang.');
  });

  test('assertCanApproveScheduleChange mengizinkan perubahan jadwal sampel ketika permohonan belum selesai', () => {
    expect(() => workflowGuard.assertCanApproveScheduleChange({
      requestStatus: RequestStatus.WAITING_SAMPLE_PICKUP,
      scheduleKind: 'SAMPEL',
      schedule: { status_pengambilan: SCHEDULE_STATUS.PICKED_UP },
    })).not.toThrow();
  });
});
