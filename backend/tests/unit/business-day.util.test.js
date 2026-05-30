const {
  addBusinessDays,
  asYmd,
  buildTestingBusinessTimeline,
  formatYmd,
  getBusinessDayNumber,
  isBusinessDay,
  parseYmd,
  toDateObject,
  validateTestingPhaseDate,
  validateWithinBusinessWindow,
} = require('../../src/utils/business-day.util');

describe('Unit Test - business-day.util', () => {
  describe('format dan parsing tanggal', () => {
    test('formatYmd mengubah Date valid menjadi YYYY-MM-DD', () => {
      expect(formatYmd(new Date(2026, 4, 29))).toBe('2026-05-29');
    });

    test('toDateObject menerima format YYYY-MM-DD, ISO, dan tanggal Indonesia', () => {
      expect(formatYmd(toDateObject('2026-05-29'))).toBe('2026-05-29');
      expect(formatYmd(toDateObject('2026-05-29T08:00:00.000Z'))).toBe('2026-05-29');
      expect(formatYmd(toDateObject('29 Mei 2026'))).toBe('2026-05-29');
    });

    test('parseYmd menolak format selain YYYY-MM-DD', () => {
      expect(parseYmd('bukan tanggal')).toBeNull();
    });

    test('asYmd mengembalikan string kosong untuk nilai tidak valid', () => {
      expect(asYmd('bukan tanggal')).toBe('');
    });
  });

  describe('hari kerja dan timeline', () => {
    test('isBusinessDay menerima hari kerja dan menolak akhir pekan', () => {
      expect(isBusinessDay('2026-05-29')).toBe(true); // Jumat
      expect(isBusinessDay('2026-05-30')).toBe(false); // Sabtu
    });

    test('isBusinessDay menolak tanggal merah dari daftar libur', () => {
      expect(isBusinessDay('2026-06-01', ['2026-06-01'])).toBe(false);
    });

    test('addBusinessDays melewati Sabtu dan Minggu', () => {
      expect(addBusinessDays('2026-05-29', 1)).toBe('2026-06-01');
    });

    test('addBusinessDays melewati tanggal merah', () => {
      expect(addBusinessDays('2026-05-29', 1, ['2026-06-01'])).toBe('2026-06-02');
    });

    test('getBusinessDayNumber menghitung nomor hari kerja dari tanggal mulai', () => {
      expect(getBusinessDayNumber('2026-05-29', '2026-06-01')).toBe(2);
    });

    test('buildTestingBusinessTimeline membuat batas fase pengujian dan pelaporan', () => {
      const timeline = buildTestingBusinessTimeline('2026-05-29');
      expect(timeline).toMatchObject({
        sampleReceivedYmd: '2026-05-29',
        hari1: '2026-05-29',
        testingStartYmd: '2026-06-01',
        testingEndYmd: '2026-06-10',
        verificationStartYmd: '2026-06-11',
        verificationEndYmd: '2026-06-12',
        reportingYmd: '2026-06-15',
      });
    });
  });

  describe('validasi rentang hari kerja', () => {
    test('validateWithinBusinessWindow menerima tanggal dalam rentang bisnis', () => {
      expect(validateWithinBusinessWindow({
        value: '2026-06-05',
        startYmd: '2026-05-29',
        maxBusinessDay: 12,
      })).toBe('');
    });

    test('validateWithinBusinessWindow menolak tanggal sebelum sampel diterima', () => {
      expect(validateWithinBusinessWindow({
        value: '2026-05-28',
        startYmd: '2026-05-29',
        label: 'Tanggal LKA',
      })).toBe('Tanggal LKA tidak boleh sebelum tanggal sampel diterima.');
    });

    test('validateTestingPhaseDate menolak tanggal setelah batas fase pengujian', () => {
      expect(validateTestingPhaseDate({
        value: '2026-06-11',
        receivedYmd: '2026-05-29',
        label: 'Tanggal pengujian',
      })).toContain('tidak boleh melewati batas fase pengujian');
    });
  });
});
