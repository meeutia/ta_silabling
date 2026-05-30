jest.mock('../../src/models/Associations', () => ({
  Lka: {},
  LkaHasil: {},
  LkaRevisi: {},
  Penugasan: {},
  PenugasanDetail: {},
}));

const {
  getLkaHasilStatus,
  hasActiveRevisionForMonitorDetail,
  mapStatusLkaToHasilStatus,
  resolveLkaHasilStatus,
  resolveMonitorDisplayStatus,
} = require('../../src/services/assignment/assignment-status.helper');
const { LKA_HASIL_STATUS } = require('../../src/services/assignment/assignment.constants');

describe('Unit Test - assignment-status.helper service', () => {
  test('getLkaHasilStatus membaca status camelCase, snake_case, dan fallback', () => {
    expect(getLkaHasilStatus({ statusReviewHasil: LKA_HASIL_STATUS.WAIT_PENYELIA })).toBe(LKA_HASIL_STATUS.WAIT_PENYELIA);
    expect(getLkaHasilStatus({ status_review_hasil: LKA_HASIL_STATUS.APPROVED_KASI })).toBe(LKA_HASIL_STATUS.APPROVED_KASI);
    expect(getLkaHasilStatus({}, LKA_HASIL_STATUS.DRAFT)).toBe(LKA_HASIL_STATUS.DRAFT);
  });

  test('mapStatusLkaToHasilStatus memetakan status LKA ke status hasil', () => {
    expect(mapStatusLkaToHasilStatus('Draft')).toBe(LKA_HASIL_STATUS.DRAFT);
    expect(mapStatusLkaToHasilStatus('Menunggu Verifikasi Penyelia')).toBe(LKA_HASIL_STATUS.WAIT_PENYELIA);
    expect(mapStatusLkaToHasilStatus('Disetujui Penyelia')).toBe(LKA_HASIL_STATUS.APPROVED_PENYELIA);
    expect(mapStatusLkaToHasilStatus('Menunggu Verifikasi Kasi Pengujian')).toBe(LKA_HASIL_STATUS.WAIT_KASI);
    expect(mapStatusLkaToHasilStatus('Disetujui Kasi Pengujian')).toBe(LKA_HASIL_STATUS.APPROVED_KASI);
    expect(mapStatusLkaToHasilStatus('Perlu Perbaikan')).toBe(LKA_HASIL_STATUS.REVISION);
    expect(mapStatusLkaToHasilStatus('Status Tidak Dikenal')).toBeNull();
  });

  test('hasActiveRevisionForMonitorDetail mendeteksi revisi aktif dari status hasil', () => {
    const lka = {
      lka_hasils: [
        { status_review_hasil: LKA_HASIL_STATUS.APPROVED_PENYELIA },
        { status_review_hasil: LKA_HASIL_STATUS.REVISION },
      ],
    };

    expect(hasActiveRevisionForMonitorDetail({}, lka)).toBe(true);
  });

  test('hasActiveRevisionForMonitorDetail mengabaikan revisi yang sudah selesai', () => {
    const lka = {
      revisi_lka: [
        { status_revisi: 'Selesai', items: [{ status_item_revisi: 'Disetujui Kasi' }] },
      ],
    };

    expect(hasActiveRevisionForMonitorDetail({ status_detail: 'Disetujui' }, lka)).toBe(false);
  });

  test('resolveMonitorDisplayStatus menampilkan Perlu Revisi jika ada revisi aktif', () => {
    expect(resolveMonitorDisplayStatus({ status_detail: 'Disetujui' }, {}, true)).toBe('Perlu Revisi');
  });

  test('resolveMonitorDisplayStatus menampilkan Worksheet Terkirim untuk LKA menunggu penyelia', () => {
    expect(resolveMonitorDisplayStatus({}, { status_lka: 'Menunggu Verifikasi Penyelia' }, false)).toBe('Worksheet Terkirim');
  });

  test('resolveLkaHasilStatus memakai status eksplisit jika tersedia', () => {
    expect(resolveLkaHasilStatus({ status_review_hasil: LKA_HASIL_STATUS.WAIT_KASI }, 'Draft')).toBe(LKA_HASIL_STATUS.WAIT_KASI);
  });

  test('resolveLkaHasilStatus menganggap hasil lama yang sudah terisi sebagai disetujui penyelia pada status campuran', () => {
    const siblings = [
      { hasil: '10', status_review_hasil: LKA_HASIL_STATUS.APPROVED_KASI },
      { hasil: '20' },
    ];

    expect(resolveLkaHasilStatus({ hasil: '20' }, 'Perlu Perbaikan', siblings)).toBe(LKA_HASIL_STATUS.APPROVED_PENYELIA);
  });
});
