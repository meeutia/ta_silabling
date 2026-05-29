const LHU_STATUS = Object.freeze({
  DRAFT: 'Draft',
  WAIT_QC: 'Menunggu QC',
  WAIT_KALAB: 'Menunggu Persetujuan Kepala Lab',
  APPROVED_FINAL: 'Disahkan',
  CANCELLED: 'Dibatalkan',
});

/**
 * Alias lama tidak boleh dipakai sebagai status aktif.
 * Map ini hanya untuk normalisasi data lama agar kode tidak salah membaca status historis.
 */
const LHU_LEGACY_STATUS_MAP = Object.freeze({
  'Menunggu Persetujuan Penyelia': LHU_STATUS.WAIT_KALAB,
  'Perlu Revisi Penyelia': LHU_STATUS.WAIT_KALAB,
  'Disetujui Penyelia': LHU_STATUS.WAIT_KALAB,
  'Menunggu Verifikasi Kasi Pengujian': LHU_STATUS.WAIT_KALAB,
  'Revisi Kasi Pengujian': LHU_STATUS.WAIT_KALAB,
  'Disetujui Kasi Pengujian': LHU_STATUS.WAIT_KALAB,
  'Revisi QC': LHU_STATUS.WAIT_QC,
  'Disetujui QC': LHU_STATUS.WAIT_KALAB,
});

function normalizeLhuStatus(status) {
  const raw = String(status || '').trim();
  return LHU_LEGACY_STATUS_MAP[raw] || raw;
}

/**
 * Status review hasil di tabel lka_hasil.
 * Ini untuk review Kasi Pengujian, bukan status dokumen LHU.
 */
const SAMPLE_REVIEW_STATUS = Object.freeze({
  WAIT_KASI_PENGUJIAN: 'Menunggu Review Kasi Pengujian',
  APPROVED_KASI_PENGUJIAN: 'Disetujui Kasi Pengujian',
  REVISION_KASI_PENGUJIAN: 'Revisi Kasi Pengujian',
});

const SAMPLE_REVIEW_KASI_QUEUE_STATUSES = Object.freeze([
  SAMPLE_REVIEW_STATUS.WAIT_KASI_PENGUJIAN,
  SAMPLE_REVIEW_STATUS.REVISION_KASI_PENGUJIAN,
]);

/**
 * QC hanya boleh membuat/memperbarui LHU yang belum masuk approval Kalab.
 * Begitu status sudah Menunggu Persetujuan Kepala Lab atau Disahkan, sumber LKA dikunci.
 */
const LHU_EDITABLE_BY_QC_STATUSES = Object.freeze([
  LHU_STATUS.DRAFT,
  LHU_STATUS.WAIT_QC,
  LHU_STATUS.CANCELLED,
]);

const LHU_EDITABLE_BY_PENYELIA_STATUSES = LHU_EDITABLE_BY_QC_STATUSES;

const LHU_NEXT_STATUS = Object.freeze({
  AFTER_QC_FINALIZE: LHU_STATUS.WAIT_KALAB,
  AFTER_KALAB_APPROVE: LHU_STATUS.APPROVED_FINAL,

  // Alias transisi lama agar import lama tidak crash.
  AFTER_PENYELIA_FINALIZE: LHU_STATUS.WAIT_KALAB,
  AFTER_KASI_PENGUJIAN_APPROVE: LHU_STATUS.WAIT_KALAB,
  AFTER_QC_APPROVE: LHU_STATUS.WAIT_KALAB,
});

function isLhuEditableByQc(status) {
  return LHU_EDITABLE_BY_QC_STATUSES.includes(normalizeLhuStatus(status));
}

function isLhuEditableByPenyelia(status) {
  return isLhuEditableByQc(status);
}

function isSampleWaitingKasiReview(status) {
  return SAMPLE_REVIEW_KASI_QUEUE_STATUSES.includes(
    status || SAMPLE_REVIEW_STATUS.WAIT_KASI_PENGUJIAN
  );
}

module.exports = {
  LHU_STATUS,
  LHU_LEGACY_STATUS_MAP,
  normalizeLhuStatus,

  LHU_EDITABLE_BY_QC_STATUSES,
  LHU_EDITABLE_BY_PENYELIA_STATUSES,

  LHU_NEXT_STATUS,

  isLhuEditableByQc,
  isLhuEditableByPenyelia,

  SAMPLE_REVIEW_STATUS,
  SAMPLE_REVIEW_KASI_QUEUE_STATUSES,
  isSampleWaitingKasiReview,
};
