export const parseYmdToDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const formatDateToYmd = (date) => {
  if (!(date instanceof Date)) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const toYmdOrEmpty = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return formatDateToYmd(dt);
};

export const toTimeHHmmOrEmpty = (value) => {
  if (!value) return '';

  const text = String(value).trim();
  const timeMatch = text.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}`;
  }

  const dt = new Date(text);
  if (Number.isNaN(dt.getTime())) return '';

  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');

  return `${hh}:${mm}`;
};

export const buildTimeOptions = () => {
  const options = [];

  for (let h = 8; h <= 16; h += 1) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 16 && m > 0) break;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      options.push(`${hh}:${mm}`);
    }
  }

  return options;
};

export const isOfficerSampling = (value) => {
  const normalized = String(value || '').toLowerCase();

  return normalized === 'laboratorium' || normalized === 'petugas';
};

export const getSamplingLocationLabel = (metodePengambilan) => {
  return isOfficerSampling(metodePengambilan)
    ? 'Alamat Lengkap Pengambilan Sampel'
    : 'Alamat Lengkap Asal Sampel';
};

export const getSamplingLocationPlaceholder = (metodePengambilan) => {
  return isOfficerSampling(metodePengambilan)
    ? 'Contoh: Jl. Sudirman No. 10, RT 01/RW 02, Kelurahan Belanti, Kecamatan Padang Utara, Kota Padang, Sumatera Barat, 25173'
    : 'Contoh: Jl. Sudirman No. 10, RT 01/RW 02, Kelurahan Belanti, Kecamatan Padang Utara, Kota Padang, Sumatera Barat, 25173';
};

export const isBusinessDayDate = (dateStr, holidayDateSet = new Set(), holidayNameByDate = {}) => {
  if (!dateStr) return { valid: true };

  const [y, m, d] = String(dateStr).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();

  if (day === 0) return { valid: false, reason: 'Hari Minggu tidak termasuk hari kerja' };
  if (day === 6) return { valid: false, reason: 'Hari Sabtu tidak termasuk hari kerja' };

  if (holidayDateSet.has(dateStr)) {
    return { valid: false, reason: holidayNameByDate[dateStr] || 'Hari libur nasional' };
  }

  return { valid: true };
};

export const addBusinessDays = (baseDateStr, daysToAdd, isBusinessDay) => {
  const baseDate = parseYmdToDate(baseDateStr);
  if (!baseDate) return '';

  const cursor = new Date(baseDate.getTime());
  let counted = 0;

  while (counted < daysToAdd) {
    cursor.setDate(cursor.getDate() + 1);
    const ymd = formatDateToYmd(cursor);
    const businessValidation = isBusinessDay(ymd);

    if (businessValidation.valid) {
      counted += 1;
    }
  }

  return formatDateToYmd(cursor);
};
