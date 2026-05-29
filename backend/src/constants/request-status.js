const REQUEST_STATUS = Object.freeze({
  DRAFT: 'Draft',
  WAITING_VERIFICATION: 'Menunggu Verifikasi',
  WAITING_REVISION: 'Perlu Revisi',
  WAITING_PARAMETER: 'Menunggu Penentuan Metode',
  WAITING_PAYMENT: 'Menunggu Pembayaran',

  // Legacy non-aktif: alur unggah lampiran pembayaran sudah dihapus.
  // Nilai ini hanya dibaca untuk migrasi/kompatibilitas data lama.
  WAITING_PAYMENT_VERIFICATION: 'Menunggu Verifikasi Pembayaran',

  WAITING_SAMPLE: 'Menunggu Sampel',
  WAITING_SAMPLE_PICKUP: 'Menunggu Pengambilan Sampel',
  WAITING_SAMPLE_DELIVERY: 'Menunggu Pengantaran Sampel',
  TESTING_PROCESS: 'Proses Pengujian',
  WAITING_LHU_SCHEDULING: 'Menunggu Penjadwalan LHU',
  WAITING_LHU_PICKUP: 'Menunggu Pengambilan LHU',
  COMPLETED: 'Selesai',
  REJECTED: 'Dibatalkan',
  CANCELLED_BY_CUSTOMER: 'Dibatalkan Pelanggan',
  REJECTED_BY_ADMIN: 'Ditolak Admin',
  REJECTED_BY_KASI: 'Ditolak Kasi',
  REJECTED_BY_PENYELIA: 'Ditolak Penyelia',
});

const WAITING_SAMPLE_STATUSES = Object.freeze([
  REQUEST_STATUS.WAITING_SAMPLE,
  REQUEST_STATUS.WAITING_SAMPLE_PICKUP,
  REQUEST_STATUS.WAITING_SAMPLE_DELIVERY,
]);

const REQUEST_STATUS_ALIASES = Object.freeze({
  [REQUEST_STATUS.WAITING_PAYMENT_VERIFICATION]: REQUEST_STATUS.WAITING_PAYMENT,
  'Menunggu Validasi': REQUEST_STATUS.WAITING_VERIFICATION,
  'Menunggu Verifikasi Admin': REQUEST_STATUS.WAITING_VERIFICATION,
  'Menunggu Penerimaan Sampel': REQUEST_STATUS.WAITING_SAMPLE,
  'Pengujian Laboratorium': REQUEST_STATUS.TESTING_PROCESS,
  'Selesai (LHU Disahkan)': REQUEST_STATUS.WAITING_LHU_SCHEDULING,
  'LHU Disahkan': REQUEST_STATUS.WAITING_LHU_SCHEDULING,
  'Menunggu Penjadwalan': REQUEST_STATUS.WAITING_LHU_SCHEDULING,
  'Selesai Diambil': REQUEST_STATUS.COMPLETED,
  'Dibatalkan oleh Pelanggan': REQUEST_STATUS.CANCELLED_BY_CUSTOMER,
});

function normalizeRequestStatus(status) {
  const raw = String(status || '').trim();
  return REQUEST_STATUS_ALIASES[raw] || raw;
}

function isWaitingSampleStatus(status) {
  const raw = String(status || '').trim();
  return WAITING_SAMPLE_STATUSES.includes(raw);
}

function getWaitingSampleStatusBySamplingType(samplingType) {
  const normalized = String(samplingType || '').trim().toLowerCase();

  if (normalized === 'petugas' || normalized === 'laboratorium') {
    return REQUEST_STATUS.WAITING_SAMPLE_PICKUP;
  }

  if (normalized === 'mandiri') {
    return REQUEST_STATUS.WAITING_SAMPLE_DELIVERY;
  }

  return REQUEST_STATUS.WAITING_SAMPLE;
}

module.exports = {
  ...REQUEST_STATUS,
  REQUEST_STATUS,
  REQUEST_STATUS_ALIASES,
  WAITING_SAMPLE_STATUSES,
  getWaitingSampleStatusBySamplingType,
  isWaitingSampleStatus,
  normalizeRequestStatus,
};
