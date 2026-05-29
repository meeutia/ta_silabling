function isPlainSerializableObject(value) {
  if (!value || typeof value !== 'object') return false;
  if (value instanceof Date) return false;
  if (Buffer.isBuffer(value)) return false;
  return true;
}

function toPlainValue(value) {
  if (value && typeof value.get === 'function') {
    return value.get({ plain: true });
  }
  return value;
}

function toCamelCaseKey(key) {
  const text = String(key);

  // Jangan ubah key enum/constant yang memang ditulis kapital penuh.
  if (/^[A-Z0-9_]+$/.test(text)) return text;

  return text.replace(/_([a-zA-Z0-9])/g, (_, character) => character.toUpperCase());
}

function toCamelCaseDeep(value, depth = 0) {
  const plainValue = toPlainValue(value);

  if (Array.isArray(plainValue)) {
    return plainValue.map((item) => toCamelCaseDeep(item, depth + 1));
  }

  if (!isPlainSerializableObject(plainValue) || depth > 25) {
    return plainValue;
  }

  const result = {};

  Object.entries(plainValue).forEach(([key, nestedValue]) => {
    const camelKey = toCamelCaseKey(key);
    const transformedValue = toCamelCaseDeep(nestedValue, depth + 1);

    if (key === camelKey || !(camelKey in result)) {
      result[camelKey] = transformedValue;
    }
  });

  return result;
}

module.exports = {
  toCamelCaseKey,
  toCamelCaseDeep,
};
