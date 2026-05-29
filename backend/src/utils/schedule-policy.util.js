const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

const OPERATIONAL_START_TIME = '08:00';
const OPERATIONAL_END_TIME = '16:00';

function createValidationError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getTodayYmd() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function normalizeDateOnly(value, label = 'Tanggal') {
  const text = String(value || '').trim().slice(0, 10);

  if (!text) {
    throw createValidationError(`${label} wajib diisi.`);
  }

  if (!YMD_PATTERN.test(text)) {
    throw createValidationError(`${label} harus format YYYY-MM-DD.`);
  }

  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw createValidationError(`${label} tidak valid.`);
  }

  return text;
}

function timeToMinutes(value) {
  const text = String(value || '').trim().slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(text)) return null;

  const [hour, minute] = text.split(':').map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

function normalizeTimeForDb(value, label = 'Jam') {
  const text = String(value ?? '').trim();

  if (!text) {
    throw createValidationError(`${label} wajib diisi.`);
  }

  const match = text.match(TIME_PATTERN);
  if (!match) {
    throw createValidationError(`${label} harus format HH:mm.`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    throw createValidationError(`${label} tidak valid.`);
  }

  if (second !== 0) {
    throw createValidationError(`${label} harus memakai detik 00.`);
  }

  const normalized = `${pad2(hour)}:${pad2(minute)}`;
  const start = timeToMinutes(OPERATIONAL_START_TIME);
  const end = timeToMinutes(OPERATIONAL_END_TIME);
  const current = timeToMinutes(normalized);

  if (current < start || current > end) {
    throw createValidationError(
      `${label} harus berada dalam jam operasional ${OPERATIONAL_START_TIME}-${OPERATIONAL_END_TIME} WIB.`
    );
  }

  return `${normalized}:00`;
}

function validateOperationalTime(value, label = 'Jam') {
  try {
    normalizeTimeForDb(value, label);
    return '';
  } catch (error) {
    return error.message || `${label} tidak valid.`;
  }
}

function isWeekendYmd(value) {
  const dateValue = normalizeDateOnly(value);
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();
  return weekday === 0 || weekday === 6;
}

function normalizeHolidayRows(holidays = []) {
  return (Array.isArray(holidays) ? holidays : [])
    .map((item) => {
      const date = String(item?.date || item?.tanggal || item?.tanggal_libur || item || '').slice(0, 10);
      if (!YMD_PATTERN.test(date)) return null;
      return {
        date,
        nama: item?.nama || item?.nama_libur || item?.summary || 'Tanggal merah',
      };
    })
    .filter(Boolean);
}

function findHoliday(dateValue, holidays = []) {
  const normalizedDate = normalizeDateOnly(dateValue);
  return normalizeHolidayRows(holidays).find((item) => item.date === normalizedDate) || null;
}

function assertBusinessDateOrThrow(value, label = 'Tanggal', holidays = [], options = {}) {
  const { notBeforeToday = true } = options;
  const dateValue = normalizeDateOnly(value, label);

  if (notBeforeToday && dateValue < getTodayYmd()) {
    throw createValidationError(`${label} tidak boleh sebelum hari ini.`);
  }

  if (isWeekendYmd(dateValue)) {
    throw createValidationError(`${label} harus hari kerja dan tidak boleh Sabtu/Minggu.`);
  }

  const holiday = findHoliday(dateValue, holidays);
  if (holiday) {
    throw createValidationError(`${label} tidak boleh tanggal merah${holiday.nama ? ` (${holiday.nama})` : ''}.`);
  }

  return dateValue;
}

function getOperationalTimeOptions() {
  const options = [];
  const start = timeToMinutes(OPERATIONAL_START_TIME);
  const end = timeToMinutes(OPERATIONAL_END_TIME);

  for (let minutes = start; minutes <= end; minutes += 1) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    options.push(`${pad2(hour)}:${pad2(minute)}`);
  }

  return options;
}

module.exports = {
  OPERATIONAL_END_TIME,
  OPERATIONAL_START_TIME,
  assertBusinessDateOrThrow,
  createValidationError,
  findHoliday,
  getOperationalTimeOptions,
  getTodayYmd,
  normalizeDateOnly,
  normalizeTimeForDb,
  validateOperationalTime,
};
