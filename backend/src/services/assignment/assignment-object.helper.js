function getPlain(instance) {
  if (!instance) return null;
  if (typeof instance.get === 'function') return instance.get({ plain: true });
  return instance;
}

function pickObject(source, keys = []) {
  for (const key of keys) {
    if (source?.[key]) return source[key];
  }
  return null;
}

function pickArray(source, keys = []) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return [];
}

function normalizeIdList(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  if (typeof value === 'string') {
    return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));
  }

  if (value === null || value === undefined) return [];

  const single = String(value || '').trim();
  return single ? [single] : [];
}

function uniqueText(values = []) {
  const cleaned = values.map((value) => String(value || '').trim()).filter(Boolean);
  return Array.from(new Set(cleaned)).join(', ') || '-';
}

function firstDate(values = []) {
  return values.find(Boolean) || null;
}

module.exports = {
  getPlain,
  pickObject,
  pickArray,
  normalizeIdList,
  uniqueText,
  firstDate,
};
