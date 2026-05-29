export function getFilenameFromPath(value, fallback = '-') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.split(/[\\/]/).filter(Boolean).pop() || fallback;
}
