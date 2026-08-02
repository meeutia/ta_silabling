const LHU_STATUS = Object.freeze({
  DRAFT: 'Draft',
  WAIT_QC: 'Menunggu QC',
  APPROVED_FINAL: 'Disahkan',
  CANCELLED: 'Dibatalkan',
});

/**
 * Alias lama hanya untuk membaca data historis.
 * Tidak ada lagi status aktif yang menunggu approval Kepala Laboratorium.
 */
const LHU_LEGACY_STATUS_MAP = Object.freeze({
  'Menunggu Persetujuan Penyelia': LHU_STATUS.APPROVED_FINAL,
  'Perlu Revisi Penyelia': LHU_STATUS.APPROVED_FINAL,
  'Disetujui Penyelia': LHU_STATUS.APPROVED_FINAL,
  'Menunggu Verifikasi Kasi Pengujian': LHU_STATUS.APPROVED_FINAL,
  'Revisi Kasi Pengujian': LHU_STATUS.APPROVED_FINAL,
  'Disetujui Kasi Pengujian': LHU_STATUS.APPROVED_FINAL,
  'Revisi QC': LHU_STATUS.WAIT_QC,
  'Disetujui QC': LHU_STATUS.APPROVED_FINAL,
  'Menunggu Persetujuan Kepala Lab': LHU_STATUS.APPROVED_FINAL,
  'Menunggu Persetujuan Kalab': LHU_STATUS.APPROVED_FINAL,
  'Disetujui Kalab': LHU_STATUS.APPROVED_FINAL,
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
 * QC hanya boleh membuat/memperbarui LHU yang belum final.
 * Setelah QC finalisasi, LHU langsung berstatus Disahkan dan sumber LKA dikunci.
 */
const LHU_EDITABLE_BY_QC_STATUSES = Object.freeze([
  LHU_STATUS.DRAFT,
  LHU_STATUS.WAIT_QC,
  LHU_STATUS.CANCELLED,
]);

const LHU_EDITABLE_BY_PENYELIA_STATUSES = LHU_EDITABLE_BY_QC_STATUSES;

const LHU_NEXT_STATUS = Object.freeze({
  AFTER_QC_FINALIZE: LHU_STATUS.APPROVED_FINAL,
  AFTER_PENYELIA_FINALIZE: LHU_STATUS.APPROVED_FINAL,
  AFTER_KASI_PENGUJIAN_APPROVE: LHU_STATUS.APPROVED_FINAL,
  AFTER_QC_APPROVE: LHU_STATUS.APPROVED_FINAL,
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
