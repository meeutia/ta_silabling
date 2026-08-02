const {
  OPERATIONAL_END_TIME,
  OPERATIONAL_START_TIME,
  assertBusinessDateOrThrow,
  createValidationError,
  findHoliday,
  getOperationalTimeOptions,
  normalizeDateOnly,
  normalizeTimeForDb,
  validateOperationalTime,
} = require('../../src/utils/schedule-policy.util');

describe('Unit Test - schedule-policy.util', () => {
  test('createValidationError memasang message dan statusCode', () => {
    const error = createValidationError('Tidak valid', 422);
    expect(error).toMatchObject({ message: 'Tidak valid', statusCode: 422 });
  });

  test('normalizeDateOnly menerima format YYYY-MM-DD', () => {
    expect(normalizeDateOnly('2026-06-03')).toBe('2026-06-03');
  });

  test('normalizeDateOnly memotong datetime menjadi tanggal', () => {
    expect(normalizeDateOnly('2026-06-03T10:00:00.000Z')).toBe('2026-06-03');
  });

  test('normalizeDateOnly menolak tanggal kosong', () => {
    expect(() => normalizeDateOnly('', 'Tanggal jadwal')).toThrow('Tanggal jadwal wajib diisi.');
  });

  test('normalizeDateOnly menolak format selain YYYY-MM-DD', () => {
    expect(() => normalizeDateOnly('03-06-2026')).toThrow('harus format YYYY-MM-DD');
  });

  test('normalizeDateOnly menolak tanggal kalender tidak valid', () => {
    expect(() => normalizeDateOnly('2026-02-30')).toThrow('tidak valid');
  });

  test('normalizeTimeForDb menormalkan jam satu digit', () => {
    expect(normalizeTimeForDb('8:05')).toBe('08:05:00');
  });

  test('normalizeTimeForDb menerima batas awal dan akhir operasional', () => {
    expect(normalizeTimeForDb(OPERATIONAL_START_TIME)).toBe('08:00:00');
    expect(normalizeTimeForDb(OPERATIONAL_END_TIME)).toBe('16:00:00');
  });

  test('normalizeTimeForDb menolak jam kosong', () => {
    expect(() => normalizeTimeForDb('', 'Jam jadwal')).toThrow('Jam jadwal wajib diisi.');
  });

  test('normalizeTimeForDb menolak format jam yang salah', () => {
    expect(() => normalizeTimeForDb('08.00')).toThrow('harus format HH:mm');
  });

  test('normalizeTimeForDb menolak nilai jam kalender tidak valid', () => {
    expect(() => normalizeTimeForDb('25:00')).toThrow('tidak valid');
  });

  test('normalizeTimeForDb menolak detik selain 00', () => {
    expect(() => normalizeTimeForDb('08:00:30')).toThrow('harus memakai detik 00');
  });

  test('normalizeTimeForDb menolak jam sebelum operasional', () => {
    expect(() => normalizeTimeForDb('07:59')).toThrow('jam operasional');
  });

  test('normalizeTimeForDb menolak jam setelah operasional', () => {
    expect(() => normalizeTimeForDb('16:01')).toThrow('jam operasional');
  });

  test('helper jadwal memvalidasi jam, hari kerja, hari libur, dan opsi waktu', () => {
    expect(validateOperationalTime('09:30')).toBe('');
    expect(validateOperationalTime('07:30')).toContain('jam operasional');
    const holidays = [{ tanggal_libur: '2026-06-03', nama_libur: 'Libur Uji' }];
    expect(findHoliday('2026-06-03', holidays)).toMatchObject({ date: '2026-06-03', nama: 'Libur Uji' });
    expect(() => assertBusinessDateOrThrow('2026-06-06', 'Tanggal', [], { notBeforeToday: false })).toThrow('Sabtu/Minggu');
    expect(() => assertBusinessDateOrThrow('2026-06-03', 'Tanggal', holidays, { notBeforeToday: false })).toThrow('Libur Uji');
    const options = getOperationalTimeOptions();
    expect(options).toHaveLength(481);
    expect(options[0]).toBe('08:00');
    expect(options.at(-1)).toBe('16:00');
  });
});
