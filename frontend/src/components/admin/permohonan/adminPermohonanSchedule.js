import { buildSampleReceiptForms, usesOfficerSampling } from './adminPermohonanHelpers';
import { formatDateTime as formatDateTimeLabel } from '../../../utils/formatters';
import { getOperationalTimeOptions } from '../../../utils/businessDays';

export function getScheduleRows(requestItem) {
  return (
    requestItem?.JadwalSampels ||
    requestItem?.jadwal_sampels ||
    requestItem?.JadwalSampel ||
    requestItem?.jadwal_sampel ||
    []
  );
}

const ACTIVE_SAMPLE_SCHEDULE_STATUSES = ['Terjadwal', 'Disetujui Pelanggan', 'Disetujui Admin'];

export function getActiveScheduleFromRequest(requestItem) {
  const activeRows = getScheduleRows(requestItem)
    .filter((row) => ACTIVE_SAMPLE_SCHEDULE_STATUSES.includes(row?.status_jadwal))
    .sort((a, b) => new Date(b?.dibuat_pada || 0).getTime() - new Date(a?.dibuat_pada || 0).getTime());

  return activeRows[0] || requestItem?.jadwal_sampel || null;
}

export function getInitialScheduleDateFromRequest(requestItem) {
  const activeSchedule = getActiveScheduleFromRequest(requestItem);

  return (
    activeSchedule?.tanggal_jadwal ||
    requestItem?.tanggal_rencana_pengambilan_sampel ||
    requestItem?.tanggal_rencana_pengantaran_sampel ||
    ''
  );
}

export function getInitialScheduleTimeFromRequest(requestItem) {
  const activeSchedule = getActiveScheduleFromRequest(requestItem);
  const rawTime = activeSchedule?.jam_jadwal || requestItem?.jam_rencana_pengambilan_sampel || '08:00:00';

  return String(rawTime).slice(0, 5);
}

export function buildTimeOptions() {
  return getOperationalTimeOptions();
}


export function isBusinessDayDate(dateStr, holidayDateSet = new Set(), holidayNameByDate = {}) {
  if (!dateStr) return { valid: true };

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();

  if (weekday === 0) {
    return { valid: false, reason: 'Hari Minggu tidak termasuk hari kerja.' };
  }

  if (weekday === 6) {
    return { valid: false, reason: 'Hari Sabtu tidak termasuk hari kerja.' };
  }

  if (holidayDateSet.has(dateStr)) {
    return {
      valid: false,
      reason: holidayNameByDate[dateStr] || 'Hari libur nasional.',
    };
  }

  return { valid: true };
}

export function buildInitialSampleReceiptForms(requestItem, activeSchedule = getActiveScheduleFromRequest(requestItem)) {
  const receiptDateDefault = activeSchedule?.tanggal_jadwal || activeSchedule?.tgl_jadwal || '';
  return buildSampleReceiptForms(requestItem).map((form) => ({
    ...form,
    tanggal_pengambilan_sampel: usesOfficerSampling(requestItem) ? receiptDateDefault : '',
    kondisi: 'Sesuai',
  }));
}

export function formatTimelineDateValue(dateValue, timeValue = null) {
  if (!dateValue) return '—';
  return formatDateTimeLabel(dateValue, timeValue || '', '—');
}
