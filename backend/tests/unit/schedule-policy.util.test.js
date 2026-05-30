const {
  normalizeDateOnly,
  normalizeTimeForDb,
  validateOperationalTime,
  assertBusinessDateOrThrow,
  findHoliday,
  getOperationalTimeOptions,
  OPERATIONAL_START_TIME,
  OPERATIONAL_END_TIME,
} = require('../../src/utils/schedule-policy.util');

describe('Unit Test - schedule-policy.util', () => {
  describe('normalizeDateOnly', () => {
    test('menerima tanggal dengan format YYYY-MM-DD', () => {
      expect(normalizeDateOnly('2026-05-30', 'Tanggal jadwal')).toBe('2026-05-30');
    });

    test('memotong nilai datetime menjadi tanggal saja', () => {
      expect(normalizeDateOnly('2026-05-30T08:15:00.000Z')).toBe('2026-05-30');
    });

    test('menolak tanggal kosong', () => {
      expect(() => normalizeDateOnly('', 'Tanggal jadwal')).toThrow('Tanggal jadwal wajib diisi.');
    });

    test('menolak format tanggal selain YYYY-MM-DD', () => {
      expect(() => normalizeDateOnly('30-05-2026', 'Tanggal jadwal')).toThrow('Tanggal jadwal harus format YYYY-MM-DD.');
    });

    test('menolak tanggal kalender yang tidak valid', () => {
      expect(() => normalizeDateOnly('2026-02-30', 'Tanggal jadwal')).toThrow('Tanggal jadwal tidak valid.');
    });
  });

  describe('normalizeTimeForDb', () => {
    test('menormalisasi jam 1 digit menjadi format database HH:mm:ss', () => {
      expect(normalizeTimeForDb('8:05', 'Jam jadwal')).toBe('08:05:00');
    });

    test('menerima jam batas awal operasional', () => {
      expect(normalizeTimeForDb(OPERATIONAL_START_TIME, 'Jam jadwal')).toBe('08:00:00');
    });

    test('menerima jam batas akhir operasional', () => {
      expect(normalizeTimeForDb(OPERATIONAL_END_TIME, 'Jam jadwal')).toBe('16:00:00');
    });

    test('menolak jam kosong', () => {
      expect(() => normalizeTimeForDb('', 'Jam jadwal')).toThrow('Jam jadwal wajib diisi.');
    });

    test('menolak jam di luar format HH:mm', () => {
      expect(() => normalizeTimeForDb('08.00', 'Jam jadwal')).toThrow('Jam jadwal harus format HH:mm.');
    });

    test('menolak nilai jam kalender yang tidak valid', () => {
      expect(() => normalizeTimeForDb('25:00', 'Jam jadwal')).toThrow('Jam jadwal tidak valid.');
    });

    test('menolak detik selain 00', () => {
      expect(() => normalizeTimeForDb('08:00:30', 'Jam jadwal')).toThrow('Jam jadwal harus memakai detik 00.');
    });

    test('menolak jam sebelum operasional', () => {
      expect(() => normalizeTimeForDb('07:59', 'Jam jadwal')).toThrow('Jam jadwal harus berada dalam jam operasional 08:00-16:00 WIB.');
    });

    test('menolak jam setelah operasional', () => {
      expect(() => normalizeTimeForDb('16:01', 'Jam jadwal')).toThrow('Jam jadwal harus berada dalam jam operasional 08:00-16:00 WIB.');
    });
  });

  describe('validateOperationalTime', () => {
    test('mengembalikan string kosong untuk jam operasional valid', () => {
      expect(validateOperationalTime('09:30', 'Jam jadwal')).toBe('');
    });

    test('mengembalikan pesan error untuk jam operasional tidak valid', () => {
      expect(validateOperationalTime('07:30', 'Jam jadwal')).toContain('jam operasional');
    });
  });

  describe('assertBusinessDateOrThrow dan findHoliday', () => {
    test('menerima hari kerja yang tidak termasuk tanggal merah', () => {
      expect(assertBusinessDateOrThrow('2026-06-01', 'Tanggal jadwal', [], { notBeforeToday: false })).toBe('2026-06-01');
    });

    test('menolak Sabtu atau Minggu', () => {
      expect(() => assertBusinessDateOrThrow('2026-05-30', 'Tanggal jadwal', [], { notBeforeToday: false })).toThrow('Tanggal jadwal harus hari kerja dan tidak boleh Sabtu/Minggu.');
    });

    test('menolak tanggal merah dari daftar libur', () => {
      const holidays = [{ tanggal_libur: '2026-06-01', nama_libur: 'Hari Lahir Pancasila' }];
      expect(() => assertBusinessDateOrThrow('2026-06-01', 'Tanggal jadwal', holidays, { notBeforeToday: false })).toThrow('Tanggal jadwal tidak boleh tanggal merah (Hari Lahir Pancasila).');
    });

    test('findHoliday menemukan tanggal merah dari bentuk data berbeda', () => {
      const holidays = [{ date: '2026-06-01', nama: 'Hari Lahir Pancasila' }];
      expect(findHoliday('2026-06-01', holidays)).toEqual({ date: '2026-06-01', nama: 'Hari Lahir Pancasila' });
    });
  });

  describe('getOperationalTimeOptions', () => {
    test('menghasilkan opsi per menit dari 08:00 sampai 16:00', () => {
      const options = getOperationalTimeOptions();
      expect(options[0]).toBe('08:00');
      expect(options[options.length - 1]).toBe('16:00');
      expect(options).toContain('12:34');
      expect(options).toHaveLength(481);
    });
  });
});
