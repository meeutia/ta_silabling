const DEFAULT_LOCALE = 'id-ID';

const OBJECT_DATE_KEYS = [
  '$date',
  'date',
  'datetime',
  'dateTime',
  'value',
  'raw',
  'iso',
  'isoString',
  'tanggal',
  'tanggal_pendaftaran',
  'tanggalPendaftaran',
  'tanggal_daftar',
  'tanggalDaftar',
  'tanggal_registrasi',
  'tanggalRegistrasi',
  'tgl_pendaftaran',
  'tglPendaftaran',
  'tgl_daftar',
  'tglDaftar',
  'registered_at',
  'registeredAt',
  'registration_date',
  'submitted_at',
  'submittedAt',
  'tanggal_verifikasi',
  'tanggalVerifikasi',
  'tanggal_validasi',
  'tanggalValidasi',
  'tgl_verifikasi',
  'tglVerifikasi',
  'tgl_validasi',
  'tglValidasi',
  'verified_at',
  'verifiedAt',
  'validated_at',
  'validatedAt',
  'approved_at',
  'approvedAt',
  'accepted_at',
  'acceptedAt',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
];

function normalizeDateValueInternal(value, seenObjects) {
  if (value === null || value === undefined || value === false) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text || text === '[object Object]') return null;
    return text;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value;
  }

  if (typeof value !== 'object') return null;

  if (seenObjects.has(value)) return null;
  seenObjects.add(value);

  if (typeof value.toDate === 'function') {
    try {
      const parsed = normalizeDateValueInternal(value.toDate(), seenObjects);
      if (parsed) return parsed;
    } catch {
      // Abaikan object tanggal yang method toDate-nya gagal dieksekusi.
    }
  }

  if (typeof value.toISOString === 'function') {
    try {
      const parsed = normalizeDateValueInternal(value.toISOString(), seenObjects);
      if (parsed) return parsed;
    } catch {
      // Abaikan object tanggal yang method toISOString-nya gagal dieksekusi.
    }
  }

  const seconds = Number(value.seconds ?? value._seconds);
  if (Number.isFinite(seconds) && seconds > 0) {
    const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    const milliseconds = seconds * 1000 + (Number.isFinite(nanoseconds) ? Math.floor(nanoseconds / 1000000) : 0);
    const parsed = new Date(milliseconds);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const milliseconds = Number(value.milliseconds ?? value._milliseconds ?? value.ms ?? value.timestampMs);
  if (Number.isFinite(milliseconds) && milliseconds > 0) {
    const parsed = new Date(milliseconds);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  for (const key of OBJECT_DATE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;

    const parsed = normalizeDateValueInternal(value[key], seenObjects);
    if (parsed) return parsed;
  }

  return null;
}

export function normalizeDateValue(value) {
  return normalizeDateValueInternal(value, new WeakSet());
}

export function safeParseDate(value) {
  if (!value) return null;

  const normalizedValue = normalizeDateValue(value);
  if (!normalizedValue) return null;

  if (normalizedValue instanceof Date) {
    return Number.isNaN(normalizedValue.getTime()) ? null : normalizedValue;
  }

  const raw = String(normalizedValue).trim();
  if (!raw) return null;

  if (/^0{4}-0{2}-0{2}/.test(raw)) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    const parsedLocalDate = new Date(year, month - 1, day);
    return Number.isNaN(parsedLocalDate.getTime()) ? null : parsedLocalDate;
  }

  const normalized = raw.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?(\.\d+)?$/)
    ? raw.replace(' ', 'T')
    : raw;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateOnly(value, fallback = '-') {
  const date = safeParseDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateLong(value, fallback = '-') {
  const date = safeParseDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatTime(value, fallback = '-') {
  if (!value) return fallback;

  const text = String(value).trim();
  if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5);

  const date = safeParseDate(value);
  if (!date) return text || fallback;

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDateTime(dateValue, timeValue = '', fallback = '-') {
  if (!dateValue) return fallback;

  const normalizedDateValue = normalizeDateValue(dateValue);
  if (!normalizedDateValue) return fallback;

  const dateText = formatDateOnly(normalizedDateValue, fallback);
  if (dateText === fallback) return fallback;

  const rawDate = String(normalizedDateValue).trim();
  const hasTimeInDate =
    rawDate.includes('T') ||
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(rawDate) ||
    /\d{1,2}:\d{2}/.test(rawDate);

  const timeText = timeValue
    ? formatTime(timeValue, '')
    : hasTimeInDate
      ? formatTime(normalizedDateValue, '')
      : '';

  return timeText ? `${dateText} • ${timeText} WIB` : dateText;
}


export function combineDateTimeValue(dateValue, timeValue = '') {
  if (!dateValue) return '';

  const dateText = String(dateValue).trim();
  const timeText = String(timeValue || '').trim();

  if (!dateText) return '';
  if (!timeText) return dateText;

  if (dateText.includes('T') || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(dateText)) {
    return dateText;
  }

  return `${dateText} ${timeText}`;
}

export function toDateTimestamp(value, fallback = 0) {
  const date = safeParseDate(value);
  return date ? date.getTime() : fallback;
}

export function formatDateInput(value, fallback = '') {
  const date = safeParseDate(value);
  if (!date) return fallback;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatRupiah(value, fallback = 'Rp0') {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numberValue);
}

export function formatNumber(value, fallback = '-') {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;

  return new Intl.NumberFormat(DEFAULT_LOCALE).format(numberValue);
}

export function joinNonEmpty(values = [], separator = ' • ', fallback = '-') {
  const result = values
    .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
    .filter(Boolean)
    .join(separator);

  return result || fallback;
}
