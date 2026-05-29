export function asTrimmedText(value) {
  return String(value ?? '').trim();
}

export function isBlank(value) {
  return asTrimmedText(value) === '';
}

export function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

export function isValidEmail(value) {
  const text = asTrimmedText(value);
  if (!text) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

export function isPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

export function toPositiveInteger(value, fallback = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const rounded = Math.floor(number);
  return rounded > 0 ? rounded : fallback;
}

export function hasAnyValue(values = []) {
  return values.some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return !isBlank(value);
  });
}

export function getFirstDateError(dateErrors = {}) {
  const entry = Object.entries(dateErrors || {}).find(([, value]) => Boolean(value));
  return entry ? String(entry[1]).replace(/^⛔\s*/, '') : '';
}

export function compareYmd(left, right) {
  const leftText = asTrimmedText(left);
  const rightText = asTrimmedText(right);

  if (!leftText || !rightText) return 0;
  if (leftText === rightText) return 0;
  return leftText > rightText ? 1 : -1;
}

export function getTodayYmd() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
