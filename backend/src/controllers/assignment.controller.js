const path = require('path');

const assignmentService = require('../services/assignment.service');
const notificationService = require('../services/notification/notification.service');
const { previewWorksheetFile: buildWorksheetPreview } = require('../utils/worksheet-preview');
const { createFileAccessToken } = require('../utils/file-access-token.util');
const { secureKnownFileFields } = require('../utils/file-url.util');

function buildSignedWorksheetUrl(filePath, download = false, expiresInSeconds = 12 * 60 * 60) {
  const token = createFileAccessToken({
    scope: 'worksheet',
    path: filePath,
    expiresInSeconds,
  });

  return `/files/worksheet?token=${encodeURIComponent(token)}${download ? '&download=1' : ''}`;
}

function attachSignedWorksheetUrl(previewPayload, sourcePath) {
  if (!previewPayload || typeof previewPayload !== 'object') return previewPayload;

  const rawPath = sourcePath || previewPayload.url;

  if (!rawPath) return previewPayload;

  const signedUrl = buildSignedWorksheetUrl(rawPath);
  const signedDownloadUrl = buildSignedWorksheetUrl(rawPath, true);

  return {
    ...previewPayload,
    originalUrl: previewPayload.url || rawPath,
    url: previewPayload.url ? signedUrl : previewPayload.url,
    downloadUrl: signedDownloadUrl,
  };
}

function getCurrentNik(req) {
  return req.user?.nik || req.user?.id || req.user?.id_user || null;
}

function requireValue(value, message) {
  if (!value || !String(value).trim()) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  return String(value).trim();
}

function compactRevisionNotes(revisions = [], fallback = '') {
  const rows = Array.isArray(revisions) ? revisions : [];
  const notes = rows
    .map((item) => item?.catatanRevisi || item?.catatan_revisi || item?.catatan || '')
    .map((note) => String(note || '').trim())
    .filter(Boolean);

  if (notes.length > 0) {
    return Array.from(new Set(notes)).join('\n');
  }

  return String(fallback || '').trim();
}

function handleError(res, error, fallbackMessage, statusCode = 400) {
  console.error(fallbackMessage, error);

  return res.status(error.statusCode || statusCode).json({
    success: false,
    message: error.message || fallbackMessage,
  });
}

async function getAnalysts(req, res) {
  try {
    const data = await assignmentService.getAnalystOptions();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat analis.', 500);
  }
}

async function getPendingItems(req, res) {
  try {
    const data = await assignmentService.getPendingItems();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat item yang butuh penugasan.', 500);
  }
}

async function createAssignment(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const data = await assignmentService.createAssignment(req.body, currentUserNik);

    return res.status(201).json({
      success: true,
      message: 'Penugasan berhasil dibuat.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal membuat penugasan.');
  }
}


async function updateDetailDeadline(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const { idPenugasanDetail } = req.params;
    const tanggalTenggat =
      req.body?.tanggalTenggat ||
      req.body?.tanggal_tenggat ||
      req.body?.deadline ||
      null;

    const data = await assignmentService.updateAssignmentDetailDeadline(
      idPenugasanDetail,
      tanggalTenggat,
      currentUserNik
    );

    return res.json({
      success: true,
      message: 'Deadline penugasan berhasil diperbarui.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memperbarui deadline penugasan.');
  }
}

async function getMonitor(req, res) {
  try {
    const data = await assignmentService.getAssignmentMonitor();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat monitoring penugasan.', 500);
  }
}

async function getTestingOverview(req, res) {
  try {
    const data = await assignmentService.getTestingOverview();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat overview pengujian.', 500);
  }
}

async function getMyAssignments(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const data = await assignmentService.getMyAssignments(currentUserNik);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat tugas analis.', 500);
  }
}

async function getAssignmentWorkDetail(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const { idPenugasanDetail } = req.params;

    const data = await assignmentService.getAssignmentWorkDetail(
      idPenugasanDetail,
      currentUserNik
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat detail pekerjaan analis.');
  }
}

async function getLkaRevisionHistory(req, res) {
  try {
    const kodeLka = requireValue(
      req.params?.kodeLka || req.query?.kodeLka || req.query?.kode_lka,
      'Kode LKA wajib dikirim.'
    );

    const data = await assignmentService.getLkaRevisionHistory(kodeLka);

    return res.json({
      success: true,
      message: 'Riwayat revisi LKA berhasil dimuat.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat riwayat revisi LKA.');
  }
}

async function saveWorksheetDraft(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const { idPenugasanDetail } = req.params;

    const data = await assignmentService.saveWorksheetDraft(
      idPenugasanDetail,
      req.body,
      currentUserNik
    );

    return res.json({
      success: true,
      message: 'Worksheet draft tersimpan.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal menyimpan worksheet.');
  }
}

async function saveWorksheetResults(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const { idPenugasanDetail } = req.params;

    const data = await assignmentService.saveWorksheetResults(
      idPenugasanDetail,
      req.body,
      currentUserNik
    );

    return res.json({
      success: true,
      message: 'Hasil pengujian tersimpan.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal menyimpan hasil pengujian.');
  }
}

async function submitWorksheet(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const { idPenugasanDetail } = req.params;

    const data = await assignmentService.submitWorksheet(
      idPenugasanDetail,
      currentUserNik,
      req.body
    );

    return res.json({
      success: true,
      message: 'Worksheet berhasil dikirim.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal mengirim worksheet.');
  }
}

async function getReviewQueue(req, res) {
  try {
    const data = await assignmentService.getReviewQueue();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat review queue.', 500);
  }
}

async function getReviewDetail(req, res) {
  try {
    const { idPenugasanDetail } = req.params;
    const data = await assignmentService.getReviewDetail(idPenugasanDetail);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat detail review.');
  }
}

async function reviewWorksheet(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const { idPenugasanDetail } = req.params;

    const data = await assignmentService.reviewWorksheet(
      idPenugasanDetail,
      req.body,
      currentUserNik
    );

    if ((req.body?.action || '').toLowerCase() === 'approve' || data?.status === 'Disetujui') {
      try {
        await notificationService.notifyPenyeliaApproveKeKasi(idPenugasanDetail);
      } catch (notificationError) {
        console.error('Gagal kirim notifikasi LKA siap review ke Kasi Pengujian:', notificationError);
      }
    }

    return res.json({
      success: true,
      message: 'Review worksheet berhasil disimpan.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memproses review worksheet.');
  }
}

async function approveWorksheet(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const { idPenugasanDetail } = req.params;

    const data = await assignmentService.reviewWorksheet(
      idPenugasanDetail,
      { action: 'approve' },
      currentUserNik
    );

    try {
      await notificationService.notifyPenyeliaApproveKeKasi(idPenugasanDetail);
    } catch (notificationError) {
      console.error('Gagal kirim notifikasi LKA siap review ke Kasi Pengujian:', notificationError);
    }

    return res.json({
      success: true,
      message: 'Worksheet berhasil disetujui.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal menyetujui worksheet.');
  }
}

async function reviseWorksheet(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const { idPenugasanDetail } = req.params;

    const data = await assignmentService.reviewWorksheet(
      idPenugasanDetail,
      {
        action: 'revise',
        catatanRevisi: req.body?.catatanRevisi || req.body?.catatan_revisi || null,
        hasilTargets:
          req.body?.hasilTargets ||
          req.body?.hasil_targets ||
          req.body?.selectedTargets ||
          req.body?.selected_targets ||
          [],
        revisions:
          req.body?.catatanRevisiPerSampel ||
          req.body?.catatan_revisi_per_sampel ||
          req.body?.revisions ||
          req.body?.revisionItems ||
          req.body?.revision_items ||
          [],
        levelRevisi: req.body?.levelRevisi || req.body?.level_revisi || null,
      },
      currentUserNik
    );

    try {
      await notificationService.notifyRevisiPenyeliaKeAnalis({
        idPenugasanDetail,
        catatanRevisi: compactRevisionNotes(
          data?.revisions || req.body?.catatanRevisiPerSampel || req.body?.catatan_revisi_per_sampel || [],
          data?.catatanRevisi || data?.catatan_revisi || req.body?.catatanRevisi || req.body?.catatan_revisi || ''
        ),
        noSampel: data?.noSampel || data?.no_sampel || [],
      });
    } catch (notificationError) {
      console.error('Gagal kirim notifikasi revisi penyelia ke analis:', notificationError);
    }

    return res.json({
      success: true,
      message: 'Permintaan revisi berhasil dikirim.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal mengirim revisi.');
  }
}

async function getAssignmentDetailsByPenugasan(req, res) {
  try {
    const { idPenugasan } = req.params;
    const data = await assignmentService.getAssignmentDetailsByPenugasan(idPenugasan, {
      idPenugasanDetail:
        req.query?.idPenugasanDetail ||
        req.query?.id_penugasan_detail ||
        req.query?.detail ||
        '',
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat detail penugasan.', error.statusCode || 400);
  }
}

const WORKSHEET_DIR = path.join(process.cwd(), 'uploads', 'worksheets');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeRequestPath(rawPath = '') {
  const value = String(rawPath || '').trim();

  if (!value) return '';

  try {
    if (/^https?:\/\//i.test(value)) {
      const parsedUrl = new URL(value);
      return parsedUrl.pathname;
    }
  } catch {
    return value;
  }

  return value;
}

function resolveWorksheetAbsolutePath(rawPath = '') {
  const normalizedPath = normalizeRequestPath(rawPath);

  let relativePath = normalizedPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (relativePath.startsWith('worksheets/')) {
    relativePath = relativePath.replace(/^worksheets\//, '');
  }

  if (relativePath.startsWith('uploads/worksheets/')) {
    relativePath = relativePath.replace(/^uploads\/worksheets\//, '');
  }

  const absolutePath = path.resolve(WORKSHEET_DIR, relativePath);
  const allowedRoot = path.resolve(WORKSHEET_DIR);

  if (!absolutePath.startsWith(allowedRoot)) {
    throw new Error('Path file worksheet tidak valid.');
  }

  return {
    absolutePath,
    relativePath: relativePath.split('/').filter(Boolean).join('/'),
  };
}

function buildWorksheetPublicUrl(relativePath = '') {
  const safePath = relativePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `/worksheets/${safePath}`;
}

async function previewWorksheet(req, res) {
  try {
    const worksheetPath = req.query.path || '';

    await assignmentService.assertWorksheetFileAccess(worksheetPath, req.user);

    const data = await buildWorksheetPreview(worksheetPath);
    const securedData = attachSignedWorksheetUrl(data, worksheetPath);

    return res.json({
      success: true,
      data: securedData,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal membuat preview worksheet.');
  }
}

async function getWorksheetAccessUrl(req, res) {
  try {
    const worksheetPath = req.query.path || '';
    const download = req.query.download === '1';

    await assignmentService.assertWorksheetFileAccess(worksheetPath, req.user);

    return res.json({
      success: true,
      data: {
        path: worksheetPath,
        url: buildSignedWorksheetUrl(worksheetPath, download),
        downloadUrl: buildSignedWorksheetUrl(worksheetPath, true),
      },
    });
  } catch (error) {
    return handleError(res, error, 'Gagal membuat akses file worksheet.');
  }
}

async function uploadWorksheetFile(req, res) {
  try {
    const uploadedFiles = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();

    if (!uploadedFiles.length && req.file) {
      uploadedFiles.push(req.file);
    }

    if (!uploadedFiles.length) {
      return res.status(400).json({
        success: false,
        message: 'Minimal upload satu file LKA.',
      });
    }

    const files = uploadedFiles.map((file) => {
      const ext = path
        .extname(file.originalname || file.filename || '')
        .replace('.', '')
        .toLowerCase();

      const filePath = `/worksheets/${file.filename}`;

      return {
        path: filePath,
        originalName: file.originalname || file.filename,
        mimeType: file.mimetype || null,
        size: file.size || null,
        ext,
        uploadedAt: new Date().toISOString(),
        secureUrl: buildSignedWorksheetUrl(filePath),
        downloadUrl: buildSignedWorksheetUrl(filePath, true),
      };
    });

    return res.json({
      success: true,
      message: 'File LKA berhasil diupload.',
      data: {
        files,
        filePath: files[0]?.path || null,
      },
    });
  } catch (error) {
    return handleError(res, error, 'Gagal upload file LKA.');
  }
}

/**
 * Kasi Pengujian - Review hasil berdasarkan nomor sampel.
 * Nomor sampel mengandung slash, jadi approve/revise memakai body/query, bukan params.
 */

async function getKasiReviewQueue(req, res) {
  try {
    const data = await assignmentService.getKasiReviewQueue();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat antrean review Kasi Pengujian.', 500);
  }
}

async function getKasiReviewHistory(req, res) {
  try {
    const data = await assignmentService.getKasiReviewHistory();

    return res.json({
      success: true,
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat riwayat review Kasi Pengujian.', 500);
  }
}

async function getKasiReviewDetail(req, res) {
  try {
    const noSampel = requireValue(
      req.query.noSampel || req.body?.noSampel,
      'Nomor sampel wajib dikirim.'
    );

    const data = await assignmentService.getKasiReviewDetail(noSampel);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat detail review hasil.');
  }
}

async function approveKasiReview(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);

    if (!currentUserNik) {
      return res.status(401).json({
        success: false,
        message: 'User review tidak valid. Silakan login ulang.',
      });
    }

    const noSampel = requireValue(
      req.body?.noSampel || req.query.noSampel,
      'Nomor sampel wajib dikirim.'
    );

    const data = await assignmentService.approveKasiReview(
      noSampel,
      currentUserNik
    );

    return res.json({
      success: true,
      message: 'Hasil sampel berhasil disetujui Kasi Pengujian.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal menyetujui hasil sampel.');
  }
}

async function reviseKasiReview(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);

    if (!currentUserNik) {
      return res.status(401).json({
        success: false,
        message: 'User review tidak valid. Silakan login ulang.',
      });
    }

    const noSampel = requireValue(
      req.body?.noSampel || req.query.noSampel,
      'Nomor sampel wajib dikirim.'
    );

    const revisions = req.body?.revisions || req.body?.revisi || req.body?.revisionItems || req.body?.revision_items || null;
    const catatanRevisi = Array.isArray(revisions)
      ? null
      : requireValue(
          req.body?.catatanRevisi || req.body?.catatan_revisi || req.body?.catatan,
          'Catatan revisi wajib diisi.'
        );
    const hasilTargets = req.body?.hasilTargets || req.body?.hasil_targets || [];

    const data = await assignmentService.reviseKasiReview(
      noSampel,
      catatanRevisi,
      currentUserNik,
      hasilTargets,
      revisions
    );

    try {
      await notificationService.notifyRevisiKasiKePenyelia({
        noSampel,
        catatanRevisi: compactRevisionNotes(data?.revisions || revisions || [], data?.catatanRevisiHasil || catatanRevisi || ''),
        idPenugasanDetailList: data?.idPenugasanDetailList || [],
        revisions: data?.revisions || revisions || [],
      });
    } catch (error) {
      console.error('Gagal kirim email revisi Kasi Pengujian ke Penyelia:', error);
    }

    return res.json({
      success: true,
      message: 'Permintaan revisi hasil berhasil dikirim.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal mengirim revisi hasil.');
  }
}


async function getPendingKasiRevisionRequests(req, res) {
  try {
    const data = await assignmentService.getPendingKasiRevisionRequests();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat permintaan revisi Kasi yang menunggu penyelia.', 500);
  }
}

async function reviewKasiRevisionRequest(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);
    const { idRevisiLka } = req.params;

    const data = await assignmentService.reviewKasiRevisionRequest(
      idRevisiLka,
      req.body,
      currentUserNik
    );

    try {
      if (data?.action === 'approve') {
        await notificationService.notifyRevisiKasiPengujian({
          noSampel: data?.noSampel || data?.no_sampel,
          catatanRevisi: compactRevisionNotes(data?.revisions || [], data?.catatanRevisi || data?.catatan_revisi || ''),
          idPenugasanDetailList: data?.idPenugasanDetailList || data?.id_penugasan_detail_list || [],
        });
      } else {
        await notificationService.notifyRevisiKasiDitolakKeKasi({
          noSampel: data?.noSampel || data?.no_sampel,
          catatanTinjauan: data?.catatanTinjauan || data?.catatan_tinjauan || null,
          kasiNik: data?.diajukanOleh || data?.diajukan_oleh || null,
          idPenugasanDetailList: data?.idPenugasanDetailList || data?.id_penugasan_detail_list || [],
          items: data?.items || data?.revisions || [],
        });
      }
    } catch (notificationError) {
      console.error('Gagal kirim notifikasi hasil tinjauan revisi Kasi:', notificationError);
    }

    return res.json({
      success: true,
      message: 'Tinjauan revisi Kasi berhasil disimpan.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal meninjau revisi Kasi.');
  }
}

async function getSubkontrakItems(req, res) {
  try {
    const data = await assignmentService.getSubkontrakItems();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat item subkontrak.', 500);
  }
}

async function saveSubkontrakResults(req, res) {
  try {
    const currentUserNik = getCurrentNik(req);

    if (!currentUserNik) {
      return res.status(401).json({
        success: false,
        message: 'User tidak valid. Silakan login ulang.',
      });
    }

    const data = await assignmentService.saveSubkontrakResults(
      req.body,
      currentUserNik
    );

    // Send notification for pending subcontract items
    try {
      const pendingItems = await assignmentService.getSubkontrakItems();
      const itemsToNotify = pendingItems.filter(
        (item) =>
          item.status_hasil === 'Belum Diisi' ||
          item.statusHasil === 'Belum Diisi'
      );

      if (itemsToNotify.length > 0) {
        await notificationService.notifySubkontrakPerluDiisi(itemsToNotify);
      }
    } catch (notifError) {
      console.error('Error sending subcontract notification:', notifError);
      // Don't fail the save if notification fails
    }

    return res.json({
      success: true,
      message: 'Hasil subkontrak berhasil disimpan.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal menyimpan hasil subkontrak.');
  }
}

module.exports = {
  getAnalysts,
  getPendingItems,
  createAssignment,
  updateDetailDeadline,
  getMonitor,
  getTestingOverview,

  getMyAssignments,
  getAssignmentWorkDetail,
  getLkaRevisionHistory,
  saveWorksheetDraft,
  saveWorksheetResults,
  submitWorksheet,
  previewWorksheet,
  getWorksheetAccessUrl,

  getReviewQueue,
  getReviewDetail,
  reviewWorksheet,
  approveWorksheet,
  reviseWorksheet,

  getAssignmentDetailsByPenugasan,
  uploadWorksheetFile,

  getKasiReviewQueue,
  getKasiReviewHistory,
  getKasiReviewDetail,
  approveKasiReview,
  reviseKasiReview,
  getPendingKasiRevisionRequests,
  reviewKasiRevisionRequest,
  getSubkontrakItems,
  saveSubkontrakResults,
};