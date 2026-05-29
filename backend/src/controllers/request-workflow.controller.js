const RequestWorkflowService = require('../services/request/request-workflow.service');
const RequestService = require('../services/request/request.service');
const PaymentService = require('../services/payment/payment.service');
const assignmentService = require('../services/assignment.service');
const notificationService = require('../services/notification/notification.service');
const { successResponse, errorResponse } = require('../utils/response');

const verifyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, catatan, note, id_tarif_pengambilan } = req.body;
    const finalNote = catatan || note || null;

    const data = await RequestWorkflowService.verifyRequest(id, action, finalNote, id_tarif_pengambilan, req.user?.nik || null);

    try {
      await notificationService.notifyRequestStatusChanged({
        idRegistrasi: data?.id_registrasi || id,
        statusTerbaru: data?.status,
        catatanPetugas: data?.catatan_penolakan || finalNote || null,
      });
    } catch (notifyError) {
      console.error('notifyRequestStatusChanged verifyRequest error:', notifyError);
    }

    if (action === 'approve') {
      try {
        await notificationService.notifyKasiMetodePerluDitentukan({
          idRegistrasi: data?.id_registrasi || id,
        });
      } catch (notifyError) {
        console.error('notifyKasiMetodePerluDitentukan verifyRequest error:', notifyError);
      }
    }

    const msg = action === 'approve'
      ? 'Permohonan disetujui. Status diubah ke Menunggu Penentuan Metode.'
      : 'Permohonan ditolak.';

    return successResponse(res, msg, data);
  } catch (error) {
    console.error('verifyRequest error:', error);
    return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
  }
};

const getKasiRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await RequestService.getKasiRequestDetail(id);
    return successResponse(res, 'Detail permohonan berserta parameter', data);
  } catch (error) {
    console.error('getKasiRequestDetail error:', error);
    return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 404);
  }
};

const assignMethods = async (req, res) => {
  try {
    const { id } = req.params;
    const { selections } = req.body;
    const data = await RequestWorkflowService.assignMethods(id, selections, req.user.nik);

    try {
      await notificationService.notifyInvoiceReady({
        idRegistrasi: data?.id_registrasi || id,
      });
    } catch (notifyError) {
      console.error('notifyInvoiceReady assignMethods error:', notifyError);
    }

    return successResponse(res, 'Metode berhasil ditentukan. Permohonan dilanjutkan ke pembayaran.', data);
  } catch (error) {
    console.error('assignMethods error:', error);
    return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { alasan } = req.body;
    const data = await RequestWorkflowService.rejectRequest(id, alasan, req.user?.nik || null);

    try {
      await notificationService.notifyRequestStatusChanged({
        idRegistrasi: data?.id_registrasi || id,
        statusTerbaru: data?.status,
        catatanPetugas: data?.catatan_penolakan || alasan || null,
      });
    } catch (notifyError) {
      console.error('notifyRequestStatusChanged rejectRequest error:', notifyError);
    }

    return successResponse(res, 'Permohonan berhasil ditolak.');
  } catch (error) {
    console.error('rejectRequest error:', error);
    return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
  }
};

const getAnalystOptions = async (req, res) => {
  try {
    const data = await RequestService.getAnalystOptions();
    return successResponse(res, 'Berhasil mengambil daftar analis.', data);
  } catch (error) {
    console.error('getAnalystOptions error:', error);
    return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 500);
  }
};

const savePenyeliaAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignments } = req.body;

    const data = await RequestService.savePenyeliaAssignments(id, assignments, req.user.nik);

    return successResponse(res, 'Penugasan analis berhasil disimpan.', data);
  } catch (error) {
    console.error('savePenyeliaAssignments error:', error);
    return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
  }
};

const markDeferredPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const data = await PaymentService.markDeferredPaymentByAdmin(id, req.user.nik, note);

    try {
      await notificationService.notifyDeferredPaymentMarked({
        idRegistrasi: data?.id_registrasi || id,
        note,
      });
    } catch (notifyError) {
      console.error('notifyDeferredPaymentMarked markDeferredPayment error:', notifyError);
    }

    return successResponse(
      res,
      'Bayar Nanti berhasil dicatat. Permohonan dilanjutkan ke tahap penerimaan atau pengambilan sampel.',
      data
    );
  } catch (error) {
    console.error('markDeferredPayment error:', error);
    return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
  }
};

const saveSamplingSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tanggal_jadwal,
      jam_jadwal,
      scheduleDate,
      scheduleTime,
      tanggal,
      jam
    } = req.body;

    const data = await RequestWorkflowService.saveSamplingSchedule(
      id,
      tanggal_jadwal || scheduleDate || tanggal,
      jam_jadwal || scheduleTime || jam
    );

    const msg = data.actionType === 'created'
      ? 'Jadwal sampling berhasil disetujui.'
      : 'Jadwal sampling berhasil diperbarui.';

    return successResponse(res, msg, data);
  } catch (error) {
    console.error('saveSamplingSchedule error:', error);
    return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
  }
};

const createOrUpdateSamplingSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggalPengambilan, jamPengambilan, idPegawaiPcc } = req.body;

    const result = await RequestWorkflowService.createOrUpdateSamplingSchedule({
      idRegistrasi: id,
      tanggalPengambilan,
      jamPengambilan,
      idPegawaiPcc
    });

    try {
      await notificationService.notifyJadwalSampel({
        idRegistrasi: result?.id_registrasi || id,
        idJadwal: result?.jadwal?.id_jadwal || null,
      });
    } catch (notifyError) {
      console.error('notifyJadwalSampel createOrUpdateSamplingSchedule error:', notifyError);
    }

    const message =
      result.jenis_pengambilan_sampel === 'Mandiri'
        ? 'Jadwal pengantaran mandiri berhasil disimpan.'
        : 'Jadwal pengambilan oleh petugas berhasil disimpan.';

    return successResponse(res, message, result);
  } catch (error) {
    console.error('Create/update sampling schedule error:', error.message);
    console.error('Stack trace:', error.stack);

    const code =
      error.message.includes('tidak ditemukan') ? 404 :
      error.message.includes('tidak valid') ||
      error.message.includes('hari kerja') ||
      error.message.includes('format 24 jam') ||
      error.message.includes('wajib dipilih') ||
      error.message.includes('belum dapat dibuat')
        ? 400
        : 500;

    return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', code);
  }
};

const receiveSamplesAndGenerateCodes = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const sampels = Array.isArray(payload) ? payload : payload.sampels;
    const receivedByNik = req.user?.nik;

    if (!receivedByNik) {
      return errorResponse(res, 'User NIK tidak ditemukan.', 401);
    }

    const result = await RequestWorkflowService.receiveSamplesAndGenerateCodes(id, payload, receivedByNik);

    try {
      await notificationService.notifyRequestStatusChanged({
        idRegistrasi: result?.id_registrasi || id,
        statusTerbaru: result?.status,
        catatanPetugas: null,
      });
    } catch (notifyError) {
      console.error('notifyRequestStatusChanged receiveSamplesAndGenerateCodes error:', notifyError);
    }

    try {
      await notificationService.notifyPenyeliaPenugasanSampelMasuk({
        idRegistrasi: result?.id_registrasi || id,
        samples: result?.sampels || result?.samples || [],
      });
    } catch (notifyError) {
      console.error('notifyPenyeliaPenugasanSampelMasuk receiveSamplesAndGenerateCodes error:', notifyError);
    }

    try {
      const receivedSampleNos = new Set(
        (result?.sampels || result?.samples || [])
          .map((sample) => sample?.no_sampel || sample?.noSampel)
          .filter(Boolean)
      );

      if (receivedSampleNos.size > 0) {
        const pendingSubkontrakItems = await assignmentService.getSubkontrakItems();
        const itemsToNotify = pendingSubkontrakItems.filter((item) => {
          const noSampel = item.no_sampel || item.noSampel;
          const statusHasil = item.status_hasil || item.statusHasil;

          return receivedSampleNos.has(noSampel) && statusHasil === 'Belum Diisi';
        });

        if (itemsToNotify.length > 0) {
          await notificationService.notifySubkontrakPerluDiisi(itemsToNotify);
        }
      }
    } catch (notifyError) {
      console.error('notifySubkontrakPerluDiisi receiveSamplesAndGenerateCodes error:', notifyError);
    }

    return successResponse(res, 'Sampel berhasil diterima dan kode sampel berhasil digenerate.', result);
  } catch (error) {
    console.error('receiveSamplesAndGenerateCodes error:', error.message);
    return errorResponse(res, error.message || 'Internal server error.', 400);
  }
};

module.exports = {
  verifyRequest,
  getKasiRequestDetail,
  assignMethods,
  rejectRequest,
  markDeferredPayment,
  saveSamplingSchedule,
  createOrUpdateSamplingSchedule,
  receiveSamplesAndGenerateCodes,
  savePenyeliaAssignments,
  getAnalystOptions
};