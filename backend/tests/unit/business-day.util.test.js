const {
  addBusinessDays,
  asYmd,
  buildTestingBusinessTimeline,
  formatYmd,
  getBusinessDayNumber,
  isBusinessDay,
  isYmd,
  parseYmd,
  toDateObject,
  validateTestingPhaseDate,
  validateWithinBusinessWindow,
} = require('../../src/utils/business-day.util');

describe('Unit Test - business-day.util', () => {
  test('formatYmd memformat Date lokal menjadi YYYY-MM-DD', () => {
    expect(formatYmd(new Date(2026, 5, 3))).toBe('2026-06-03');
  });

  test('toDateObject menerima Date dan timestamp', () => {
    const date = new Date(2026, 5, 3);
    expect(toDateObject(date)).toBe(date);
    expect(formatYmd(toDateObject(date.getTime()))).toBe('2026-06-03');
  });

  test.each([
    ['2026-06-03T08:00:00.000Z', '2026-06-03'],
    ['3 Juni 2026', '2026-06-03'],
    ['03/06/2026', '2026-06-03'],
  ])('toDateObject membaca format tanggal %s', (input, expected) => {
    expect(formatYmd(toDateObject(input))).toBe(expected);
  });

  test.each([null, 'bukan-tanggal'])('toDateObject mengembalikan null untuk nilai tidak valid %#', (input) => {
    expect(toDateObject(input)).toBeNull();
  });

  test('asYmd, isYmd, dan parseYmd memvalidasi nilai tanggal', () => {
    expect(asYmd('2026-06-03T08:00:00.000Z')).toBe('2026-06-03');
    expect(isYmd('2026-06-03')).toBe(true);
    expect(parseYmd('2026-06-03')).toEqual(new Date(2026, 5, 3));
    expect(parseYmd('tanggal-salah')).toBeNull();
  });

  test('isBusinessDay membedakan hari kerja, akhir pekan, dan hari libur', () => {
    expect(isBusinessDay('2026-06-03')).toBe(true);
    expect(isBusinessDay('2026-06-06')).toBe(false);
    expect(isBusinessDay('2026-06-03', ['2026-06-03'])).toBe(false);
  });

  test('addBusinessDays mendukung offset positif, negatif, akhir pekan, dan hari libur', () => {
    expect(addBusinessDays('2026-06-05', 1)).toBe('2026-06-08');
    expect(addBusinessDays('2026-06-05', 1, ['2026-06-08'])).toBe('2026-06-09');
    expect(addBusinessDays('2026-06-08', -1)).toBe('2026-06-05');
  });

  test('buildTestingBusinessTimeline membentuk fase pengujian sampai pelaporan', () => {
    expect(buildTestingBusinessTimeline('2026-06-01')).toEqual({
      sampleReceivedYmd: '2026-06-01', hari1: '2026-06-01', testingStartYmd: '2026-06-02',
      testingEndYmd: '2026-06-11', verificationStartYmd: '2026-06-12',
      verificationEndYmd: '2026-06-15', reportingYmd: '2026-06-16',
    });
  });

  test('getBusinessDayNumber menghitung hari kerja secara inklusif', () => {
    expect(getBusinessDayNumber('2026-06-01', '2026-06-05')).toBe(5);
    expect(getBusinessDayNumber('2026-06-05', '2026-06-08')).toBe(2);
    expect(getBusinessDayNumber('2026-06-08', '2026-06-05')).toBe(0);
  });

  test('validator jendela bisnis dan fase pengujian memberi pesan sesuai batas', () => {
    expect(validateWithinBusinessWindow({ value: '2026-06-01', startYmd: '2026-06-01' })).toBe('');
    expect(validateWithinBusinessWindow({ value: '2026-05-29', startYmd: '2026-06-01', label: 'Tanggal uji' })).toContain('tidak boleh sebelum');
    expect(validateTestingPhaseDate({ value: '2026-06-12', receivedYmd: '2026-06-01' })).toContain('batas fase pengujian');
  });
});
