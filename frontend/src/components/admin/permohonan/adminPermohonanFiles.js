import { buildApiFileUrl } from '../../../utils/secureFileUrl';

export function buildFileUrl(filePath, _apiBase = '') {
  return buildApiFileUrl(filePath);
}

export function openFileInNewTab(filePath, apiBase = '') {
  const fileUrl = buildFileUrl(filePath, apiBase);
  if (!fileUrl) return;
  window.open(fileUrl, '_blank', 'noopener,noreferrer');
}
