export function getDisplayNoSampel(noSampel) {
  const value = String(noSampel || '').trim();
  if (!value) return '-';
  return value.split('/')[0] || value;
}

export function getFullNoSampel(noSampel) {
  const value = String(noSampel || '')
    .trim()
    .replace(/\s*\/\s*/g, '/');
  return value || '-';
}

export function normalizeSampleNoList(value) {
  const rawItems = Array.isArray(value) ? value : [value];

  return rawItems
    .flatMap((item) => {
      if (Array.isArray(item)) return normalizeSampleNoList(item);
      return String(item || '').split(/[\n,]+/);
    })
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

export function dedupeTextList(items = []) {
  const seen = new Set();
  const result = [];

  items.forEach((item) => {
    const value = String(item || '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    result.push(value);
  });

  return result;
}

export function joinIndentedLines(lines = [], indent = '                ') {
  const filtered = (Array.isArray(lines) ? lines : [])
    .map((line) => String(line || '').trim())
    .filter(Boolean);
  if (!filtered.length) return '-';
  return filtered.map((line, index) => (index === 0 ? line : `${indent}${line}`)).join('\n');
}

export function formatSampleNoList(sampleRowsOrNos = []) {
  const rawNos = (Array.isArray(sampleRowsOrNos) ? sampleRowsOrNos : [])
    .map((item) => (typeof item === 'string' ? item : item?.noSampel || item?.no_sampel || item?.no_sampel_lengkap))
    .filter(Boolean);

  const normalized = dedupeTextList(
    rawNos.map(getFullNoSampel).filter((value) => value && value !== '-')
  )
    .map((value) => {
      const match = String(value).match(/^(\d+)(\/.+)$/);
      return {
        value,
        number: match ? Number(match[1]) : null,
        suffix: match ? match[2] || '' : '',
      };
    })
    .sort((a, b) => {
      if (a.suffix !== b.suffix) return a.suffix.localeCompare(b.suffix);
      if (Number.isFinite(a.number) && Number.isFinite(b.number)) return a.number - b.number;
      if (Number.isFinite(a.number)) return -1;
      if (Number.isFinite(b.number)) return 1;
      return a.value.localeCompare(b.value);
    });

  if (!normalized.length) return '-';

  const grouped = new Map();
  const looseValues = [];

  normalized.forEach((item) => {
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

export function extractSamplePrefixedLines(value) {
  const text = String(value || '').replace(/\r/g, '\n').trim();
  if (!text) return [];

  const sampleRegex = /(\d+\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+\/\d{4})\s*:\s*/g;
  const matches = [...text.matchAll(sampleRegex)];
  if (!matches.length) return [];

  return matches
    .map((match, index) => {
      const nextStart = matches[index + 1]?.index ?? text.length;
      const noSampel = getDisplayNoSampel(match[1]);
      const value = text.slice(match.index + match[0].length, nextStart).replace(/\s+/g, ' ').trim();
      return value && noSampel !== '-' ? { noSampel, value } : null;
    })
    .filter(Boolean);
}

export function formatSampleFieldLines(sampleRows = [], getter, fallbackValue = '', sampleNos = [], options = {}) {
  const rows = Array.isArray(sampleRows) ? sampleRows : [];
  const { alwaysPrefix = false, repeatShared = false, assignFallbackByOrder = true, collapseIdentical = false } = options;
  const rowLines = rows
    .map((row) => {
      const noSampel = getDisplayNoSampel(row.noSampel || row.no_sampel);
      const value = String(typeof getter === 'function' ? getter(row) : row?.[getter] || '').trim();
      return value && value !== '-' && noSampel !== '-' ? { noSampel, value } : null;
    })
    .filter(Boolean);

  if (rowLines.length) {
    const uniqueValues = dedupeTextList(rowLines.map((item) => item.value));
    const shouldPrefix = alwaysPrefix || (rowLines.length > 1 && (!collapseIdentical || uniqueValues.length > 1));
    if (shouldPrefix) return joinIndentedLines(rowLines.map((item) => `${item.noSampel} : ${item.value}`));
    return uniqueValues.length > 1 ? joinIndentedLines(uniqueValues) : uniqueValues[0];
  }

  const fallbackRows = rows.length
    ? rows
    : dedupeTextList(sampleNos.map(getFullNoSampel).filter((value) => value && value !== '-'))
        .map((noSampel) => ({ noSampel, no_sampel: noSampel }));

  const prefixedFallbackRows = extractSamplePrefixedLines(fallbackValue);
  if (prefixedFallbackRows.length) {
    const uniquePrefixedValues = dedupeTextList(prefixedFallbackRows.map((item) => item.value));
    const shouldPrefix = alwaysPrefix || (prefixedFallbackRows.length > 1 && uniquePrefixedValues.length > 1);
    if (shouldPrefix) return joinIndentedLines(prefixedFallbackRows.map((item) => `${item.noSampel} : ${item.value}`));
    return uniquePrefixedValues[0] || '-';
  }

  const fallbackLines = String(fallbackValue || '').replace(/\r/g, '\n').split(/\n+|;+/).map((line) => String(line || '').trim()).filter(Boolean);
  if (!fallbackLines.length) return '-';
  if (fallbackRows.length > 1 && repeatShared && fallbackLines.length === 1) return joinIndentedLines(fallbackRows.map((row) => `${getDisplayNoSampel(row.noSampel || row.no_sampel)} : ${fallbackLines[0]}`));
  if (fallbackRows.length > 1 && assignFallbackByOrder && fallbackLines.length === fallbackRows.length) return joinIndentedLines(fallbackRows.map((row, index) => `${getDisplayNoSampel(row.noSampel || row.no_sampel)} : ${fallbackLines[index]}`));
  return fallbackLines.length > 1 ? joinIndentedLines(fallbackLines) : fallbackLines[0];
}

export function formatKoordinatLines(sampleRows = [], fallbackValue = '', sampleNos = []) {
  return formatSampleFieldLines(sampleRows, (sample) => sample.koordinat, fallbackValue, sampleNos, {
    alwaysPrefix: true,
    repeatShared: true,
    assignFallbackByOrder: true,
  });
}

export function isTruthyFlagValue(value) {
  if (value === true || value === 1) return true;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function isRowInsitu(row = {}) {
  return isTruthyFlagValue(row.is_insitu_snapshot ?? row.isInsituSnapshot ?? row.is_insitu ?? row.isInsitu);
}

export function isRowSubkontrak(row = {}) {
  return isTruthyFlagValue(row.is_subkontrak_snapshot ?? row.isSubkontrakSnapshot ?? row.is_subkontrak ?? row.isSubkontrak);
}

export function isRowTerakreditasi(row = {}) {
  return isTruthyFlagValue(row.is_terakreditasi ?? row.isTerakreditasi);
}

export function normalizeBakuMutuDisplay(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '-' || text === '(-)') return '(-)';
  return text;
}
