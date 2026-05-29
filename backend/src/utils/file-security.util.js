const fs = require('fs');
const path = require('path');

const ROOTS = {
  worksheet: [
    path.join(process.cwd(), 'uploads', 'worksheets'),
    path.join(process.cwd(), 'public', 'worksheets'),
  ],
  lhu: [path.join(process.cwd(), 'public', 'lhu')],
  invoice: [path.join(process.cwd(), 'public', 'invoices')],
};

const PREFIXES = {
  worksheet: ['worksheets/', 'uploads/worksheets/', '/worksheets/', '/uploads/worksheets/'],
  lhu: ['lhu/', '/lhu/'],
  invoice: ['invoices/', '/invoices/'],
};

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function normalizeRequestPath(rawPath = '') {
  const value = String(rawPath || '').trim();

  if (!value) return '';

  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value).pathname;
    }
  } catch {
    return value;
  }

  return value;
}

function cleanScopedRelativePath(scope, rawPath = '') {
  let relativePath = normalizeRequestPath(rawPath)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  for (const prefix of PREFIXES[scope] || []) {
    const normalizedPrefix = prefix.replace(/^\/+/, '');
    if (relativePath.startsWith(normalizedPrefix)) {
      relativePath = relativePath.slice(normalizedPrefix.length);
      break;
    }
  }

  const parts = relativePath.split('/').filter(Boolean);

  if (!parts.length || parts.some((part) => part === '..' || part === '.')) {
    const error = new Error('Path file tidak valid.');
    error.statusCode = 400;
    throw error;
  }

  return parts.join('/');
}

function isInsideRoot(candidate, root) {
  const relative = path.relative(root, candidate);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolveScopedFile(scope, rawPath = '') {
  const roots = ROOTS[scope] || [];
  const relativePath = cleanScopedRelativePath(scope, rawPath);

  for (const root of roots) {
    const safeRoot = path.resolve(root);
    const candidate = path.resolve(safeRoot, relativePath);

    if (isInsideRoot(candidate, safeRoot) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return {
        absolutePath: candidate,
        relativePath,
        fileName: path.basename(candidate),
        ext: path.extname(candidate).toLowerCase(),
      };
    }
  }

  const error = new Error('File tidak ditemukan.');
  error.statusCode = 404;
  throw error;
}

function getContentType(filePath) {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function sendFileResponse(res, fileInfo, options = {}) {
  const disposition = options.download ? 'attachment' : 'inline';
  const fileName = options.fileName || fileInfo.fileName || path.basename(fileInfo.absolutePath);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('Content-Type', getContentType(fileInfo.absolutePath));
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileName)}"`);

  // Header global app memakai X-Frame-Options: DENY. Untuk preview PDF/gambar
  // di iframe frontend, header itu harus dilepas khusus di response file aman.
  if (!options.download) {
    res.removeHeader('X-Frame-Options');

    const frontendOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const frameAncestors = ["'self'", ...frontendOrigins].join(' ');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
  }

  return res.sendFile(fileInfo.absolutePath);
}

function getFileNameFromPath(rawPath = '') {
  const normalized = normalizeRequestPath(rawPath).replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop() || '';
}

module.exports = {
  cleanScopedRelativePath,
  getFileNameFromPath,
  resolveScopedFile,
  sendFileResponse,
};
