import { FPPL_STATUSES } from '../../../utils/fpplStatus';

export const ACTIVE_REQUEST_STATUSES = [
  FPPL_STATUSES.MENUNGGU_VERIFIKASI,
  FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
  FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
  FPPL_STATUSES.MENUNGGU_SAMPEL,
  FPPL_STATUSES.PROSES_PENGUJIAN,
  FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
  FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
];

export const HISTORY_REQUEST_STATUSES = [
  FPPL_STATUSES.SELESAI,
  FPPL_STATUSES.DIBATALKAN,
  FPPL_STATUSES.DIBATALKAN_PELANGGAN,
  FPPL_STATUSES.DITOLAK_ADMIN,
  FPPL_STATUSES.DITOLAK_KASI,
  FPPL_STATUSES.DITOLAK_PENYELIA,
];

export const ADMIN_REQUEST_STATUS_FILTERS = [
  'Semua',
  'Menunggu Verifikasi',
  'Menunggu Penentuan Metode',
  'Menunggu Pembayaran',
  'Menunggu Sampel',
  'Proses Pengujian',
  'Menunggu Penjadwalan LHU',
  'Menunggu Pengambilan LHU',
];

export const ADMIN_REQUEST_HISTORY_FILTERS = [
  'Semua',
  'Selesai',
  'Dibatalkan',
  'Dibatalkan Pelanggan',
  'Ditolak Admin',
  'Ditolak Kasi',
  'Ditolak Penyelia',
];

export const ADMIN_PICKUP_FILTERS = [
  'Semua',
  'Belum Dijadwalkan',
  'Dijadwalkan',
];

export const REQUEST_STATUS_FILTER_VALUE = {
  'Menunggu Verifikasi': FPPL_STATUSES.MENUNGGU_VERIFIKASI,
  'Menunggu Penentuan Metode': FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER,
  'Menunggu Pembayaran': FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
  'Menunggu Sampel': FPPL_STATUSES.MENUNGGU_SAMPEL,
  'Proses Pengujian': FPPL_STATUSES.PROSES_PENGUJIAN,
  'Menunggu Penjadwalan LHU': FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
  'Menunggu Pengambilan LHU': FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
  Selesai: FPPL_STATUSES.SELESAI,
  Dibatalkan: FPPL_STATUSES.DIBATALKAN,
  'Dibatalkan Pelanggan': FPPL_STATUSES.DIBATALKAN_PELANGGAN,
  'Ditolak Admin': FPPL_STATUSES.DITOLAK_ADMIN,
  'Ditolak Kasi': FPPL_STATUSES.DITOLAK_KASI,
  'Ditolak Penyelia': FPPL_STATUSES.DITOLAK_PENYELIA,
};

export const REQUEST_TIME_OPTIONS = Array.from({ length: 17 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

/** Single source of truth — harus identik dengan DB ENUM dan backend constants */
export const WADAH_OPTIONS = [
  'HDPE',
  'Botol Kaca',
  'Botol Kaca Gelap',
  'Jerigen',
  'Plastik Food Grade',
];

/** Single source of truth — harus identik dengan DB ENUM dan backend constants */
export const PERLAKUAN_PENGAWETAN_OPTIONS = [
  'Didinginkan < 6\u00b0C',
  '+ H2SO4 sampai pH < 2',
  '+ HNO3 sampai pH < 2',
  '+ NaOH sampai pH > 12',
  '+ NaOH sampai pH > 12 + Dingin',
  '+ Na2S2O3',
  'Saring segera',
  'Tanpa Pengawet',
];
