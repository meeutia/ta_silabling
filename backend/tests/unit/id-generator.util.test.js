const {
  generateId,
  generateNomorLhu,
  generateDraftNomorLhu,
  generateNomorFppl,
  getRomanMonth,
  buildMatrixCode,
  buildNoSampel,
  generateNoSampel,
  generateNoSampelBatch,
} = require('../../src/utils/id-generator');

describe('Unit Test - id-generator', () => {
  test('getRomanMonth mengubah nomor bulan menjadi angka Romawi', () => {
    expect(getRomanMonth(1)).toBe('I');
    expect(getRomanMonth(6)).toBe('VI');
    expect(getRomanMonth(12)).toBe('XII');
  });

  test('getRomanMonth memakai I untuk nomor bulan di luar rentang', () => {
    expect(getRomanMonth(0)).toBe('I');
    expect(getRomanMonth(13)).toBe('I');
  });

  test('buildMatrixCode menghasilkan kode danau', () => {
    expect(buildMatrixCode('Air Danau')).toBe('DN');
  });

  test('buildMatrixCode menghasilkan kode limbah', () => {
    expect(buildMatrixCode('Air Limbah Cair')).toBe('LC');
  });

  test('buildMatrixCode membentuk kode generik dari dua kata', () => {
    expect(buildMatrixCode('Udara Ambien')).toBe('UA');
    expect(buildMatrixCode('pH')).toBe('PH');
  });

  test('buildNoSampel menyusun nomor sampel dari urutan, matriks, bulan, dan tahun', () => {
    expect(buildNoSampel(7, 'Air Sungai', new Date(2026, 4, 10))).toBe('7/SG/V/2026');
  });

  test('generateId membuat nomor pertama saat data belum ada', async () => {
    const Model = { findOne: jest.fn().mockResolvedValue(null) };
    await expect(generateId(Model, 'id_user', 'USR-', null, 4)).resolves.toBe('USR-0001');
  });

  test('generateId menaikkan nomor terakhir dan memakai lock transaksi', async () => {
    const Model = { findOne: jest.fn().mockResolvedValue({ get: () => 'PGW-009' }) };
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    await expect(generateId(Model, 'id_pegawai', 'PGW-', transaction, 3)).resolves.toBe('PGW-010');
    expect(Model.findOne).toHaveBeenCalledWith(expect.objectContaining({ transaction, lock: 'UPDATE' }));
  });

  test('generateNoSampel melanjutkan urutan terbesar pada tahun berjalan', async () => {
    const Sampel = { findAll: jest.fn().mockResolvedValue([
      { get: () => '2/SG/I/2026' }, { get: () => '10/DN/II/2026' }, { get: () => 'invalid' },
    ]) };
    await expect(generateNoSampel(Sampel, 'Air Laut', null, new Date(2026, 5, 1))).resolves.toBe('11/LT/VI/2026');
  });

  test('generateNoSampelBatch membuat nomor berurutan tanpa query berulang', async () => {
    const Sampel = { findAll: jest.fn().mockResolvedValue([{ get: () => '5/SG/I/2026' }]) };
    const result = await generateNoSampelBatch(Sampel, [
      { id: 1, jenis_sampel: 'Air Sungai' }, { id: 2, jenis_sampel: 'Air Danau' },
    ], null, new Date(2026, 5, 1));
    expect(result).toEqual([
      { id: 1, jenis_sampel: 'Air Sungai', no_sampel: '6/SG/VI/2026', noSampel: '6/SG/VI/2026' },
      { id: 2, jenis_sampel: 'Air Danau', no_sampel: '7/DN/VI/2026', noSampel: '7/DN/VI/2026' },
    ]);
    expect(Sampel.findAll).toHaveBeenCalledTimes(1);
  });

  test('generateDraftNomorLhu menghitung nomor draft harian berikutnya', async () => {
    const Lhu = { findAll: jest.fn().mockResolvedValue([
      { nomor_lhu: 'DLHU-260603-0002' }, { get: () => 'DLHU-260603-0007' },
    ]) };
    await expect(generateDraftNomorLhu(Lhu, null, new Date(2026, 5, 3))).resolves.toBe('DLHU-260603-0008');
  });

  test('generateNomorLhu hanya meneruskan nomor resmi yang valid', async () => {
    const Lhu = { findAll: jest.fn().mockResolvedValue([
      { nomor_lhu: '02/LHU/I/LAB-2026' }, { get: () => '11/LHU/V/LAB-2026' }, { nomor_lhu: 'DLHU-260603-0012' },
    ]) };
    await expect(generateNomorLhu(Lhu, null, new Date(2026, 5, 3))).resolves.toBe('12/LHU/VI/LAB-2026');
  });

  test('generateNomorFppl melanjutkan urutan bulanan dan mengabaikan format invalid', async () => {
    const Fppl = { findAll: jest.fn().mockResolvedValue([
      { nomor_fppl: '02/FPPL/LAB/VI/2026' }, { get: () => '09/FPPL/LAB/VI/2026' }, { nomor_fppl: 'invalid' },
    ]) };
    await expect(generateNomorFppl(Fppl, null, new Date(2026, 5, 3))).resolves.toBe('10/FPPL/LAB/VI/2026');
  });
});
