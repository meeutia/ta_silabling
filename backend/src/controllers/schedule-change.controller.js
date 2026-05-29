const scheduleChangeService = require('../services/schedule/schedule-change.service');

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

async function confirmScheduleApproval(req, res) {
  try {
    const data = await scheduleChangeService.confirmScheduleApproval(
      { ...(req.body || {}), idRegistrasi: req.params?.id },
      getCurrentNik(req)
    );
    return res.json({ success: true, message: 'Persetujuan jadwal berhasil disimpan.', data });
  } catch (error) {
    return handleError(res, error, 'Gagal menyimpan persetujuan jadwal.');
  }
}

async function createScheduleChangeRequest(req, res) {
  try {
    const data = await scheduleChangeService.createScheduleChangeRequest(req.body || {}, getCurrentNik(req));
    return res.status(201).json({ success: true, message: 'Pengajuan perubahan jadwal berhasil dikirim.', data });
  } catch (error) {
    return handleError(res, error, 'Gagal mengirim pengajuan perubahan jadwal.');
  }
}

async function listScheduleChangeRequests(req, res) {
  try {
    const data = await scheduleChangeService.listScheduleChangeRequests({
      status: req.query?.status,
      jenisJadwal: req.query?.jenisJadwal || req.query?.jenis_jadwal,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, 'Gagal memuat pengajuan perubahan jadwal.');
  }
}

async function decideScheduleChangeRequest(req, res) {
  try {
    const data = await scheduleChangeService.decideScheduleChangeRequest(
      req.params?.idPengajuan || req.body?.idPengajuanJadwal || req.body?.id_pengajuan_jadwal,
      req.body || {},
      getCurrentNik(req)
    );
    return res.json({ success: true, message: 'Pengajuan perubahan jadwal berhasil diproses.', data });
  } catch (error) {
    return handleError(res, error, 'Gagal memproses pengajuan perubahan jadwal.');
  }
}

async function cancelScheduleChangeRequest(req, res) {
  try {
    const data = await scheduleChangeService.cancelScheduleChangeRequest(
      req.params?.idPengajuan,
      getCurrentNik(req),
      req.user?.id_role
    );
    return res.json({ success: true, message: 'Pengajuan perubahan jadwal berhasil dibatalkan.', data });
  } catch (error) {
    return handleError(res, error, 'Gagal membatalkan pengajuan perubahan jadwal.');
  }
}

module.exports = {
  confirmScheduleApproval,
  createScheduleChangeRequest,
  listScheduleChangeRequests,
  decideScheduleChangeRequest,
  cancelScheduleChangeRequest,
};
