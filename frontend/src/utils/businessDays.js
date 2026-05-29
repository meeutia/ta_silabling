export function parseYmd(value) {
  if (!value) return null;

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatYmd(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getTodayYmd() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatYmd(today);
}

export function compareYmd(left, right) {
  const leftText = String(left || '').slice(0, 10);
  const rightText = String(right || '').slice(0, 10);

  if (!leftText || !rightText) return 0;
  if (leftText === rightText) return 0;
  return leftText > rightText ? 1 : -1;
}

export function isBeforeToday(value) {
  return compareYmd(value, getTodayYmd()) < 0;
}

export function isWeekendYmd(value) {
  const date = parseYmd(value);
  if (!date) return false;
  return date.getDay() === 0 || date.getDay() === 6;
}

export function isBusinessDayYmd(value, holidayDateSet = new Set()) {
  if (!value) return true;
  const date = parseYmd(value);
  if (!date) return false;
  if (date.getDay() === 0 || date.getDay() === 6) return false;
  return !holidayDateSet.has(formatYmd(date));
}

export function addBusinessDays(baseDateValue, daysToAdd, isBusinessDay = isBusinessDayYmd) {
  const baseDate = parseYmd(baseDateValue);
  if (!baseDate) return '';

  const cursor = new Date(baseDate.getTime());
  let counted = 0;

  while (counted < Number(daysToAdd || 0)) {
    cursor.setDate(cursor.getDate() + 1);
    const ymd = formatYmd(cursor);

    const check = isBusinessDay(ymd);
    const valid = typeof check === 'boolean' ? check : check?.valid !== false;

    if (!valid) continue;

    counted += 1;
  }

  return formatYmd(cursor);
}

export function getBusinessDayNumber(baseDateValue, targetDateValue, isBusinessDay = isBusinessDayYmd) {
  const baseDate = parseYmd(baseDateValue);
  const targetDate = parseYmd(targetDateValue);

  if (!baseDate || !targetDate) return null;
  if (targetDate < baseDate) return 0;

  let dayNumber = 1;
  const cursor = new Date(baseDate.getTime());

  while (cursor < targetDate) {
    cursor.setDate(cursor.getDate() + 1);
    const ymd = formatYmd(cursor);
    const check = isBusinessDay(ymd);
    const valid = typeof check === 'boolean' ? check : check?.valid !== false;

    if (valid) dayNumber += 1;
  }

  return dayNumber;
}

export function buildTestingBusinessTimeline(receiptDateValue, isBusinessDay = isBusinessDayYmd) {
  if (!receiptDateValue) {
    return {
      receiptDate: '',
      testingStart: '',
      testingEnd: '',
      verificationStart: '',
      verificationEnd: '',
      reportingDate: '',
      maxCompletionDate: '',
    };
  }

  return {
    receiptDate: receiptDateValue,
    testingStart: addBusinessDays(receiptDateValue, 1, isBusinessDay),
    testingEnd: addBusinessDays(receiptDateValue, 8, isBusinessDay),
    verificationStart: addBusinessDays(receiptDateValue, 9, isBusinessDay),
    verificationEnd: addBusinessDays(receiptDateValue, 10, isBusinessDay),
    reportingDate: addBusinessDays(receiptDateValue, 11, isBusinessDay),
    maxCompletionDate: addBusinessDays(receiptDateValue, 11, isBusinessDay),
  };
}

export function getTestingStageByBusinessDay(dayNumber) {
  const day = Number(dayNumber || 0);

  if (!day) return 'Belum mulai';
  if (day === 1) return 'Sampel diterima';
  if (day >= 2 && day <= 9) return 'Pengujian';
  if (day >= 10 && day <= 11) return 'Verifikasi';
  if (day === 12) return 'Pelaporan';
  return 'Melewati batas 12 hari kerja';
}

export function validateDateNotBeforeToday(value, fieldLabel = 'Tanggal') {
  if (!value) return { valid: true };

  if (isBeforeToday(value)) {
    return {
      valid: false,
      reason: `${fieldLabel} tidak boleh sebelum hari ini.`,
    };
  }

  return { valid: true };
}

export const OPERATIONAL_START_TIME = '08:00';
export const OPERATIONAL_END_TIME = '16:00';

export function timeToMinutes(value) {
  const text = String(value || '').trim().slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(text)) return null;

  const [hour, minute] = text.split(':').map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

export function getOperationalTimeOptions() {
  const start = timeToMinutes(OPERATIONAL_START_TIME);
  const end = timeToMinutes(OPERATIONAL_END_TIME);
  const options = [];

  for (let minutes = start; minutes <= end; minutes += 1) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }

  return options;
}

export function validateOperationalTime(value, fieldLabel = 'Jam') {
  if (!value) {
    return { valid: false, reason: `${fieldLabel} wajib diisi.` };
  }

  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return { valid: false, reason: `${fieldLabel} harus berformat HH:mm.` };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second !== 0) {
    return { valid: false, reason: `${fieldLabel} tidak valid.` };
  }

  const normalized = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const start = timeToMinutes(OPERATIONAL_START_TIME);
  const end = timeToMinutes(OPERATIONAL_END_TIME);
  const current = timeToMinutes(normalized);

  if (current < start || current > end) {
    return {
      valid: false,
      reason: `${fieldLabel} harus berada dalam jam operasional ${OPERATIONAL_START_TIME}-${OPERATIONAL_END_TIME} WIB.`,
    };
  }

  return { valid: true, value: normalized };
}

export function validateBusinessScheduleDate(value, holidayDateSet = new Set(), holidayNameByDate = {}, fieldLabel = 'Tanggal') {
  if (!value) return { valid: false, reason: `${fieldLabel} wajib diisi.` };

  const todayValidation = validateDateNotBeforeToday(value, fieldLabel);
  if (!todayValidation.valid) return todayValidation;

  const businessDay = isBusinessDayYmd(value, holidayDateSet);
  if (!businessDay) {
    const date = parseYmd(value);
    const day = date?.getDay?.();
    if (day === 0) return { valid: false, reason: `${fieldLabel} tidak boleh hari Minggu.` };
    if (day === 6) return { valid: false, reason: `${fieldLabel} tidak boleh hari Sabtu.` };
    return {
      valid: false,
      reason: `${fieldLabel} tidak boleh tanggal merah${holidayNameByDate[value] ? ` (${holidayNameByDate[value]})` : ''}.`,
    };
  }

  return { valid: true };
}
