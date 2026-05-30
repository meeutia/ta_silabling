jest.mock('../../src/models/Associations', () => ({
  User: { findOne: jest.fn() },
  Pegawai: { findOne: jest.fn() },
  PktBm: { findOne: jest.fn() },
  RegBm: {},
}));

const { LHU_STATUS } = require('../../src/constants/lhu-status.constant');
const dataUtils = require('../../src/services/lhu/lhu-data-utils');
const detailMapper = require('../../src/services/lhu/lhu-detail-row.mapper');
const payloadMapper = require('../../src/services/lhu/lhu-payload.mapper');

describe('Unit Test - service alur bisnis QC, LHU, dan approval Kalab', () => {
  describe('validasi sumber hasil LKA untuk LHU', () => {
    test('isResultApprovedByKasi hanya menerima hasil yang sudah disetujui Kasi Pengujian', () => {
      expect(dataUtils.isResultApprovedByKasi({ status_review_hasil: 'Disetujui Kasi Pengujian' })).toBe(true);
      expect(dataUtils.isResultApprovedByKasi({ status_review_hasil: 'Disetujui Penyelia' })).toBe(false);
      expect(dataUtils.isResultApprovedByKasi({ status_review_hasil: 'Menunggu Verifikasi Kasi Pengujian' })).toBe(false);
      expect(dataUtils.isResultApprovedByKasi({ statusReviewHasil: 'Disetujui Kasi Pengujian' })).toBe(true);
    });

    test('findApprovedResultForExpectedParameter memilih hasil Kasi terbaru dan mengabaikan hasil belum disetujui Kasi', () => {
      const result = detailMapper.findApprovedResultForExpectedParameter(
        { id_fppl_parameter_metode: 'FPM-001', id_parameter: 'PAR-001' },
        [
          { kode_lka: 'LKA-001', id_fppl_parameter_metode: 'FPM-001', id_parameter: 'PAR-001', hasil: '7,1', status_review_hasil: 'Disetujui Penyelia' },
          { kode_lka: 'LKA-002', id_fppl_parameter_metode: 'FPM-001', id_parameter: 'PAR-001', hasil: '7,2', status_review_hasil: 'Disetujui Kasi Pengujian' },
          { kode_lka: 'LKA-010', id_fppl_parameter_metode: 'FPM-001', id_parameter: 'PAR-001', hasil: '7,3', status_review_hasil: 'Disetujui Kasi Pengujian' },
          { kode_lka: 'LKA-011', id_fppl_parameter_metode: 'FPM-002', id_parameter: 'PAR-002', hasil: '20', status_review_hasil: 'Disetujui Kasi Pengujian' },
        ]
      );

      expect(result).toMatchObject({ kode_lka: 'LKA-010', hasil: '7,3' });
    });

    test('findApprovedResultForExpectedParameter mengembalikan null jika hasil kosong atau belum approved Kasi', () => {
      expect(detailMapper.findApprovedResultForExpectedParameter(
        { id_fppl_parameter_metode: 'FPM-001' },
        [
          { id_fppl_parameter_metode: 'FPM-001', hasil: '', status_review_hasil: 'Disetujui Kasi Pengujian' },
          { id_fppl_parameter_metode: 'FPM-001', hasil: '10', status_review_hasil: 'Disetujui Penyelia' },
        ]
      )).toBeNull();
    });
  });

  describe('pemetaan detail LHU', () => {
    test('mapDetailRow membawa hasil, baku mutu, akreditasi, insitu, subkontrak, dan tanggal sampling', () => {
      const result = detailMapper.mapDetailRow(
        {
          no_sampel: '1/AM/V/2026',
          kode_lka: 'LKA-001',
          id_fppl_parameter_metode: 'FPM-001',
          id_parameter: 'PAR-001',
          id_metode_parameter: 'PM-001',
          nama_parameter: 'pH',
          nama_metode: 'SNI pH',
          acuan_metode: 'SNI-001',
          hasil: '7,1',
          is_terakreditasi: '1',
          is_insitu: true,
          is_subkontrak: '0',
          catatan_hasil: 'Normal',
        },
        { map: new Map([['PAR-001', { nilai_bm: '6-9', satuan_bm: '-', is_in_bm: 1 }]]) },
        { tanggal_pengambilan_sampel: '2026-06-01T09:00:00.000Z' }
      );

      expect(result).toMatchObject({
        no_sampel: '1/AM/V/2026',
        kode_lka: 'LKA-001',
        nama_parameter: 'pH',
        metode: 'SNI pH',
        hasil: '7,1',
        bm: '6-9',
        satuan_bm: '-',
        ada_di_bm: 1,
        is_terakreditasi: 1,
        is_insitu: 1,
        is_subkontrak: 0,
        tanggal_sampling: '2026-06-01',
        catatan_hasil: 'Normal',
      });
    });

    test('groupLhuDetailRowsByParameter menggabungkan hasil beberapa sampel untuk parameter yang sama', () => {
      const rows = detailMapper.groupLhuDetailRowsByParameter([
        { id_fppl_parameter_metode: 'FPM-001', nama_parameter: 'pH', no_sampel: '1/AM/V/2026', kode_lka: 'LKA-001', hasil: '7,1', urutan_lhu: 2 },
        { id_fppl_parameter_metode: 'FPM-001', nama_parameter: 'pH', no_sampel: '2/AM/V/2026', kode_lka: 'LKA-002', hasil: '7,2', urutan_lhu: 2 },
        { id_fppl_parameter_metode: 'FPM-002', nama_parameter: 'TSS', no_sampel: '1/AM/V/2026', kode_lka: 'LKA-003', hasil: '10', urutan_lhu: 1 },
      ]);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        id_fppl_parameter_metode: 'FPM-002',
        nama_parameter: 'TSS',
        samples: ['1/AM/V/2026'],
      });
      expect(rows[1]).toMatchObject({
        id_fppl_parameter_metode: 'FPM-001',
        nama_parameter: 'pH',
        samples: ['1/AM/V/2026', '2/AM/V/2026'],
      });
      expect(rows[1].hasil).toBe('1/AM/V/2026: 7,1\n2/AM/V/2026: 7,2');
    });

    test('applyDetailOrder mengurutkan detail berdasarkan urutan_lhu dari payload QC', () => {
      const rows = dataUtils.applyDetailOrder(
        [
          { id_fppl_parameter_metode: 'FPM-001', nama_parameter: 'pH' },
          { id_fppl_parameter_metode: 'FPM-002', nama_parameter: 'TSS' },
        ],
        [
          { id_fppl_parameter_metode: 'FPM-002', urutan_lhu: 1 },
          { id_fppl_parameter_metode: 'FPM-001', urutan_lhu: 2 },
        ]
      );

      expect(rows.map((row) => row.id_fppl_parameter_metode)).toEqual(['FPM-002', 'FPM-001']);
      expect(rows.map((row) => row.urutan_lhu)).toEqual([1, 2]);
    });
  });

  describe('header dan payload LHU', () => {
    test('isEditableByQcStatus hanya true sebelum LHU masuk approval Kalab', () => {
      expect(payloadMapper.isEditableByQcStatus(LHU_STATUS.DRAFT)).toBe(true);
      expect(payloadMapper.isEditableByQcStatus(LHU_STATUS.WAIT_QC)).toBe(true);
      expect(payloadMapper.isEditableByQcStatus(LHU_STATUS.WAIT_KALAB)).toBe(false);
      expect(payloadMapper.isEditableByQcStatus(LHU_STATUS.APPROVED_FINAL)).toBe(false);
    });

    test('buildDefaultDetailRows membentuk detail awal LHU dari hasil LKA approved', () => {
      const rows = payloadMapper.buildDefaultDetailRows([
        {
          no_sampel: '1/AM/V/2026',
          id_fppl_parameter_metode: 'FPM-001',
          id_parameter: 'PAR-001',
          id_metode_parameter: 'PM-001',
          nama_parameter: 'pH',
          nama_metode: 'SNI pH',
          acuan_metode: 'SNI-001',
          hasil: '7,1',
          is_terakreditasi: 1,
          is_insitu: 1,
          is_subkontrak: 1,
          catatan_hasil: 'Normal',
        },
      ], { tanggal_pengambilan_sampel: '2026-06-01T09:00:00.000Z' });

      expect(rows).toEqual([
        expect.objectContaining({
          no_sampel: '1/AM/V/2026',
          id_fppl_parameter_metode: 'FPM-001',
          nama_parameter: 'pH',
          metode: 'SNI pH',
          hasil: '7,1',
          urutan_lhu: 1,
          is_terakreditasi: 1,
          is_insitu: 1,
          is_subkontrak: 1,
          tanggal_sampling: '2026-06-01',
          catatan_hasil: 'Normal',
        }),
      ]);
    });

    test('countDetailStats dan calculateAccreditationStats menghitung parameter unik dan logo KAN', () => {
      const detailRows = [
        { id_fppl_parameter_metode: 'FPM-001', is_terakreditasi: 1 },
        { id_fppl_parameter_metode: 'FPM-001', is_terakreditasi: 1 },
        { id_fppl_parameter_metode: 'FPM-002', is_terakreditasi: 0 },
        { id_fppl_parameter_metode: 'FPM-003', is_terakreditasi: 1 },
      ];

      expect(payloadMapper.countDetailStats(detailRows)).toMatchObject({
        totalParameter: 3,
        totalTerakreditasi: 2,
        persentaseTerakreditasi: 66.67,
        showLogoKan: true,
      });

      expect(dataUtils.calculateAccreditationStats(detailRows)).toEqual({
        totalParameter: 3,
        totalTerakreditasi: 2,
        persentase: 66.67,
        showLogoKan: true,
      });
    });

    test('mapLhuHeaderPayload menggabungkan data LHU, sampel, pelanggan, baku mutu, QC, dan Kalab', () => {
      const payload = payloadMapper.mapLhuHeaderPayload(
        { nomor_lhu: 'LHU-001', status_lhu: LHU_STATUS.WAIT_KALAB },
        {
          no_sampel: '1/AM/V/2026',
          id_registrasi: 'REG-001',
          diterima_pada: '2026-06-01T08:15:00.000Z',
          kondisi_sampel: 'Sesuai',
          jenis_sampel: 'Air Minum',
          nama_instansi: 'PT Air Bersih',
          email_kontak: 'pelanggan@mail.test',
          no_telp: '0812',
          tanggal_pendaftaran: '2026-05-30',
        },
        { nama_pkt: 'Paket AM', instansi: 'Permenkes', ref_reg: 'No. 2 Tahun 2023' },
        { qcNama: 'QC Satu', kalabNama: 'Kalab Satu' }
      );

      expect(payload).toMatchObject({
        nomor_lhu: 'LHU-001',
        status_lhu: LHU_STATUS.WAIT_KALAB,
        id_registrasi: 'REG-001',
        jenis_sampel: 'Air Minum',
        nama_pelanggan: 'PT Air Bersih',
        email_pelanggan: 'pelanggan@mail.test',
        telp_pelanggan: '0812',
        nama_pkt: 'Paket AM',
        reg_bm: 'Permenkes - No. 2 Tahun 2023',
        qc_nama: 'QC Satu',
        kalab_nama: 'Kalab Satu',
      });
    });
  });
});
