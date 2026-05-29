const { createFileAccessToken } = require('./file-access-token.util');

const SCOPE_BY_PREFIX = [
  { prefix: '/worksheets/', scope: 'worksheet', route: '/files/worksheet' },
  { prefix: '/uploads/worksheets/', scope: 'worksheet', route: '/files/worksheet' },
  { prefix: '/lhu/', scope: 'lhu', route: '/files/lhu' },
  { prefix: '/invoices/', scope: 'invoice', route: '/files/invoice' },
];

function normalizeFilePath(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';

  try {
    if (/^https?:\/\//i.test(text)) {
      return new URL(text).pathname;
    }
  } catch {
    return text;
  }

  return text.startsWith('/') ? text : `/${text}`;
}

function getFileScopeConfig(value = '') {
  const normalized = normalizeFilePath(value);
  return SCOPE_BY_PREFIX.find((item) => normalized.startsWith(item.prefix)) || null;
}

function buildSignedFileUrl(filePath, options = {}) {
  const normalized = normalizeFilePath(filePath);
  const config = getFileScopeConfig(normalized);

  if (!normalized || !config) return filePath || '';

  const token = createFileAccessToken({
    scope: config.scope,
    path: normalized,
    expiresInSeconds: options.expiresInSeconds || 10 * 60,
    meta: options.meta || {},
  });

  return `${config.route}?token=${encodeURIComponent(token)}${options.download ? '&download=1' : ''}`;
}

function secureKnownFileFields(value) {
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value;

  if (Array.isArray(value)) {
    return value.map(secureKnownFileFields);
  }

  const cloned = { ...value };

  const fieldPairs = [
    ['file_lhu_path', 'file_lhu_original_path'],
    ['fileLhuPath', 'fileLhuOriginalPath'],
    // legacy payment proof fields removed
    ['file_invoice_path', 'file_invoice_original_path'],
    ['fileInvoicePath', 'fileInvoiceOriginalPath'],
  ];

  for (const [field, originalField] of fieldPairs) {
    if (typeof cloned[field] === 'string' && getFileScopeConfig(cloned[field])) {
      cloned[originalField] = cloned[field];
      cloned[field] = buildSignedFileUrl(cloned[field]);
    }
  }

  Object.keys(cloned).forEach((key) => {
    if (cloned[key] && typeof cloned[key] === 'object') {
      cloned[key] = secureKnownFileFields(cloned[key]);
    }
  });

  return cloned;
}

module.exports = {
  buildSignedFileUrl,
  getFileScopeConfig,
  normalizeFilePath,
  secureKnownFileFields,
};
