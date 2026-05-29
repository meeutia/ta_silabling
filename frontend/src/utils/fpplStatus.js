export const FPPL_STATUSES = {
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  MENUNGGU_PENENTUAN_PARAMETER: 'Menunggu Penentuan Metode',
  MENUNGGU_PEMBAYARAN: 'Menunggu Pembayaran',
  MENUNGGU_VERIFIKASI_PEMBAYARAN: 'Menunggu Verifikasi Pembayaran',
  MENUNGGU_SAMPEL: 'Menunggu Sampel',
  MENUNGGU_PENGAMBILAN_SAMPEL: 'Menunggu Pengambilan Sampel',
  MENUNGGU_PENGANTARAN_SAMPEL: 'Menunggu Pengantaran Sampel',
  PROSES_PENGUJIAN: 'Proses Pengujian',
  MENUNGGU_PENJADWALAN_LHU: 'Menunggu Penjadwalan LHU',
  MENUNGGU_PENGAMBILAN_LHU: 'Menunggu Pengambilan LHU',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
  DIBATALKAN_PELANGGAN: 'Dibatalkan Pelanggan',
  DITOLAK_ADMIN: 'Ditolak Admin',
  DITOLAK_KASI: 'Ditolak Kasi',
  DITOLAK_PENYELIA: 'Ditolak Penyelia',
};

const ALIAS_TO_CANONICAL = {
  [FPPL_STATUSES.MENUNGGU_VERIFIKASI_PEMBAYARAN]: FPPL_STATUSES.MENUNGGU_PEMBAYARAN,
  'Menunggu Validasi': FPPL_STATUSES.MENUNGGU_VERIFIKASI,
  'Menunggu Verifikasi Admin': FPPL_STATUSES.MENUNGGU_VERIFIKASI,
  'Menunggu Pengambilan Sampel': FPPL_STATUSES.MENUNGGU_SAMPEL,
  'Menunggu Pengantaran Sampel': FPPL_STATUSES.MENUNGGU_SAMPEL,
  'Menunggu Penerimaan Sampel': FPPL_STATUSES.MENUNGGU_SAMPEL,
  'Pengujian Laboratorium': FPPL_STATUSES.PROSES_PENGUJIAN,
  'Selesai (LHU Disahkan)': FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
  'LHU Disahkan': FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
  'Menunggu Penjadwalan': FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
  'Selesai Diambil': FPPL_STATUSES.SELESAI,
  'Dibatalkan oleh Pelanggan': FPPL_STATUSES.DIBATALKAN_PELANGGAN,
};

export function normalizeFpplStatus(status) {
  if (!status) return FPPL_STATUSES.MENUNGGU_VERIFIKASI;
  return ALIAS_TO_CANONICAL[status] || status;
}

export function getFpplStatusDisplayLabel(status) {
  const raw = String(status || '').trim();
  if ([
    FPPL_STATUSES.MENUNGGU_PENGAMBILAN_SAMPEL,
    FPPL_STATUSES.MENUNGGU_PENGANTARAN_SAMPEL,
    FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU,
    FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU,
  ].includes(raw)) {
    return raw;
  }
  return normalizeFpplStatus(raw);
}

export function isFinalFpplStatus(status) {
  const normalized = normalizeFpplStatus(status);
  return normalized === FPPL_STATUSES.SELESAI || [
    FPPL_STATUSES.DIBATALKAN,
    FPPL_STATUSES.DIBATALKAN_PELANGGAN,
    FPPL_STATUSES.DITOLAK_ADMIN,
    FPPL_STATUSES.DITOLAK_KASI,
    FPPL_STATUSES.DITOLAK_PENYELIA,
  ].includes(normalized);
}

export function getFpplStatusBadgeClass(status) {
  const normalized = normalizeFpplStatus(status);
  const styleMap = {
    [FPPL_STATUSES.MENUNGGU_VERIFIKASI]: { bg: 'bg-amber-100', text: 'text-amber-700' },
    [FPPL_STATUSES.MENUNGGU_PENENTUAN_PARAMETER]: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    [FPPL_STATUSES.MENUNGGU_PEMBAYARAN]: { bg: 'bg-blue-100', text: 'text-blue-700' },
    [FPPL_STATUSES.MENUNGGU_SAMPEL]: { bg: 'bg-purple-100', text: 'text-purple-700' },
    [FPPL_STATUSES.MENUNGGU_PENGAMBILAN_SAMPEL]: { bg: 'bg-purple-100', text: 'text-purple-700' },
    [FPPL_STATUSES.MENUNGGU_PENGANTARAN_SAMPEL]: { bg: 'bg-purple-100', text: 'text-purple-700' },
    [FPPL_STATUSES.PROSES_PENGUJIAN]: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    [FPPL_STATUSES.MENUNGGU_PENJADWALAN_LHU]: { bg: 'bg-amber-100', text: 'text-amber-700' },
    [FPPL_STATUSES.MENUNGGU_PENGAMBILAN_LHU]: { bg: 'bg-blue-100', text: 'text-blue-700' },
    [FPPL_STATUSES.SELESAI]: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    [FPPL_STATUSES.DIBATALKAN]: { bg: 'bg-red-100', text: 'text-red-700' },
    [FPPL_STATUSES.DIBATALKAN_PELANGGAN]: { bg: 'bg-red-100', text: 'text-red-700' },
    [FPPL_STATUSES.DITOLAK_ADMIN]: { bg: 'bg-red-100', text: 'text-red-700' },
    [FPPL_STATUSES.DITOLAK_KASI]: { bg: 'bg-red-100', text: 'text-red-700' },
    [FPPL_STATUSES.DITOLAK_PENYELIA]: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return styleMap[normalized] || { bg: 'bg-gray-100', text: 'text-gray-700' };
}
