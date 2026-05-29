import { API_BASE } from './api';

export function isExternalFileUrl(value = '') {
  return /^https?:\/\//i.test(String(value || ''));
}

export function isBrowserFileUrl(value = '') {
  return /^(blob:|data:)/i.test(String(value || ''));
}

export function buildApiFileUrl(value = '') {
  const text = String(value || '').trim();

  if (!text) return '';
  if (isBrowserFileUrl(text)) return text;

  const baseUrl = String(API_BASE || '').replace(/\/$/, '');

  if (isExternalFileUrl(text)) {
    try {
      const incoming = new URL(text);
      const api = new URL(baseUrl);
      const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(incoming.hostname);
      const isApiHost = incoming.host === api.host;

      if (isLocalhost || isApiHost) {
        return `${baseUrl}${incoming.pathname}${incoming.search}${incoming.hash}`;
      }
    } catch {
      return text;
    }

    return text;
  }

  const path = text.startsWith('/') ? text : `/${text}`;

  return `${baseUrl}${path}`;
}

export function pickFirstFileValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }

  return '';
}

export function getSecureFilePath(file = {}) {
  if (typeof file === 'string') return file;

  return pickFirstFileValue(
    file.downloadUrl,
    file.download_url,
    file.secureUrl,
    file.secure_url,
    file.url,
    file.path,
    file.filePath,
    file.file_path
  );
}

export function getDownloadFilePath(file = {}) {
  if (typeof file === 'string') return file;

  return pickFirstFileValue(
    file.downloadUrl,
    file.download_url,
    file.secureUrl,
    file.secure_url,
    file.url,
    file.path,
    file.filePath,
    file.file_path
  );
}

export function buildSecureFileUrl(fileOrPath = '') {
  return buildApiFileUrl(getSecureFilePath(fileOrPath));
}

export function buildDownloadFileUrl(fileOrPath = '') {
  return buildApiFileUrl(getDownloadFilePath(fileOrPath));
}

export function getLegacyFilePath(file = {}) {
  if (typeof file === 'string') return file;

  return pickFirstFileValue(
    file.path,
    file.filePath,
    file.file_path,
    file.originalPath,
    file.original_path,
    file.file_lhu_original_path,
    file.fileLhuOriginalPath,
    file.file_invoice_original_path,
    file.fileInvoiceOriginalPath
  );
}
