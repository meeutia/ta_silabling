jest.mock('../../src/models/Associations', () => ({
  Lka: {},
  LkaHasil: { findAll: jest.fn() },
}));

const { Op } = require('sequelize');
const { LkaHasil } = require('../../src/models/Associations');
const lkaResultService = require('../../src/services/assignment/assignment-lka-result.service');
const fpmHelper = require('../../src/services/assignment/assignment-fpm.helper');
const objectHelper = require('../../src/services/assignment/assignment-object.helper');
const scopeHelper = require('../../src/services/assignment/assignment-scope.helper');
const { SUBKONTRAK_ASSIGNMENT_TYPE } = require('../../src/services/assignment/assignment.constants');

describe('Unit Test - service alur bisnis penugasan analis dan LKA', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('helper pembentukan penugasan', () => {
    test('assertFpmParameterMethodConsistency menerima FPM dengan metode sama', () => {
      expect(() => fpmHelper.assertFpmParameterMethodConsistency([
        { id_metode_parameter: 'PM-001' },
        { idMetodeParameter: 'PM-001' },
      ])).not.toThrow();
    });

    test('assertFpmParameterMethodConsistency menolak sampel dalam satu detail dengan metode berbeda', () => {
      expect(() => fpmHelper.assertFpmParameterMethodConsistency([
        { id_metode_parameter: 'PM-001' },
        { id_metode_parameter: 'PM-002' },
      ])).toThrow('Sampel dalam satu detail penugasan harus memakai parameter dan metode yang sama.');
    });

    test('assignmentGroupKey mengelompokkan penugasan berdasarkan registrasi dan metode', () => {
      expect(fpmHelper.assignmentGroupKey({
        id_registrasi: 'REG-001',
        id_metode_parameter: 'PM-001',
      })).toBe('REG-001::PM-001');

      expect(fpmHelper.assignmentGroupKey({
        fppl_sampel: { id_registrasi: 'REG-002' },
        parameter_metode: { id_metode_parameter: 'PM-002' },
      })).toBe('REG-002::PM-002');
    });

    test('sortSamplesForAssignment mengurutkan nomor sampel secara numerik', () => {
      const rows = [
        { no_sampel: '10/AM/V/2026' },
        { no_sampel: '2/AM/V/2026' },
        { no_sampel: '1/AM/V/2026' },
      ].sort(fpmHelper.sortSamplesForAssignment);

      expect(rows.map((row) => row.no_sampel)).toEqual([
        '1/AM/V/2026',
        '2/AM/V/2026',
        '10/AM/V/2026',
      ]);
    });

    test('getActiveJadwalFromFppl mengambil jadwal aktif terbaru dan mengabaikan yang dibatalkan', () => {
      const active = fpmHelper.getActiveJadwalFromFppl({
        jadwal_sampels: [
          { id_jadwal: 'JDW-001', tanggal_jadwal: '2026-06-01', jam_jadwal: '08:00:00', status_jadwal: 'Dibatalkan' },
          { id_jadwal: 'JDW-002', tanggal_jadwal: '2026-06-02', jam_jadwal: '09:00:00', status_jadwal: 'Terjadwal' },
          { id_jadwal: 'JDW-003', tanggal_jadwal: '2026-06-03', jam_jadwal: '10:00:00', status_jadwal: 'Terjadwal' },
        ],
      });

      expect(active).toMatchObject({ id_jadwal: 'JDW-003' });
    });

    test('isSubkontrakFpm dan isInternalCapableFpm membaca status subkontrak dari FPM atau parameter metode', () => {
      expect(fpmHelper.isSubkontrakFpm({ is_subkontrak: 1 })).toBe(true);
      expect(fpmHelper.isSubkontrakFpm({}, { is_subkontrak: '1' })).toBe(true);
      expect(fpmHelper.isInternalCapableFpm({ is_subkontrak: 0 })).toBe(true);
      expect(fpmHelper.isInternalCapableFpm({ is_subkontrak: 1 })).toBe(false);
    });
  });

  describe('helper object dan scope penugasan', () => {
    test('normalizeIdList membersihkan ID duplikat dari array dan string CSV', () => {
      expect(objectHelper.normalizeIdList(['A', 'B', 'A', '', null])).toEqual(['A', 'B']);
      expect(objectHelper.normalizeIdList('A, B, A, , C')).toEqual(['A', 'B', 'C']);
      expect(objectHelper.normalizeIdList(null)).toEqual([]);
    });

    test('uniqueText menggabungkan teks unik untuk tampilan ringkas penugasan', () => {
      expect(objectHelper.uniqueText(['pH', 'TSS', 'pH', '', null])).toBe('pH, TSS');
      expect(objectHelper.uniqueText([])).toBe('-');
    });

    test('isSubkontrakAssignment membedakan penugasan internal dan subkontrak', () => {
      expect(scopeHelper.isSubkontrakAssignment({ jenis_penugasan: SUBKONTRAK_ASSIGNMENT_TYPE })).toBe(true);
      expect(scopeHelper.isSubkontrakAssignment({ jenisPenugasan: SUBKONTRAK_ASSIGNMENT_TYPE.toLowerCase() })).toBe(true);
      expect(scopeHelper.isSubkontrakAssignment({ jenis_penugasan: 'INTERNAL' })).toBe(false);
    });

    test('internalAssignmentWhere dan subkontrakAssignmentWhere membentuk kondisi query scope penugasan', () => {
      expect(scopeHelper.internalAssignmentWhere({ id_penugasan: 'PNG-001' })).toEqual({
        id_penugasan: 'PNG-001',
        [Op.or]: [
          { jenis_penugasan: null },
          { jenis_penugasan: { [Op.ne]: SUBKONTRAK_ASSIGNMENT_TYPE } },
        ],
      });

      expect(scopeHelper.subkontrakAssignmentWhere({ id_penugasan: 'PNG-002' })).toEqual({
        id_penugasan: 'PNG-002',
        jenis_penugasan: SUBKONTRAK_ASSIGNMENT_TYPE,
      });
    });
  });

  describe('hasil LKA per sampel', () => {
    test('getLkaResultRowsForSample mengambil kode LKA dan detail dari hasil sampel', async () => {
      LkaHasil.findAll.mockResolvedValue([
        {
          get: () => ({
            id_lka_hasil: 'LH-001',
            no_sampel: '1/AM/V/2026',
            Lka: {
              kode_lka: 'LKA-001',
              id_penugasan_detail: 'PD-001',
              status_lka: 'Disetujui Kasi Pengujian',
            },
          }),
        },
        {
          get: () => ({
            id_lka_hasil: 'LH-002',
            no_sampel: '1/AM/V/2026',
            kode_lka: 'LKA-LEGACY',
          }),
        },
        {
          get: () => ({
            id_lka_hasil: 'LH-003',
            no_sampel: '1/AM/V/2026',
          }),
        },
      ]);

      const rows = await lkaResultService.getLkaResultRowsForSample(' 1/AM/V/2026 ');

      expect(LkaHasil.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { no_sampel: '1/AM/V/2026' },
      }));
      expect(rows).toEqual([
        {
          kode_lka: 'LKA-001',
          id_penugasan_detail: 'PD-001',
          status_lka: 'Disetujui Kasi Pengujian',
        },
        {
          kode_lka: 'LKA-LEGACY',
          id_penugasan_detail: null,
          status_lka: null,
        },
      ]);
    });

    test('getLkaResultRowsForSample menolak nomor sampel kosong', async () => {
      await expect(lkaResultService.getLkaResultRowsForSample('')).rejects.toThrow('Nomor sampel wajib dikirim.');
    });
  });
});
