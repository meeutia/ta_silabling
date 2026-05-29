export function camelToSnakeCase(key) {
  const text = String(key || '');

  if (/^[A-Z0-9_]+$/.test(text)) return text;

  return text
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase();
}

export function addSnakeCaseAliasesDeep(value, depth = 0) {
  if (Array.isArray(value)) {
    return value.map((item) => addSnakeCaseAliasesDeep(item, depth + 1));
  }

  if (!value || typeof value !== 'object' || depth > 25) {
    return value;
  }

  const result = {};

  Object.entries(value).forEach(([key, nestedValue]) => {
    const normalizedValue = addSnakeCaseAliasesDeep(nestedValue, depth + 1);
    result[key] = normalizedValue;

    const snakeKey = camelToSnakeCase(key);
    if (snakeKey !== key && !(snakeKey in result)) {
      result[snakeKey] = normalizedValue;
    }
  });

  return result;
}
