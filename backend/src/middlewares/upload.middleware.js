const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { assertWorksheetFileSignature, assertPdfFileSignature } = require('../utils/file-signature.util');

/**
 * BASE DIR
 * Semua file upload disimpan di folder:
 * backend/uploads/...
 *
 * Pastikan di server/app.js ada:
 * app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
 */
const UPLOAD_ROOT_DIR = path.join(process.cwd(), 'uploads');

const WORKSHEET_DIR = path.join(UPLOAD_ROOT_DIR, 'worksheets');
const SIGNED_LHU_DIR = path.join(UPLOAD_ROOT_DIR, 'lhu-signed', 'temp');

fs.mkdirSync(WORKSHEET_DIR, { recursive: true });
fs.mkdirSync(SIGNED_LHU_DIR, { recursive: true });

const sanitizeFilenamePart = (value, fallback = 'file') => {
  return String(value || fallback)
    .replace(/[\\/:"*?<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 80)
    .trim() || fallback;
};

/**
 * =========================================================
 * WORKSHEET / LKA UPLOAD
 * =========================================================
 */
const worksheetAllowedExtensions = new Set([
  '.pdf',
  '.xls',
  '.xlsx',
  '.xlsm',
  '.csv',
  '.doc',
  '.docx',
]);

const worksheetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, WORKSHEET_DIR);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();

    const baseName = sanitizeFilenamePart(
      path.basename(file.originalname || 'worksheet', ext),
      'worksheet'
    );

    const safeDetailId = sanitizeFilenamePart(req.params?.idPenugasanDetail, 'detail');
    const safeUserId = sanitizeFilenamePart(req.user?.nik || req.user?.id || req.user?.id_user, 'user');

    const uniqueName = `worksheet_${safeDetailId}_${safeUserId}_${Date.now()}_${Math.round(
      Math.random() * 1e9
    )}_${baseName}${ext}`;

    cb(null, uniqueName);
  },
});

const uploadWorksheetFiles = multer({
  storage: worksheetStorage,
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (!worksheetAllowedExtensions.has(ext)) {
      return cb(
        new Error('File LKA harus berformat PDF, XLS, XLSX, XLSM, CSV, DOC, atau DOCX.')
      );
    }

    // Browser/WPS/LibreOffice kadang mengirim MIME Office sebagai application/zip,
    // application/octet-stream, atau bahkan kosong. Validasi utama tetap memakai
    // ekstensi + isi file pada validateWorksheetFileSignatures agar upload tidak
    // gagal hanya karena MIME dari browser tidak standar.
    return cb(null, true);
  },
});


const uploadWorksheetFileFields = (req, res, next) => {
  const uploader = uploadWorksheetFiles.fields([
    { name: 'files', maxCount: 10 },
    { name: 'worksheetFiles', maxCount: 10 },
    { name: 'file', maxCount: 10 },
    { name: 'worksheetFile', maxCount: 10 },
    { name: 'lkaFile', maxCount: 10 },
  ]);

  uploader(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Ukuran file worksheet maksimal 15 MB per file.',
        });
      }

      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Jumlah file worksheet maksimal 10 file.',
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message || 'Upload worksheet tidak valid.',
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'File worksheet tidak valid.',
    });
  });
};


const flattenUploadedFiles = (files, file) => {
  const rows = Array.isArray(files) ? [...files] : Object.values(files || {}).flat();
  if (file) rows.push(file);
  return rows.filter(Boolean);
};

const removeUploadedFiles = async (files = []) => {
  await Promise.all(
    files
      .map((file) => file?.path)
      .filter(Boolean)
      .map((filePath) => fs.promises.unlink(filePath).catch(() => null))
  );
};

const validateWorksheetFileSignatures = async (req, res, next) => {
  const uploadedFiles = flattenUploadedFiles(req.files, req.file);

  try {
    for (const file of uploadedFiles) {
      await assertWorksheetFileSignature(file.path, file.originalname || file.filename);
    }

    return next();
  } catch (error) {
    await removeUploadedFiles(uploadedFiles);

    return res.status(400).json({
      success: false,
      message: error.message || 'Isi file LKA tidak valid.',
    });
  }
};

module.exports = {
  uploadWorksheetFiles,
  uploadWorksheetFileFields,
  validateWorksheetFileSignatures,
};

/**
 * =========================================================
 * SIGNED LHU UPLOAD
 * =========================================================
 */

const signedLhuStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SIGNED_LHU_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeUserId = sanitizeFilenamePart(req.user?.nik || req.user?.id || 'admin', 'user');
    
    // random string
    const uniqueName = `temp-signed-lhu_${safeUserId}_${Date.now()}_${Math.round(
      Math.random() * 1e9
    )}${ext}`;

    cb(null, uniqueName);
  },
});

const uploadSignedLhu = multer({
  storage: signedLhuStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.pdf') {
      return cb(
        new Error('File LHU bertanda tangan harus berformat PDF.')
      );
    }
    return cb(null, true);
  },
});

const uploadSignedLhuFile = (req, res, next) => {
  const uploader = uploadSignedLhu.fields([
    { name: 'file', maxCount: 1 },
    { name: 'signedLhuFile', maxCount: 1 },
    { name: 'lhuFile', maxCount: 1 },
  ]);

  uploader(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          code: 'SIGNED_LHU_FILE_TOO_LARGE',
          message: 'Ukuran file LHU maksimal 10 MB.',
        });
      }

      return res.status(400).json({
        success: false,
        code: 'SIGNED_LHU_INVALID_FILE',
        message: error.message || 'Upload file LHU tidak valid.',
      });
    }

    return res.status(400).json({
      success: false,
      code: 'SIGNED_LHU_INVALID_FILE',
      message: error.message || 'File LHU tidak valid.',
    });
  });
};

const validateSignedLhuFileSignature = async (req, res, next) => {
  const uploadedFiles = flattenUploadedFiles(req.files, req.file);

  try {
    for (const file of uploadedFiles) {
      await assertPdfFileSignature(file.path);
    }

    return next();
  } catch (error) {
    await removeUploadedFiles(uploadedFiles);

    return res.status(400).json({
      success: false,
      code: 'SIGNED_LHU_INVALID_FILE',
      message: error.message || 'Isi file tidak sesuai dengan format PDF.',
    });
  }
};

const cleanupUploadedSignedLhuFile = async (req, res, next) => {
  // This can be used if you want an explicit cleanup middleware on error,
  // but generally cleanup is done within the service or on catch blocks.
  next();
};

module.exports = {
  uploadWorksheetFiles,
  uploadWorksheetFileFields,
  validateWorksheetFileSignatures,
  uploadSignedLhuFile,
  validateSignedLhuFileSignature,
  cleanupUploadedSignedLhuFile,
  removeUploadedFiles, // export for utility use
};