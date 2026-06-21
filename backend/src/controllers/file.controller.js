const { sendFileResponse } = require('../utils/file-security.util');
const { errorResponse } = require('../utils/response');
const fileService = require('../services/file.service');

class FileController {
  constructor(service = fileService) {
    this.fileService = service;
  }

  openSignedFile = (scope, tokenScope) => {
    return async (req, res) => {
      try {
        const fileInfo = await this.fileService.resolveSignedFile({
          scope,
          tokenScope,
          token: req.query.token,
        });

        return sendFileResponse(res, fileInfo, {
          download: req.query.download === '1',
        });
      } catch (error) {
        return errorResponse(res, error.message || 'Gagal membuka file.', error.statusCode || 400);
      }
    };
  };

  openWorksheet = this.openSignedFile('worksheet');

  openLhu = this.openSignedFile('lhu');

  openInvoice = this.openSignedFile('invoice');
}

module.exports = new FileController();
module.exports.FileController = FileController;
