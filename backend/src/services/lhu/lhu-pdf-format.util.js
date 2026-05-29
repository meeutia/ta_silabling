const fs = require('fs');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeFileName(value) {
  return String(value || '')
    .replace(/[\\/:"*?<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .trim();
}

function formatDateId(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function valueOrDash(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '-';
  }

  return String(value);
}

function getDisplayNoSampel(noSampel) {
  const value = String(noSampel || '').trim();
  if (!value) return '-';
  return value.split('/')[0] || value;
}

function getFullNoSampel(noSampel) {
  const value = String(noSampel || '')
    .trim()
    .replace(/\s*\/\s*/g, '/');
  return value || '-';
}

function cleanInlineText(value) {
  const text = String(value ?? '')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (!text || text === '-') return '';

  return text;
}

function dedupeValues(values = []) {
  const seen = new Set();
  const result = [];

  (Array.isArray(values) ? values : []).forEach((value) => {
    const text = cleanInlineText(value);
    if (!text || seen.has(text)) return;
    seen.add(text);
    result.push(text);
  });

  return result;
}

function joinAlignedLines(lines = []) {
  const filtered = dedupeValues(lines);
  if (!filtered.length) return '-';
  return filtered.join('\n');
}

function getSampleFieldNo(row = {}) {
  return getDisplayNoSampel(row.no_sampel || row.noSampel || row.noSampelLhu);
}

function getSampleOrderValue(row = {}, fallbackIndex = 0) {
  const raw = row.urutan_sampel ?? row.urutanSampel ?? row.urutan_sample ?? row.urutanSample;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallbackIndex + 1;
}

function sortRowsBySampleOrder(rows = []) {
  return (Array.isArray(rows) ? [...rows] : []).sort((a, b) => {
    const orderA = getSampleOrderValue(a, 0);
    const orderB = getSampleOrderValue(b, 0);
    if (orderA !== orderB) return orderA - orderB;
    return String(a.no_sampel || a.noSampel || '').localeCompare(String(b.no_sampel || b.noSampel || ''));
  });
}

function parseSampleNumber(noSampel) {
  const value = getFullNoSampel(noSampel);
  if (!value || value === '-') return null;

  const match = value.match(/^(\d+)(\/.+)$/);
  if (!match) {
    return {
      value,
      number: null,
      suffix: '',
    };
  }

  return {
    value,
    number: Number(match[1]),
    suffix: match[2],
  };
}

function sortSampleNumbers(sampleNos = []) {
  return dedupeValues(sampleNos)
    .map(parseSampleNumber)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.suffix !== b.suffix) return a.suffix.localeCompare(b.suffix);
      if (Number.isFinite(a.number) && Number.isFinite(b.number)) return a.number - b.number;
      if (Number.isFinite(a.number)) return -1;
      if (Number.isFinite(b.number)) return 1;
      return a.value.localeCompare(b.value);
    });
}

function formatCompressedSampleNoList(sampleNos = []) {
  const parsed = sortSampleNumbers(
    (Array.isArray(sampleNos) ? sampleNos : [])
      .map(getFullNoSampel)
      .filter((value) => value && value !== '-')
  );

  if (!parsed.length) return null;

  const grouped = new Map();
  const looseValues = [];

  parsed.forEach((item) => {
    if (!Number.isFinite(item.number) || !item.suffix) {
      looseValues.push(item.value);
      return;
    }

    const rows = grouped.get(item.suffix) || [];
    rows.push(item);
    grouped.set(item.suffix, rows);
  });

  const compressedGroups = Array.from(grouped.entries()).map(([suffix, rows]) => {
    const sortedRows = [...rows].sort((a, b) => a.number - b.number);
    const first = sortedRows[0];
    const last = sortedRows[sortedRows.length - 1];

    return sortedRows.length > 1
      ? `${first.number}-${last.number}${suffix}`
      : first.value;
  });

  return [...compressedGroups, ...looseValues].join(', ');
}

function formatSampleNoList(sampleRows = []) {
  const sampleNos = sortRowsBySampleOrder(sampleRows)
    .map((row) => getFullNoSampel(row.no_sampel || row.noSampel))
    .filter((value) => value && value !== '-');

  return formatCompressedSampleNoList(sampleNos);
}

function formatSampleFieldLines(sampleRows = [], getter, fallbackValue = null, options = {}) {
  const rows = Array.isArray(sampleRows) ? sampleRows : [];
  const { alwaysPrefix = false, repeatShared = false, assignFallbackByOrder = true } = options;

  const rowLines = rows
    .map((row) => {
      const sampleNo = getSampleFieldNo(row);
      const value = cleanInlineText(typeof getter === 'function' ? getter(row) : row?.[getter]);
      return value && value !== '-' && sampleNo !== '-' ? { sampleNo, value } : null;
    })
    .filter(Boolean);

  if (rowLines.length) {
    const uniqueValues = dedupeValues(rowLines.map((item) => item.value));
    const hasDifferentValues = uniqueValues.length > 1;

    if (alwaysPrefix || (rowLines.length > 1 && hasDifferentValues)) {
      return joinAlignedLines(rowLines.map((item) => `${item.sampleNo} : ${item.value}`));
    }

    return uniqueValues[0] || '-';
  }

  const fallbackRows = rows.length
    ? rows
    : dedupeValues(rows.map((row) => row.no_sampel || row.noSampel)).map((noSampel) => ({ no_sampel: noSampel }));
  const fallbackLines = String(fallbackValue || '')
    .replace(/\r/g, '\n')
    .split(/\n+|;+/)
    .map((line) => cleanInlineText(line))
    .filter(Boolean);

  if (!fallbackLines.length) return '-';

  if (fallbackRows.length > 1 && repeatShared && fallbackLines.length === 1) {
    return joinAlignedLines(fallbackRows.map((row) => `${getSampleFieldNo(row)} : ${fallbackLines[0]}`));
  }

  if (fallbackRows.length > 1 && assignFallbackByOrder && fallbackLines.length === fallbackRows.length) {
    return joinAlignedLines(fallbackRows.map((row, index) => `${getSampleFieldNo(row)} : ${fallbackLines[index]}`));
  }

  const uniqueFallbackLines = dedupeValues(fallbackLines);
  return uniqueFallbackLines.length > 1 ? joinAlignedLines(uniqueFallbackLines) : uniqueFallbackLines[0];
}


function normalizeBakuMutuForLhu(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '-' || text === '(-)') return '(-)';
  return text;
}

function isBakuMutuNotRequired(value) {
  return normalizeBakuMutuForLhu(value) === '(-)';
}


const OFFICIAL_SAMPLE_COLLECTOR_TEXT = 'Petugas Pengambil Sampel UPTD Labling DLH Provinsi Sumbar';

function normalizeSampleTypeForLhu(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || text === '-') return null;

  const withoutDoubleAir = text.replace(/^air\s+air\s+/i, 'Air ');
  return /^air(\b|\s)/i.test(withoutDoubleAir) ? withoutDoubleAir : `Air ${withoutDoubleAir}`;
}

function normalizeSampleCollectorForLhu(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || text === '-') return null;

  if (/^petugas$/i.test(text) || /petugas/i.test(text)) {
    return OFFICIAL_SAMPLE_COLLECTOR_TEXT;
  }

  return text;
}

function getStatusText(isFinal) {
  return isFinal ? 'FINAL' : 'DRAFT - BELUM DISAHKAN';
}

function calculateAccreditationStats(details = []) {
  const uniqueMap = new Map();

  (Array.isArray(details) ? details : []).forEach((row, index) => {
    const key = [
      row.id_fppl_parameter_metode,
      row.nama_parameter_snapshot,
      row.metode_snapshot,
      row.acuan_metode_snapshot,
    ].map((value) => String(value || '').trim()).join('|') || `row-${index}`;

    if (!uniqueMap.has(key)) uniqueMap.set(key, row);
  });

  const uniqueRows = Array.from(uniqueMap.values());
  const totalParameter = uniqueRows.length;

  const totalTerakreditasi = uniqueRows.filter((row) => {
    const statusAkreditasi = String(row.status_akreditasi || '').toLowerCase();

    return (
      Number(row.is_terakreditasi || 0) === 1 ||
      Number(row.terakreditasi || 0) === 1 ||
      Number(row.is_metode_terakreditasi || 0) === 1 ||
      statusAkreditasi === 'terakreditasi'
    );
  }).length;

  const persentase =
    totalParameter > 0
      ? Number(((totalTerakreditasi / totalParameter) * 100).toFixed(2))
      : 0;

  return {
    totalParameter,
    totalTerakreditasi,
    persentase,
    showLogoKan: persentase >= 60,
  };
}
function safeDrawImage(doc, imagePath, x, y, options = {}) {
  if (!imagePath || !fs.existsSync(imagePath)) return false;

  try {
    doc.image(imagePath, x, y, options);
    return true;
  } catch (error) {
    console.warn(`Gagal memuat logo PDF: ${imagePath}`, error.message);
    return false;
  }
}

module.exports = {
  ensureDir,
  safeFileName,
  formatDateId,
  valueOrDash,
  getDisplayNoSampel,
  getFullNoSampel,
  cleanInlineText,
  dedupeValues,
  joinAlignedLines,
  getSampleOrderValue,
  sortRowsBySampleOrder,
  formatSampleNoList,
  formatCompressedSampleNoList,
  formatSampleFieldLines,
  normalizeBakuMutuForLhu,
  isBakuMutuNotRequired,
  normalizeSampleTypeForLhu,
  normalizeSampleCollectorForLhu,
  getStatusText,
  calculateAccreditationStats,
  safeDrawImage,
};
