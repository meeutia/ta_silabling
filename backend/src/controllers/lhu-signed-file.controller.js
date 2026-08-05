const LhuSignedFileService = require('../services/lhu/lhu-signed-file.service');
const fs = require('fs');

class LhuSignedFileController {
  upload = async (req, res) => {
    try {
      const { nomorLhu } = req.params;
      const { confirmedSignedByKalab } = req.body;
      const userNik = req.user?.nik || req.user?.id || req.user?.id_user;

      const uploadedFile = (req.files?.file && req.files.file[0]) ||
                           (req.files?.signedLhuFile && req.files.signedLhuFile[0]) ||
                           (req.files?.lhuFile && req.files.lhuFile[0]);

      const result = await LhuSignedFileService.uploadSignedFile({
        nomorLhu,
        uploadedFile,
        confirmedSignedByKalab,
        adminNik: userNik,
      });

      return res.status(201).json({
        success: true,
        message: 'LHU bertanda tangan berhasil diunggah.',
        data: result,
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Terjadi kesalahan saat mengunggah LHU bertanda tangan.',
      });
    }
  };

  replace = async (req, res) => {
    try {
      const { nomorLhu } = req.params;
      const { confirmedSignedByKalab } = req.body;
      const userNik = req.user?.nik || req.user?.id || req.user?.id_user;

      const uploadedFile = (req.files?.file && req.files.file[0]) ||
                           (req.files?.signedLhuFile && req.files.signedLhuFile[0]) ||
                           (req.files?.lhuFile && req.files.lhuFile[0]);

      const result = await LhuSignedFileService.replaceSignedFile({
        nomorLhu,
        uploadedFile,
        confirmedSignedByKalab,
        adminNik: userNik,
      });

      return res.status(200).json({
        success: true,
        message: 'LHU bertanda tangan berhasil diperbarui.',
        data: result,
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Terjadi kesalahan saat mengganti LHU bertanda tangan.',
      });
    }
  };

  open = async (req, res) => {
    try {
      const { nomorLhu } = req.params;
      const userNik = req.user?.nik || req.user?.id || req.user?.id_user;
      const role = req.user?.id_role || req.user?.role;

      const fileData = await LhuSignedFileService.resolveSignedFileForAccess(nomorLhu, userNik, role);

      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileData.originalName}"`);

      const fileStream = fs.createReadStream(fileData.absolutePath);

      fileStream.on('error', (err) => {
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Gagal membaca file fisik LHU bertanda tangan.',
          });
        }
      });

      fileStream.pipe(res);
    } catch (error) {
      if (error.code === 'SIGNED_LHU_ACCESS_DENIED') {
        return res.status(403).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }
      return res.status(error.status || 500).json({
        success: false,
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Terjadi kesalahan saat mengakses LHU bertanda tangan.',
      });
    }
  };
}

module.exports = new LhuSignedFileController();
