const {
  LHU_STATUS,
  isFinalLhuStatus,
  isPickedUpStatus,
} = require('../../src/services/lhu/lhu-status.helper');

describe('Unit Test - lhu-status.helper service', () => {
  test('isFinalLhuStatus true hanya untuk status LHU final disetujui', () => {
    expect(isFinalLhuStatus(LHU_STATUS.APPROVED_FINAL)).toBe(true);
    expect(isFinalLhuStatus('Draft')).toBe(false);
    expect(isFinalLhuStatus('')).toBe(false);
  });

  test('isPickedUpStatus true hanya untuk status Sudah Diambil', () => {
    expect(isPickedUpStatus('Sudah Diambil')).toBe(true);
    expect(isPickedUpStatus('Belum Diambil')).toBe(false);
    expect(isPickedUpStatus(null)).toBe(false);
  });
});
