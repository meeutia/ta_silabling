const { Op } = require('sequelize');
const { verifyFileAccessToken } = require('../utils/file-access-token.util');
const { resolveScopedFile } = require('../utils/file-security.util');
const { Lhu } = require('../models/Associations');
const lhuPdfService = require('./lhu/lhu-pdf.service');

class FileService {
  normalizePathCandidates(rawPath = '') {
    const value = String(rawPath || '').trim();
    if (!value) return [];

    const withoutLeadingSlash = value.replace(/^\/+/, '');
    const withLeadingSlash = withoutLeadingSlash ? `/${withoutLeadingSlash}` : value;

    return Array.from(new Set([value, withLeadingSlash, withoutLeadingSlash].filter(Boolean)));
  }

  async regenerateLhuFileIfMissing(rawPath = '') {
    const candidates = this.normalizePathCandidates(rawPath);
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

  shouldTryRegenerateLhuFile(scope, error) {
    return (
      scope === 'lhu' &&
      (error?.statusCode === 404 || String(error?.message || '').toLowerCase().includes('file tidak ditemukan'))
    );
  }

  async resolveSignedFile({ scope, token, tokenScope }) {
    const requestData = verifyFileAccessToken(token, tokenScope || scope);

    try {
      return resolveScopedFile(scope, requestData.path);
    } catch (resolveError) {
      if (!this.shouldTryRegenerateLhuFile(scope, resolveError)) {
        throw resolveError;
      }

      const regeneratedPath = await this.regenerateLhuFileIfMissing(requestData.path);
      return resolveScopedFile(scope, regeneratedPath || requestData.path);
    }
  }
}

module.exports = new FileService();
module.exports.FileService = FileService;
