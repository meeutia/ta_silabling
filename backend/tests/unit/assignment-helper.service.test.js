jest.mock('../../src/models/Associations', () => ({
  Lka: {}, LkaHasil: {}, LkaRevisi: {}, Penugasan: {}, PenugasanDetail: {},
}));

const { Op } = require('sequelize');
const fpm = require('../../src/services/assignment/assignment-fpm.helper');
const object = require('../../src/services/assignment/assignment-object.helper');
const scope = require('../../src/services/assignment/assignment-scope.helper');
const status = require('../../src/services/assignment/assignment-status.helper');
const { SUBKONTRAK_ASSIGNMENT_TYPE, LKA_HASIL_STATUS } = require('../../src/services/assignment/assignment.constants');

describe('Unit Test - helper penugasan dan status LKA', () => {
  test('pairKey membentuk pasangan FPM dan nomor sampel yang stabil', () => {
    expect(fpm.pairKey(' FPM-1 ', ' 1/AM/V/2026 ')).toBe('FPM-1::1/AM/V/2026');
  });

  test('methodGroupKeyFromFpm membaca ID metode dari struktur langsung maupun relasi', () => {
    expect(fpm.methodGroupKeyFromFpm({ id_metode_parameter: 'PM-1' })).toBe('PM-1');
    expect(fpm.methodGroupKeyFromFpm({ ParameterMetode: { idMetodeParameter: 'PM-2' } })).toBe('PM-2');
  });

  test('assertFpmParameterMethodConsistency menolak metode berbeda dalam satu detail', () => {
    expect(() => fpm.assertFpmParameterMethodConsistency([{ id_metode_parameter: 'PM-1' }, { id_metode_parameter: 'PM-1' }])).not.toThrow();
    expect(() => fpm.assertFpmParameterMethodConsistency([{ id_metode_parameter: 'PM-1' }, { id_metode_parameter: 'PM-2' }])).toThrow('harus memakai parameter dan metode yang sama');
  });

  test('assignmentGroupKey menggabungkan registrasi dan metode', () => {
    expect(fpm.assignmentGroupKey({ fppl_sampel: { id_registrasi: 'REG-1' }, id_metode_parameter: 'PM-1' })).toBe('REG-1::PM-1');
  });

  test('getActiveJadwalFromFppl memilih jadwal aktif dengan ID terbaru', () => {
    expect(fpm.getActiveJadwalFromFppl({ jadwal_sampels: [
      { id_jadwal: 'JDW-1', status_jadwal: 'Dibatalkan' },
      { id_jadwal: 'JDW-2', tanggal_jadwal: '2026-06-02', status_jadwal: 'Terjadwal' },
      { id_jadwal: 'JDW-10', tanggal_jadwal: '2026-06-01', status_jadwal: 'Terjadwal' },
    ] })).toMatchObject({ id_jadwal: 'JDW-10' });
  });

  test('sortSamplesForAssignment mengurutkan nomor sampel secara numerik', () => {
    const rows = [{ no_sampel: '10/AM/V/2026' }, { no_sampel: '2/AM/V/2026' }, { no_sampel: '1/AM/V/2026' }];
    expect(rows.sort(fpm.sortSamplesForAssignment).map((x) => x.no_sampel)).toEqual(['1/AM/V/2026', '2/AM/V/2026', '10/AM/V/2026']);
  });

  test('helper subkontrak menormalkan tinyint dan kemampuan internal', () => {
    expect(fpm.toTinyInt('1')).toBe(1);
    expect(fpm.toTinyInt(false)).toBe(0);
    expect(fpm.isSubkontrakFpm({}, { is_subkontrak: 1 })).toBe(true);
    expect(fpm.isInternalCapableFpm({ is_subkontrak: 0 })).toBe(true);
  });

  test('assignment-object helper menormalkan ID dan teks unik', () => {
    expect(object.normalizeIdList('A, B, A, , C')).toEqual(['A', 'B', 'C']);
    expect(object.normalizeIdList(null)).toEqual([]);
    expect(object.uniqueText(['pH', 'TSS', 'pH', ''])).toBe('pH, TSS');
    expect(object.firstDate([null, '', '2026-06-03'])).toBe('2026-06-03');
  });

  test('assignment-scope helper membentuk filter internal dan subkontrak', () => {
    expect(scope.internalAssignmentWhere({ id_penugasan: 'PNG-1' })).toEqual({
      id_penugasan: 'PNG-1',
      [Op.or]: [{ jenis_penugasan: null }, { jenis_penugasan: { [Op.ne]: SUBKONTRAK_ASSIGNMENT_TYPE } }],
    });
    expect(scope.subkontrakAssignmentWhere({ id_penugasan: 'PNG-2' })).toEqual({ id_penugasan: 'PNG-2', jenis_penugasan: SUBKONTRAK_ASSIGNMENT_TYPE });
    expect(scope.isSubkontrakAssignment({ jenisPenugasan: SUBKONTRAK_ASSIGNMENT_TYPE.toLowerCase() })).toBe(true);
  });

  test('assignment-status helper memetakan status hasil dan status agregat', () => {
    expect(status.mapStatusLkaToHasilStatus('Menunggu Verifikasi Penyelia')).toBe(LKA_HASIL_STATUS.WAIT_PENYELIA);
    expect(status.mapStatusLkaToHasilStatus('Tidak dikenal')).toBeNull();
    expect(status.deriveAggregateLkaStatus([
      { status_review_hasil: LKA_HASIL_STATUS.APPROVED_KASI },
      { status_review_hasil: LKA_HASIL_STATUS.APPROVED_KASI },
    ])).toBe('Disetujui Kasi Pengujian');
    expect(status.derivePenugasanHeaderStatusFromDetails(['Disetujui', 'Selesai'])).toBe('Selesai');
    expect(status.derivePenugasanHeaderStatusFromDetails(['Disetujui', 'Sedang Dikerjakan'])).toBe('Aktif');
  });
});
