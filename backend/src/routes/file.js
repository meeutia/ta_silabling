const express = require('express');
const { Op } = require('sequelize');
const { verifyFileAccessToken } = require('../utils/file-access-token.util');
const { resolveScopedFile, sendFileResponse } = require('../utils/file-security.util');
const { errorResponse } = require('../utils/response');
const { Lhu } = require('../models/Associations');
const lhuPdfService = require('../services/lhu/lhu-pdf.service');

const router = express.Router();

function normalizePathCandidates(rawPath = '') {
  const value = String(rawPath || '').trim();
  if (!value) return [];

  const withoutLeadingSlash = value.replace(/^\/+/, '');
  const withLeadingSlash = withoutLeadingSlash ? `/${withoutLeadingSlash}` : value;

  return Array.from(new Set([value, withLeadingSlash, withoutLeadingSlash].filter(Boolean)));
}

async function regenerateLhuFileIfMissing(rawPath = '') {
  const candidates = normalizePathCandidates(rawPath);
  if (!candidates.length) return '';

  const lhuInstance = await Lhu.findOne({
    where: {
      file_lhu_path: {
        [Op.in]: candidates,
      },
    },
  });

  if (!lhuInstance) return '';

  const lhu = lhuInstance.get({ plain: true });
  const nomorLhu = lhu.nomor_lhu;
  if (!nomorLhu) return '';

  const status = String(lhu.status_lhu || '').toLowerCase();
  const generator = status.includes('disahkan')
    ? lhuPdfService.generateFinalLhuPdf
    : lhuPdfService.generateDraftLhuPdf;

  const pdfResult = await generator(nomorLhu);

  if (pdfResult?.filePath && pdfResult.filePath !== lhu.file_lhu_path) {
    await lhuInstance.update({ file_lhu_path: pdfResult.filePath });
  }

  return pdfResult?.filePath || lhu.file_lhu_path || '';
}

function shouldTryRegenerateLhuFile(scope, error) {
  return (
    scope === 'lhu' &&
    (error?.statusCode === 404 || String(error?.message || '').toLowerCase().includes('file tidak ditemukan'))
  );
}

function serveSignedFile(scope, tokenScope) {
  return async (req, res) => {
    try {
      const payload = verifyFileAccessToken(req.query.token, tokenScope || scope);
      let fileInfo;

      try {
        fileInfo = resolveScopedFile(scope, payload.path);
      } catch (resolveError) {
        if (!shouldTryRegenerateLhuFile(scope, resolveError)) {
          throw resolveError;
        }

        const regeneratedPath = await regenerateLhuFileIfMissing(payload.path);
        fileInfo = resolveScopedFile(scope, regeneratedPath || payload.path);
      }

      return sendFileResponse(res, fileInfo, {
        download: req.query.download === '1',
      });
    } catch (error) {
      return errorResponse(res, error.message || 'Gagal membuka file.', error.statusCode || 400);
    }
  };
}

router.get('/worksheet', serveSignedFile('worksheet'));
router.get('/lhu', serveSignedFile('lhu'));
router.get('/invoice', serveSignedFile('invoice'));

module.exports = router;
