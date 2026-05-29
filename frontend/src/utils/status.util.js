export function normalizeStatus(value) {
  return String(value || '').trim();
}

export function isStatus(value, expected) {
  return normalizeStatus(value) === normalizeStatus(expected);
}
