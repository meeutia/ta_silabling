const lhuService = require('../services/lhu/lhu.service');
const notificationService = require('../services/notification/notification.service');
const { secureKnownFileFields } = require('../utils/file-url.util');

function requireValue(value, message) {
  if (!value || !String(value).trim()) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  return String(value).trim();
}

function getCurrentNik(req) {
  return req.user?.nik || req.user?.id || req.user?.id_user || null;
}

function handleError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);

  const isDatabaseError = Boolean(error?.name && String(error.name).includes('Sequelize'));
  const statusCode = error.statusCode || (isDatabaseError ? 500 : 400);
  const sqlMessage = error?.parent?.sqlMessage || error?.original?.sqlMessage;
  const message = error.message || sqlMessage || fallbackMessage;

  return res.status(statusCode).json({
    success: false,
    message,
    errorCode: error?.name || undefined,
    detail: process.env.NODE_ENV === 'production' ? undefined : sqlMessage,
  });
}

function hideCustomerInfo(data) {
  if (!data || typeof data !== 'object') return data;

  const cloned = { ...data };

  delete cloned.pelanggan;
  delete cloned.pemohon;
  delete cloned.customer;

  if (cloned.lhu) {
    cloned.lhu = { ...cloned.lhu };

    delete cloned.lhu.id_pelanggan;
    delete cloned.lhu.nama_pelanggan;
    delete cloned.lhu.alamat_pelanggan;
    delete cloned.lhu.pic_pelanggan;
    delete cloned.lhu.telp_pelanggan;
    delete cloned.lhu.email_pelanggan;
    delete cloned.lhu.nama_instansi;
    delete cloned.lhu.pic;
    delete cloned.lhu.no_telp;
    delete cloned.lhu.email_kontak;
    delete cloned.lhu.alamat;
  }

  return cloned;
}

/**
 * Pengendalian Mutu - Finalisasi LHU.
 * Nomor LHU baru dibuat saat tahap ini.
 */

async function getFinalizationQueue(req, res) {
  try {
    const data = await lhuService.getFinalizationQueue();

    return res.json({
      success: true,
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat antrean finalisasi LHU.');
  }
}

async function getFinalizationDetail(req, res) {
  try {
    const identifier = requireValue(
      req.query.idRegistrasi || req.query.id_registrasi || req.query.noSampel || req.query.no_sampel,
      'ID registrasi atau nomor sampel wajib dikirim.'
    );

    const data = await lhuService.getFinalizationDetail(identifier);

    return res.json({
      success: true,
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat detail finalisasi LHU.');
  }
}

async function getPaketBmOptions(req, res) {
  try {
    const identifier = requireValue(
      req.query.idRegistrasi || req.query.id_registrasi || req.query.noSampel || req.query.no_sampel,
      'ID registrasi atau nomor sampel wajib dikirim.'
    );

    const data = await lhuService.getPaketBmOptions(identifier);

    return res.json({
      success: true,
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat paket baku mutu.');
  }
}

async function getPersonelOptions(req, res) {
  try {
    const data = await lhuService.getPersonelOptions();

    return res.json({
      success: true,
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat daftar personel.');
  }
}

async function previewFinalization(req, res) {
  try {
    const identifier = requireValue(
      req.query.idRegistrasi || req.query.id_registrasi || req.query.noSampel || req.query.no_sampel,
      'ID registrasi atau nomor sampel wajib dikirim.'
    );

    const idPktBm = requireValue(
      req.query.idPktBm || req.query.id_pkt_bm,
      'Paket baku mutu wajib dipilih.'
    );

    const data = await lhuService.previewFinalization(identifier, idPktBm, req.query.sampleNos || req.query.sample_nos);

    return res.json({
      success: true,
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal membuat preview finalisasi LHU.');
  }
}

async function finalizeLhu(req, res) {
  try {
    const currentNik = getCurrentNik(req);

    if (!currentNik) {
      return res.status(401).json({
        success: false,
        message: 'User Pengendalian Mutu tidak valid. Silakan login ulang.',
      });
    }

    const identifier = requireValue(
      req.body.idRegistrasi || req.body.id_registrasi || req.body.noSampel || req.body.no_sampel || (Array.isArray(req.body.sampleNos) ? req.body.sampleNos[0] : ''),
      'ID registrasi atau daftar sampel wajib dikirim.'
    );

    requireValue(req.body.idPktBm || req.body.id_pkt_bm, 'Paket baku mutu wajib dipilih.');

    const data = await lhuService.finalizeLhu(
      identifier,
      req.body,
      currentNik
    );

    try {
      await notificationService.notifyLhuNeedsKalabApproval({
        nomorLhu: data?.nomorLhu || data?.nomor_lhu,
      });
    } catch (notificationError) {
      console.error('Gagal kirim notifikasi LHU ke Kalab:', notificationError);
    }

    return res.json({
      success: true,
      message: 'LHU berhasil dibuat, PDF draft dibuat, dan dikirim ke Kepala Lab.',
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal finalisasi LHU.');
  }
}

/**
 * Detail LHU Internal.
 */

async function getLhuDetail(req, res) {
  try {
    const nomorLhu = requireValue(
      req.query.nomorLhu,
      'Nomor LHU wajib dikirim.'
    );

    const data = await lhuService.getLhuDetail(nomorLhu);

    return res.json({
      success: true,
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat detail LHU.');
  }
}

/**
 * Endpoint lama Kasi Pengujian LHU.
 * Alur baru: Kasi Pengujian review hasil sampel lewat assignment.
 */

async function getKasiPengujianQueue(req, res) {
  return res.status(410).json({
    success: false,
    message:
      'Antrean Kasi Pengujian LHU sudah tidak digunakan. Gunakan endpoint /assignments/kasi-review/queue.',
  });
}

async function approveKasiPengujian(req, res) {
  return res.status(410).json({
    success: false,
    message:
      'Approval Kasi Pengujian LHU sudah tidak digunakan. Gunakan endpoint /assignments/kasi-review/approve.',
  });
}

async function reviseKasiPengujian(req, res) {
  return res.status(410).json({
    success: false,
    message:
      'Revisi Kasi Pengujian LHU sudah tidak digunakan. Gunakan endpoint /assignments/kasi-review/revise.',
  });
}

async function getFinalizationHistory(req, res) {
  try {
    const data = await lhuService.getFinalizationHistory();

    return res.json({
      success: true,
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat riwayat finalisasi LHU.');
  }
}

async function getKalabApprovalQueue(req, res) {
  try {
    const data = await lhuService.getKalabApprovalQueue();

    return res.json({
      success: true,
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat antrean persetujuan Kepala Lab.');
  }
}

async function approveByKalab(req, res) {
  try {
    const currentNik = getCurrentNik(req);

    if (!currentNik) {
      return res.status(401).json({
        success: false,
        message: 'User Kepala Lab tidak valid. Silakan login ulang.',
      });
    }

    const nomorLhu = requireValue(
      req.body.nomorLhu ||
        req.body.nomor_lhu ||
        req.query.nomorLhu ||
        req.query.nomor_lhu ||
        req.params.nomorLhu ||
        req.params.nomor_lhu,
      'Nomor LHU wajib dikirim.'
    );

    const data = await lhuService.approveByKalab(nomorLhu, currentNik);

    try {
      await notificationService.notifyAdminWhenRequestLhusComplete({ nomorLhu: data?.nomor_lhu || data?.nomorLhu || nomorLhu });
    } catch (notifyError) {
      console.error('notifyAdminWhenRequestLhusComplete approveByKalab error:', notifyError);
    }

    return res.json({
      success: true,
      message: 'LHU berhasil disahkan dan PDF final berhasil dibuat.',
      data: secureKnownFileFields(data),
    });
  } catch (error) {
    return handleError(res, error, 'Gagal menyetujui LHU.');
  }
}

module.exports = {
  getFinalizationQueue,
  getFinalizationDetail,
  getPaketBmOptions,
  getPersonelOptions,
  previewFinalization,
  finalizeLhu,

  getLhuDetail,

  getKasiPengujianQueue,
  approveKasiPengujian,
  reviseKasiPengujian,
  getFinalizationHistory,
  getKalabApprovalQueue,
  approveByKalab,

};