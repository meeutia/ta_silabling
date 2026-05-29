const pickupService = require('../services/lhu/lhu-pickup.service');

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

  return res.status(error.statusCode || 400).json({
    success: false,
    message: error.message || fallbackMessage,
  });
}

async function getPickupQueue(req, res) {
  try {
    const data = await pickupService.getPickupQueue();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat antrean pengambilan LHU.');
  }
}

async function schedulePickup(req, res) {
  try {
    const currentNik = getCurrentNik(req);

    if (!currentNik) {
      return res.status(401).json({
        success: false,
        message: 'User admin tidak valid. Silakan login ulang.',
      });
    }

    const idRegistrasi = requireValue(
      req.body?.idRegistrasi || req.body?.id_registrasi,
      'ID registrasi wajib dikirim.'
    );

    const tanggalPengambilan = requireValue(
      req.body?.tanggalPengambilan || req.body?.tanggal_pengambilan,
      'Tanggal pengambilan wajib diisi.'
    );

    const jamPengambilan = requireValue(
      req.body?.jamPengambilan || req.body?.jam_pengambilan,
      'Jam pengambilan wajib diisi.'
    );
    const catatan = req.body?.catatan || null;

    const data = await pickupService.schedulePickup(
      {
        idRegistrasi,
        tanggalPengambilan,
        jamPengambilan,
        catatan,
      },
      currentNik
    );

    return res.json({
      success: true,
      message: 'Jadwal pengambilan LHU berhasil disimpan.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal menyimpan jadwal pengambilan LHU.');
  }
}

async function completePickup(req, res) {
  try {
    const currentNik = getCurrentNik(req);

    if (!currentNik) {
      return res.status(401).json({
        success: false,
        message: 'User admin tidak valid. Silakan login ulang.',
      });
    }

    const idRegistrasi = requireValue(
      req.body?.idRegistrasi || req.body?.id_registrasi,
      'ID registrasi wajib dikirim.'
    );

    const namaPengambil = requireValue(
      req.body?.namaPengambil || req.body?.nama_pengambil,
      'Nama pengambil wajib diisi.'
    );

    const data = await pickupService.completePickup(
      {
        idRegistrasi,
        namaPengambil,
      },
      currentNik
    );

    return res.json({
      success: true,
      message: 'Pengambilan LHU berhasil ditandai.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'Gagal menandai pengambilan LHU.');
  }
}

module.exports = {
  getPickupQueue,
  schedulePickup,
  completePickup,
};
