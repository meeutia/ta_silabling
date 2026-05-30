jest.mock('../../src/models/Associations', () => ({
  Invoice: { findOne: jest.fn() },
  Payment: {},
  Sampel: { findAll: jest.fn() },
}));

const RequestStatus = require('../../src/constants/request-status');
const requestTransform = require('../../src/services/request/request-transform.util');
const scheduleFields = require('../../src/services/request/request-schedule-fields.util');
const sampleCode = require('../../src/services/request/request-sample-code.util');
const { Invoice, Sampel } = require('../../src/models/Associations');

describe('Unit Test - service alur bisnis permohonan dan penerimaan sampel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pengajuan permohonan pelanggan', () => {
    test('resolveSamplingType membedakan pengambilan petugas dan mandiri', () => {
      expect(requestTransform.resolveSamplingType('Petugas')).toBe('Petugas');
      expect(requestTransform.resolveSamplingType('Laboratorium')).toBe('Petugas');
      expect(requestTransform.resolveSamplingType('Mandiri')).toBe('Mandiri');
      expect(requestTransform.resolveSamplingType('')).toBe('Mandiri');
    });

    test('resolveSamplingSchedule mengisi jadwal pengambilan untuk petugas', () => {
      const result = requestTransform.resolveSamplingSchedule({
        metodePengambilan: 'Petugas',
        tanggalPengambilan: '2026-06-01',
        jamPengambilan: '09:30:00',
        estimasiDiterima: '2026-06-02',
      });

      expect(result).toEqual({
        tanggalRencanaPengambilanSampel: '2026-06-01',
        jamRencanaPengambilanSampel: '09:30:00',
        tanggalRencanaPengantaranSampel: null,
      });
    });

    test('resolveSamplingSchedule mengisi estimasi pengantaran untuk sampel mandiri', () => {
      const result = requestTransform.resolveSamplingSchedule({
        metodePengambilan: 'Mandiri',
        tanggalPengambilan: '2026-06-01',
        jamPengambilan: '09:30:00',
        estimasiDiterima: '2026-06-02',
      });

      expect(result).toEqual({
        tanggalRencanaPengambilanSampel: null,
        jamRencanaPengambilanSampel: null,
        tanggalRencanaPengantaranSampel: '2026-06-02',
      });
    });

    test('resolveSamplingLocation menolak lokasi kosong sesuai jenis pengambilan', () => {
      expect(() => requestTransform.resolveSamplingLocation({
        metodePengambilan: 'Petugas',
        lokasiPengambilan: '',
      })).toThrow('Lokasi pengambilan sampel wajib diisi.');

      expect(() => requestTransform.resolveSamplingLocation({
        metodePengambilan: 'Mandiri',
        lokasiPengambilan: '',
      })).toThrow('Lokasi asal sampel wajib diisi untuk pengambilan mandiri.');
    });

    test('resolveSampleQuantity memakai fallback 1 untuk jumlah sampel kosong atau tidak valid', () => {
      expect(requestTransform.resolveSampleQuantity({ jumlah_sampel: 3 })).toBe(3);
      expect(requestTransform.resolveSampleQuantity({ sampleCount: '2' })).toBe(2);
      expect(requestTransform.resolveSampleQuantity({ jumlah: 0 })).toBe(1);
      expect(requestTransform.resolveSampleQuantity({ jumlah: 'abc' })).toBe(1);
      expect(requestTransform.resolveSampleQuantity(null)).toBe(1);
    });
  });

  describe('status riwayat pelanggan setelah LHU', () => {
    test('deriveCustomerHistoryStatus menjadi menunggu penjadwalan LHU jika semua LHU sudah disahkan', () => {
      const status = requestTransform.deriveCustomerHistoryStatus({
        status_fppl: RequestStatus.TESTING_PROCESS,
        lhus: [
          { status_lhu: 'Disahkan' },
          { kalab_at: '2026-06-10T09:00:00.000Z' },
        ],
      });

      expect(status).toBe(RequestStatus.WAITING_LHU_SCHEDULING);
    });

    test('deriveCustomerHistoryStatus menjadi menunggu pengambilan LHU jika jadwal aktif sudah dibuat', () => {
      const status = requestTransform.deriveCustomerHistoryStatus({
        status_fppl: RequestStatus.WAITING_LHU_SCHEDULING,
        jadwal_pengambilan_lhu: {
          id_jadwal_lhu: 'JLHU-001',
          tanggal_pengambilan: '2026-06-12',
          status_pengambilan: 'Terjadwal',
        },
      });

      expect(status).toBe(RequestStatus.WAITING_LHU_PICKUP);
    });

    test('deriveCustomerHistoryStatus menjadi selesai jika LHU sudah diambil', () => {
      const status = requestTransform.deriveCustomerHistoryStatus({
        status_fppl: RequestStatus.WAITING_LHU_PICKUP,
        jadwalPengambilanLhu: { statusPengambilan: 'Sudah Diambil' },
      });

      expect(status).toBe(RequestStatus.COMPLETED);
    });

    test('deriveCustomerHistoryStatus tidak menimpa status final ditolak/dibatalkan', () => {
      const status = requestTransform.deriveCustomerHistoryStatus({
        status_fppl: RequestStatus.REJECTED_BY_KASI,
        lhus: [{ status_lhu: 'Disahkan' }],
      });

      expect(status).toBe(RequestStatus.REJECTED_BY_KASI);
    });
  });

  describe('ringkasan penyelia dan jadwal sampel', () => {
    test('buildPenyeliaRequestSummary merangkum jenis sampel, parameter, dan penugasan', () => {
      const summary = requestTransform.buildPenyeliaRequestSummary({
        id_registrasi: 'REG-001',
        tanggal_pendaftaran: '2026-05-30',
        status_fppl: RequestStatus.TESTING_PROCESS,
        pelanggan: { nama_instansi: 'PT Air Bersih' },
        fppl_sampels: [
          {
            pkt_bm: { jenis_sampel: { jenis_sampel: 'Air Sungai' } },
            sampels: [
              { no_sampel: '1/SG/V/2026', penugasan_items: [{ id: 1 }, { id: 2 }] },
              { no_sampel: '2/SG/V/2026', penugasan_items: [{ id: 3 }] },
            ],
            fppl_parameter_metodes: [
              { parameter: { nama_parameter: 'pH' } },
              { parameter: { nama_parameter: 'TSS' } },
            ],
          },
        ],
      });

      expect(summary).toMatchObject({
        noReg: 'REG-001',
        pelanggan: 'PT Air Bersih',
        jenisSampel: 'Air Sungai',
        parameterPengujian: ['pH', 'TSS'],
        jumlahSampel: 2,
        jumlahPenugasan: 3,
        status: RequestStatus.TESTING_PROCESS,
      });
    });

    test('getActiveScheduleFromPayload mengambil jadwal terbaru dan mengabaikan jadwal dibatalkan', () => {
      const activeSchedule = scheduleFields.getActiveScheduleFromPayload({
        jadwal_sampels: [
          { id_jadwal: 'JDW-001', tanggal_jadwal: '2026-06-01', status_jadwal: 'Dibatalkan', dibuat_pada: '2026-06-01T09:00:00.000Z' },
          { id_jadwal: 'JDW-002', tanggal_jadwal: '2026-06-02', jam_jadwal: '10:00:00', status_jadwal: 'Terjadwal', dibuat_pada: '2026-06-02T09:00:00.000Z', Pegawai: { nama_pegawai: 'PCC A', no_wa: '0812' } },
          { id_jadwal: 'JDW-003', tanggal_jadwal: '2026-06-03', jam_jadwal: '11:00:00', status_jadwal: 'Terjadwal', dibuat_pada: '2026-06-03T09:00:00.000Z', pegawai_pcc: { nama_pegawai: 'PCC B', no_wa: '0813' } },
        ],
      });

      expect(activeSchedule).toMatchObject({
        id_jadwal: 'JDW-003',
        nama_pegawai_pcc: 'PCC B',
        no_wa_pcc: '0813',
      });
    });

    test('decorateScheduleFields menambahkan jadwal_sampling dari jadwal aktif', () => {
      const result = scheduleFields.decorateScheduleFields({
        jadwal_sampels: [
          { id_jadwal: 'JDW-002', tanggal_jadwal: '2026-06-02', jam_jadwal: '10:00:00', status_jadwal: 'Terjadwal', dibuat_pada: '2026-06-02T09:00:00.000Z' },
        ],
      });

      expect(result.jadwal_sampel).toMatchObject({ id_jadwal: 'JDW-002' });
      expect(result.jadwal_sampling).toBe('2026-06-02T10:00:00');
    });
  });

  describe('penerimaan sampel dan nomor sampel', () => {
    test('decorateSampleReceiptFields menurunkan tanggal dan jam penerimaan dari diterima_pada', () => {
      const payload = scheduleFields.decorateSampleReceiptFields({
        fppl_sampels: [
          { sampels: [{ no_sampel: '1/SG/V/2026', diterima_pada: '2026-06-01T08:15:00.000Z' }] },
        ],
      });

      const sample = payload.fppl_sampels[0].sampels[0];
      expect(sample.tanggal_penerimaan).toBe('2026-06-01T08:15:00.000Z');
      expect(sample.jam_penerimaan).toBe('08:15:00');
    });

    test('stripCustomerSensitiveLhuData menghapus data LHU dan hasil uji dari payload pelanggan', () => {
      const payload = scheduleFields.stripCustomerSensitiveLhuData({
        hasil_uji: [{ hasil: 'rahasia' }],
        lhu: { nomor_lhu: 'LHU-001' },
        fppl_sampels: [
          { sampels: [{ no_sampel: '1/SG/V/2026', lhu: { nomor_lhu: 'LHU-001' }, LkaHasil: [{ hasil: '10' }] }] },
        ],
      });

      expect(payload.hasil_uji).toBeUndefined();
      expect(payload.lhu).toBeUndefined();
      expect(payload.fppl_sampels[0].sampels[0].lhu).toBeUndefined();
      expect(payload.fppl_sampels[0].sampels[0].LkaHasil).toBeUndefined();
    });

    test('buildNoSampel membentuk nomor sampel dengan singkatan jenis sampel dan angka romawi bulan', () => {
      expect(sampleCode.buildNoSampel(37, 'Air Minum', '2026-05-11', 'JS08')).toBe('37/AM/V/2026');
      expect(sampleCode.buildNoSampel(41, 'Air Higiene Sanitasi (AHS)', '2026-05-11')).toBe('41/AHS/V/2026');
    });

    test('resolveTanggalPengambilanSampel memakai tanggal eksplisit sebelum jadwal petugas', () => {
      expect(sampleCode.resolveTanggalPengambilanSampel({
        itemPayload: { tanggal_pengambilan_sampel: '2026-06-04T10:00:00.000Z' },
        request: { jenis_pengambilan_sampel: 'Petugas' },
        jadwal: { tanggal_jadwal: '2026-06-01' },
      })).toBe('2026-06-04');

      expect(sampleCode.resolveTanggalPengambilanSampel({
        request: { jenis_pengambilan_sampel: 'Petugas' },
        jadwal: { tanggal_jadwal: '2026-06-01T00:00:00.000Z' },
      })).toBe('2026-06-01');

      expect(sampleCode.resolveTanggalPengambilanSampel({
        request: { jenis_pengambilan_sampel: 'Mandiri' },
        jadwal: { tanggal_jadwal: '2026-06-01' },
      })).toBeNull();
    });

    test('getNextSampleSequence mengambil nomor urut berikutnya dari data sampel existing', async () => {
      Sampel.findAll.mockResolvedValue([
        { no_sampel: '37/AM/V/2026' },
        { no_sampel: '41/AHS/V/2026' },
        { no_sampel: 'invalid' },
      ]);

      await expect(sampleCode.getNextSampleSequence({ LOCK: { UPDATE: 'UPDATE' } })).resolves.toBe(42);
    });

    test('assertRequestReadyForSampleReceipt menolak jika pembayaran belum selesai', async () => {
      await expect(sampleCode.assertRequestReadyForSampleReceipt({
        id_registrasi: 'REG-001',
        status_fppl: RequestStatus.WAITING_PAYMENT,
      }, { LOCK: { UPDATE: 'UPDATE' } })).rejects.toThrow('pembayaran belum selesai');
    });

    test('assertRequestReadyForSampleReceipt menerima invoice Lunas saat status sudah menunggu sampel', async () => {
      Invoice.findOne.mockResolvedValue({ status_invoice: 'Lunas' });

      await expect(sampleCode.assertRequestReadyForSampleReceipt({
        id_registrasi: 'REG-001',
        status_fppl: RequestStatus.WAITING_SAMPLE_PICKUP,
      }, { LOCK: { UPDATE: 'UPDATE' } })).resolves.toEqual({ status_invoice: 'Lunas' });
    });
  });
});
