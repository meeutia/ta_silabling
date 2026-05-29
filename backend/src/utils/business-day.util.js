const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MONTH_ID = {
  januari: 1,
  jan: 1,
  februari: 2,
  feb: 2,
  maret: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  agustus: 8,
  agu: 8,
  aug: 8,
  september: 9,
  sep: 9,
  oktober: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  desember: 12,
  des: 12,
  dec: 12,
};

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatYmd(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

function toDateObject(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // MySQL/HTML date: 2026-04-10 or ISO datetime: 2026-04-10T08:00:00.000Z
  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Indonesian/user visible date: 10 April 2026
  const idDateMatch = raw.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})$/i);
  if (idDateMatch) {
    const [, day, monthName, year] = idDateMatch;
    const month = MONTH_ID[monthName.toLowerCase()];
    if (month) {
      const date = new Date(Number(year), month - 1, Number(day));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  // Common local date formats: 10/04/2026 or 10-04-2026
  const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function asYmd(value) {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'string') {
    const raw = value.trim();
    const direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct) return direct[1];
  }

  return formatYmd(toDateObject(value));
}

function isYmd(value) {
  return YMD_PATTERN.test(asYmd(value));
}

function parseYmd(value) {
  const text = asYmd(value);
  if (!isYmd(text)) return null;

  const [year, month, day] = text.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getTodayYmd() {
  return formatYmd(new Date());
}

function isWeekendDate(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function normalizeHolidaySet(holidays = []) {
  if (holidays instanceof Set) {
    return new Set([...holidays].map(asYmd).filter(isYmd));
  }

  return new Set(
    (Array.isArray(holidays) ? holidays : [])
      .map((item) => asYmd(item?.date || item?.tanggal || item))
      .filter(isYmd)
  );
}

function isBusinessDay(value, holidays = []) {
  const date = value instanceof Date ? value : parseYmd(value);
  if (!date) return false;

  const holidaySet = normalizeHolidaySet(holidays);
  return !isWeekendDate(date) && !holidaySet.has(formatYmd(date));
}

function addBusinessDays(startYmd, offset = 0, holidays = []) {
  const startDate = parseYmd(startYmd);
  if (!startDate) return '';

  const holidaySet = normalizeHolidaySet(holidays);
  const step = offset >= 0 ? 1 : -1;
  let remaining = Math.abs(Number(offset) || 0);
  const current = new Date(startDate);

  while (remaining > 0) {
    current.setDate(current.getDate() + step);
    if (isBusinessDay(current, holidaySet)) remaining -= 1;
  }

  return formatYmd(current);
}

function buildTestingBusinessTimeline(receivedYmd, holidays = []) {
  const start = asYmd(receivedYmd);
  if (!isYmd(start)) return null;

  return {
    sampleReceivedYmd: start,
    hari1: start,
    testingStartYmd: addBusinessDays(start, 1, holidays),
    testingEndYmd: addBusinessDays(start, 8, holidays),
    verificationStartYmd: addBusinessDays(start, 9, holidays),
    verificationEndYmd: addBusinessDays(start, 10, holidays),
    reportingYmd: addBusinessDays(start, 11, holidays),
  };
}

function getBusinessDayNumber(startYmd, targetYmd, holidays = []) {
  const startDate = parseYmd(startYmd);
  const targetDate = parseYmd(targetYmd);
  if (!startDate || !targetDate) return null;

  const start = formatYmd(startDate);
  const target = formatYmd(targetDate);

  if (target < start) return 0;

  const holidaySet = normalizeHolidaySet(holidays);
  let count = 0;
  const current = new Date(startDate);

  while (formatYmd(current) <= target) {
    if (isBusinessDay(current, holidaySet)) count += 1;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

function validateWithinBusinessWindow({
  value,
  startYmd,
  maxBusinessDay = 12,
  label = 'Tanggal',
  holidays = [],
  allowSameDay = true,
}) {
  const date = asYmd(value);
  const start = asYmd(startYmd);

  if (!isYmd(date)) return `${label} harus berformat YYYY-MM-DD.`;
  if (!isYmd(start)) return 'Tanggal acuan sampel diterima tidak valid.';

  if (date < start) return `${label} tidak boleh sebelum tanggal sampel diterima.`;

  if (!allowSameDay && date === start) {
    return `${label} harus setelah tanggal sampel diterima.`;
  }

  const maxYmd = addBusinessDays(start, maxBusinessDay - 1, holidays);
  if (maxYmd && date > maxYmd) {
    return `${label} tidak boleh melewati hari kerja ke-${maxBusinessDay} (${maxYmd}).`;
  }

  return '';
}

function validateTestingPhaseDate({ value, receivedYmd, label = 'Tanggal pengujian', holidays = [] }) {
  const date = asYmd(value);
  const timeline = buildTestingBusinessTimeline(receivedYmd, holidays);

  if (!isYmd(date)) return `${label} harus berformat YYYY-MM-DD.`;
  if (!timeline) return 'Tanggal sampel diterima tidak valid.';

  if (date < timeline.sampleReceivedYmd) {
    return `${label} tidak boleh sebelum tanggal sampel diterima.`;
  }

  if (date > timeline.testingEndYmd) {
    return `${label} tidak boleh melewati batas fase pengujian hari kerja ke-9 (${timeline.testingEndYmd}).`;
  }

  return '';
}

module.exports = {
  addBusinessDays,
  asYmd,
  buildTestingBusinessTimeline,
  formatYmd,
  getBusinessDayNumber,
  getTodayYmd,
  isBusinessDay,
  isYmd,
  parseYmd,
  toDateObject,
  validateTestingPhaseDate,
  validateWithinBusinessWindow,
};
