const fs = require('fs');
const path = require('path');
const lhuPdfService = require('./lhu-pdf.service');
const { Lhu } = require('../../models/Associations');

const PUBLIC_LHU_DIR = path.join(__dirname, '../../../public', 'lhu');

function normalizeStoredLhuPath(rawPath = '') {
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

function resolveStoredLhuAbsolutePath(rawPath = '') {
  let relativePath = normalizeStoredLhuPath(rawPath)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (!relativePath) return null;

  if (relativePath.startsWith('lhu/')) {
    relativePath = relativePath.slice('lhu/'.length);
  }

  const parts = relativePath.split('/').filter(Boolean);

  if (!parts.length || parts.some((part) => part === '..' || part === '.')) {
    return null;
  }

  const root = path.resolve(PUBLIC_LHU_DIR);
  const candidate = path.resolve(root, parts.join('/'));
  const rel = path.relative(root, candidate);

  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }

  return candidate;
}

function isStoredLhuFileAvailable(rawPath = '') {
  const absolutePath = resolveStoredLhuAbsolutePath(rawPath);
  return Boolean(absolutePath && fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile());
}

async function ensureLhuPdfFile(lhuRow = {}, transaction = null) {
  const lhu = { ...(lhuRow || {}) };
  const nomorLhu = lhu.nomor_lhu || lhu.nomorLhu;

  if (!nomorLhu) return lhu;

  if (lhu.file_lhu_path && isStoredLhuFileAvailable(lhu.file_lhu_path)) {
    return lhu;
  }

  const status = String(lhu.status_lhu || lhu.statusLhu || '').toLowerCase();
  const generator = status.includes('disahkan')
    ? lhuPdfService.generateFinalLhuPdf
    : lhuPdfService.generateDraftLhuPdf;

  const pdfResult = await generator(nomorLhu, transaction);

  if (pdfResult?.filePath && pdfResult.filePath !== lhu.file_lhu_path) {
    await Lhu.update(
      { file_lhu_path: pdfResult.filePath },
      { where: { nomor_lhu: nomorLhu }, transaction }
    );

    lhu.file_lhu_path = pdfResult.filePath;
    lhu.fileLhuPath = pdfResult.filePath;
  }

  return lhu;
}

module.exports = {
  ensureLhuPdfFile,
  isStoredLhuFileAvailable,
  normalizeStoredLhuPath,
  resolveStoredLhuAbsolutePath,
};
