import { LHU_STATUSES, getStatusDisplayLabel } from '../constants/status';

const trim = (value) => String(value ?? '').trim();

export const LHU_STATUS_ALIASES = Object.freeze({
  'Menunggu Verifikasi Mutu': LHU_STATUSES.WAIT_QC,
  'Revisi QC': LHU_STATUSES.WAIT_QC,
  'Disetujui Mutu': LHU_STATUSES.APPROVED,
  'Disetujui QC': LHU_STATUSES.APPROVED,
  'Menunggu Persetujuan Kepala Lab': LHU_STATUSES.APPROVED,
  'Menunggu Persetujuan Kalab': LHU_STATUSES.APPROVED,
  'Disetujui Kalab': LHU_STATUSES.APPROVED,
});

export function normalizeLhuStatus(status, fallback = '') {
  const raw = trim(status || fallback);
  return LHU_STATUS_ALIASES[raw] || raw;
}

export function getLhuStatusDisplayLabel(status, fallback = '-') {
  return getStatusDisplayLabel(normalizeLhuStatus(status), fallback);
}

export function isQcEditableLhuStatus(status) {
  return [
    LHU_STATUSES.DRAFT,
    LHU_STATUSES.WAIT_QC,
    LHU_STATUSES.CANCELLED,
    '',
    '-',
    'Belum Dibuat',
  ].includes(normalizeLhuStatus(status));
}

export function isDeprecatedApprovalLhuStatus() {
  return false;
}

export function isFinalLhuStatus(status) {
  return normalizeLhuStatus(status) === LHU_STATUSES.APPROVED;
}

export function isRejectedOrCancelledStatus(status) {
  const normalized = trim(status).toLowerCase();
  return normalized.includes('ditolak') || normalized.includes('dibatalkan');
}

export function isKasiResultReviewStatus(status) {
  const normalized = trim(status).toLowerCase();
  return [
    'menunggu review kasi pengujian',
    'menunggu verifikasi kasi pengujian',
    'revisi kasi pengujian',
  ].includes(normalized);
}

export function isPenyeliaResultReviewStatus(status) {
  const normalized = trim(status).toLowerCase();
  return [
    'worksheet terkirim',
    'menunggu review',
    'menunggu review penyelia',
    'menunggu verifikasi penyelia',
  ].includes(normalized);
}

export const ACTIVE_LHU_PICKUP_STATUSES = Object.freeze([
  'Menunggu Pengambilan LHU',
  'Dijadwalkan',
  'Disetujui Pelanggan',
  'Disetujui Admin',
]);

export function isLhuPickupScheduledStatus(status) {
  return ACTIVE_LHU_PICKUP_STATUSES.includes(trim(status));
}

function localYmd(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYmd(value) {
  const raw = trim(value);
  if (!raw) return '';
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return localYmd(date);
}

export function isDateTodayOrPast(value) {
  const ymd = getYmd(value);
  return Boolean(ymd) && ymd <= localYmd();
}

export function canScheduleLhuPickup(row = {}) {
  return trim(row.status_pengambilan || row.statusPengambilan) !== 'Sudah Diambil';
}

export function canCompleteLhuPickup(row = {}) {
  const status = row.status_pengambilan || row.statusPengambilan;
  const tanggal = row.tanggal_pengambilan || row.tanggalPengambilan;
  return isLhuPickupScheduledStatus(status) && isDateTodayOrPast(tanggal);
}

export function getLhuPickupActionMessage(row = {}) {
  const status = trim(row.status_pengambilan || row.statusPengambilan || 'Belum Dijadwalkan');

  if (status === 'Sudah Diambil') return 'LHU sudah ditandai diambil.';
  if (!isLhuPickupScheduledStatus(status)) return 'Jadwalkan pengambilan LHU terlebih dahulu.';

  const tanggal = row.tanggal_pengambilan || row.tanggalPengambilan;
  if (!tanggal) return 'Tanggal pengambilan LHU belum tersedia.';
  if (!isDateTodayOrPast(tanggal)) return 'Pengambilan belum bisa ditandai sebelum tanggal jadwal.';

  return '';
}
