jest.mock('../../src/models/Associations', () => ({
  Invoice: { findOne: jest.fn() },
  Payment: {},
  Sampel: { findAll: jest.fn() },
}));

const { Invoice, Sampel } = require('../../src/models/Associations');
const RequestStatus = require('../../src/constants/request-status');
const util = require('../../src/services/request/request-sample-code.util');

describe('Unit Test - request-sample-code.util', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };

  beforeEach(() => jest.clearAllMocks());

  test('monthToRoman dan normalizeDateOnly menormalkan nilai tanggal', () => {
    expect(util.monthToRoman(6)).toBe('VI');
    expect(util.monthToRoman(20)).toBe('I');
    expect(util.normalizeDateOnly('2026-06-03T08:00:00Z')).toBe('2026-06-03');
    expect(util.normalizeDateOnly(null)).toBeNull();
  });

  test('formatLocalYmd dan formatLocalHms membentuk tanggal serta waktu lokal', () => {
    const date = new Date(2026, 5, 3, 8, 9, 7);
    expect(util.formatLocalYmd(date)).toBe('2026-06-03');
    expect(util.formatLocalHms(date)).toBe('08:09:07');
  });

  test('isPetugasSampling dan pickValue membaca variasi properti', () => {
    expect(util.isPetugasSampling('Petugas')).toBe(true);
    expect(util.isPetugasSampling('Mandiri')).toBe(false);
    expect(util.pickValue({ a: '', b: 'nilai' }, 'a', 'b')).toBe('nilai');
    expect(util.pickValue({ getDataValue: (key) => key === 'x' ? 'db-value' : null }, 'x')).toBe('db-value');
  });

  test('resolveTanggalPengambilanSampel memprioritaskan tanggal eksplisit lalu jadwal', () => {
    expect(util.resolveTanggalPengambilanSampel({
      itemRequestData: { tanggal_pengambilan_sampel: '2026-06-04T10:00:00Z' },
      jadwal: { tanggal_jadwal: '2026-06-01' },
    })).toBe('2026-06-04');
    expect(util.resolveTanggalPengambilanSampel({ request: { jenis_pengambilan_sampel: 'Petugas' }, jadwal: { tanggal_jadwal: '2026-06-01' } })).toBe('2026-06-01');
    expect(util.resolveTanggalPengambilanSampel({})).toBeNull();
  });

  test('generateSampleAbbreviation memakai ID master, singkatan nama, dan fallback', () => {
    expect(util.generateSampleAbbreviation('Nama Berubah', 'JS06')).toBe('AHS');
    expect(util.generateSampleAbbreviation('Air Higiene Sanitasi (AHS)')).toBe('AHS');
    expect(util.generateSampleAbbreviation('Air Minum')).toBe('AM');
    expect(util.generateSampleAbbreviation('Jenis Baru')).toBe('SMP');
  });

  test('normalizeSampleCondition dan buildNoSampel menyusun data penerimaan', () => {
    expect(util.normalizeSampleCondition('rusak')).toBe('Tidak Sesuai');
    expect(util.normalizeSampleCondition('baik')).toBe('Sesuai');
    expect(util.buildNoSampel(37, 'Air Minum', '2026-05-11', 'JS08')).toBe('37/AM/V/2026');
  });

  test('getNextSampleSequence mengambil nomor terbesar dari sampel existing', async () => {
    Sampel.findAll.mockResolvedValue([{ no_sampel: '2/AM/V/2026' }, { no_sampel: '41/AHS/V/2026' }, { no_sampel: 'invalid' }]);
    await expect(util.getNextSampleSequence(transaction)).resolves.toBe(42);
    expect(Sampel.findAll).toHaveBeenCalledWith(expect.objectContaining({ lock: 'UPDATE' }));
  });

  test('assertRequestReadyForSampleReceipt menolak pembayaran belum selesai dan menerima invoice settled', async () => {
    await expect(util.assertRequestReadyForSampleReceipt({
      id_registrasi: 'REG-1', status_fppl: RequestStatus.WAITING_PAYMENT,
    }, transaction)).rejects.toThrow('pembayaran belum selesai');

    Invoice.findOne.mockResolvedValue({ status_invoice: 'Lunas' });
    await expect(util.assertRequestReadyForSampleReceipt({
      id_registrasi: 'REG-1', status_fppl: RequestStatus.WAITING_SAMPLE_PICKUP,
    }, transaction)).resolves.toEqual({ status_invoice: 'Lunas' });
  });
});
