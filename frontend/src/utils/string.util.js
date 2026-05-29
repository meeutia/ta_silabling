export function normalizeText(value) {
  return String(value || '').trim();
}

export function normalizeSearchText(value) {
  return normalizeText(value).toLowerCase();
}
