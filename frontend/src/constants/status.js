export const LHU_STATUSES = Object.freeze({
  DRAFT: 'Draft',
  WAIT_QC: 'Menunggu QC',
  WAIT_KALAB: 'Menunggu Persetujuan Kepala Lab',
  APPROVED: 'Disahkan',
  CANCELLED: 'Dibatalkan',
});

export const STATUS_BADGE_CLASS = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-200',
  Aktif: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Nonaktif: 'bg-gray-100 text-gray-600 border-gray-200',

  'Menunggu Verifikasi': 'bg-amber-100 text-amber-700 border-amber-200',
  'Menunggu Verifikasi Admin': 'bg-amber-100 text-amber-700 border-amber-200',
  'Menunggu Penentuan Metode': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Menunggu Pembayaran': 'bg-blue-100 text-blue-700 border-blue-200',
  'Menunggu Verifikasi Pembayaran': 'bg-blue-100 text-blue-700 border-blue-200',
  'Menunggu Sampel': 'bg-purple-100 text-purple-700 border-purple-200',
  'Menunggu Pengambilan Sampel': 'bg-purple-100 text-purple-700 border-purple-200',
  'Menunggu Pengantaran Sampel': 'bg-purple-100 text-purple-700 border-purple-200',
  'Menunggu Penugasan': 'bg-sky-100 text-sky-700 border-sky-200',
  'Belum Dijadwalkan': 'bg-amber-100 text-amber-700 border-amber-200',
  Dijadwalkan: 'bg-blue-100 text-blue-700 border-blue-200',
  'Disetujui Pelanggan': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Disetujui Admin': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Diambil: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Sudah Diambil': 'bg-emerald-100 text-emerald-700 border-emerald-200',

  'Proses Pengujian': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Menunggu Penjadwalan LHU': 'bg-amber-100 text-amber-700 border-amber-200',
  'Menunggu Pengambilan LHU': 'bg-blue-100 text-blue-700 border-blue-200',
  'Diproses Analis': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Menunggu Verifikasi Penyelia': 'bg-orange-100 text-orange-700 border-orange-200',
  'Disetujui Penyelia': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Menunggu Verifikasi Kasi': 'bg-violet-100 text-violet-700 border-violet-200',
  'Disetujui Kasi': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Menunggu QC': 'bg-pink-100 text-pink-700 border-pink-200',
  'Menunggu Persetujuan Kepala Lab': 'bg-indigo-100 text-indigo-700 border-indigo-200',

  'Menunggu Verifikasi Mutu': 'bg-pink-100 text-pink-700 border-pink-200',
  'Disetujui Mutu': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Menunggu Persetujuan Kalab': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Disetujui Kalab': 'bg-emerald-100 text-emerald-700 border-emerald-200',


  'Menunggu Input': 'bg-amber-100 text-amber-700 border-amber-200',
  Ditugaskan: 'bg-blue-100 text-blue-700 border-blue-200',
  'Worksheet Terkirim': 'bg-blue-100 text-blue-700 border-blue-200',
  'Menunggu Review': 'bg-violet-100 text-violet-700 border-violet-200',
  'Menunggu Review Penyelia': 'bg-violet-100 text-violet-700 border-violet-200',
  Terverifikasi: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Disahkan: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Ditolak/Revisi': 'bg-red-100 text-red-700 border-red-200',

  'Perlu Revisi': 'bg-red-100 text-red-700 border-red-200',
  Revisi: 'bg-red-100 text-red-700 border-red-200',
  Ditolak: 'bg-red-100 text-red-700 border-red-200',
  Dibatalkan: 'bg-red-100 text-red-700 border-red-200',
  Selesai: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const STATUS_DISPLAY_LABELS = Object.freeze({
  'Menunggu Verifikasi Pembayaran': 'Menunggu Pembayaran',
  'Menunggu Verifikasi Mutu': LHU_STATUSES.WAIT_QC,
  'Revisi QC': LHU_STATUSES.WAIT_QC,
  'Disetujui Mutu': LHU_STATUSES.WAIT_KALAB,
  'Disetujui QC': LHU_STATUSES.WAIT_KALAB,
  'Menunggu Persetujuan Kalab': LHU_STATUSES.WAIT_KALAB,
  'Disetujui Kalab': LHU_STATUSES.APPROVED,
  MANUAL: 'Bayar Nanti',
});

export function getStatusDisplayLabel(status, fallback = '-') {
  const raw = String(status ?? '').trim();
  if (!raw) return fallback;
  return STATUS_DISPLAY_LABELS[raw] || raw;
}

export function getStatusBadgeClass(status, fallback = 'bg-gray-100 text-gray-700 border-gray-200') {
  if (!status) return fallback;
  const raw = String(status).trim();
  const display = getStatusDisplayLabel(raw, raw);
  return STATUS_BADGE_CLASS[display] || STATUS_BADGE_CLASS[raw] || fallback;
}
