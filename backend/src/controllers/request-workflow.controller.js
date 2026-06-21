const RequestWorkflowService = require('../services/request/request-workflow.service');
const RequestService = require('../services/request/request.service');
const assignmentReadService = require('../services/assignment/assignment-read.service');
const { getHariLibur } = require('../utils/holiday-calendar.util');
const PaymentService = require('../services/payment/payment.service');
const assignmentSubkontrakService = require('../services/assignment/assignment-subkontrak.service');
const notificationService = require('../services/notification/notification.service');
const { successResponse, errorResponse } = require('../utils/response');
class RequestWorkflowController {
    constructor({ requestWorkflowService, requestService, assignmentReadService, paymentService, notificationService, assignmentSubkontrakService }) {
        this.requestWorkflowService = requestWorkflowService;
        this.requestService = requestService;
        this.assignmentReadService = assignmentReadService;
        this.paymentService = paymentService;
        this.notificationService = notificationService;
        this.assignmentSubkontrakService = assignmentSubkontrakService;
    }
    getScheduleHolidays = async (req, res) => {
        try {
            const data = await getHariLibur();
            return successResponse(res, 'Berhasil mengambil hari libur', data);
        }
        catch (error) {
            console.error('this.getScheduleHolidays error:', error.message);
            return errorResponse(res, error.message || 'Gagal mengambil data hari libur.');
        }
    };

    verifyRequest = async (req, res) => {
        try {
            const { id } = req.params;
            const { action, catatan, note, id_tarif_pengambilan } = req.body;
            const finalNote = catatan || note || null;
            const data = await this.requestWorkflowService.verifyRequest(id, action, finalNote, id_tarif_pengambilan, req.user?.nik || null);
            try {
                await this.notificationService.notifyRequestStatusChanged({
                    idRegistrasi: data?.id_registrasi || id,
                    statusTerbaru: data?.status,
                    catatanPetugas: data?.catatan_penolakan || finalNote || null,
                });
            }
            catch (notifyError) {
                console.error('notifyRequestStatusChanged this.verifyRequest error:', notifyError);
            }
            if (action === 'approve') {
                try {
                    await this.notificationService.notifyKasiMetodePerluDitentukan({
                        idRegistrasi: data?.id_registrasi || id,
                    });
                }
                catch (notifyError) {
                    console.error('notifyKasiMetodePerluDitentukan this.verifyRequest error:', notifyError);
                }
            }
            const msg = action === 'approve'
                ? 'Permohonan disetujui. Status diubah ke Menunggu Penentuan Metode.'
                : 'Permohonan ditolak.';
            return successResponse(res, msg, data);
        }
        catch (error) {
            console.error('this.verifyRequest error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    getKasiRequestDetail = async (req, res) => {
        try {
            const { id } = req.params;
            const data = await this.requestService.getKasiRequestDetail(id);
            return successResponse(res, 'Detail permohonan berserta parameter', data);
        }
        catch (error) {
            console.error('this.getKasiRequestDetail error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 404);
        }
    };
    assignMethods = async (req, res) => {
        try {
            const { id } = req.params;
            const { selections } = req.body;
            const data = await this.requestWorkflowService.assignMethods(id, selections, req.user.nik);
            try {
                await this.notificationService.notifyInvoiceReady({
                    idRegistrasi: data?.id_registrasi || id,
                });
            }
            catch (notifyError) {
                console.error('notifyInvoiceReady this.assignMethods error:', notifyError);
            }
            return successResponse(res, 'Metode berhasil ditentukan. Permohonan dilanjutkan ke pembayaran.', data);
        }
        catch (error) {
            console.error('this.assignMethods error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    rejectRequest = async (req, res) => {
        try {
            const { id } = req.params;
            const { alasan } = req.body;
            const data = await this.requestWorkflowService.rejectRequest(id, alasan, req.user?.nik || null);
            try {
                await this.notificationService.notifyRequestStatusChanged({
                    idRegistrasi: data?.id_registrasi || id,
                    statusTerbaru: data?.status,
                    catatanPetugas: data?.catatan_penolakan || alasan || null,
                });
            }
            catch (notifyError) {
                console.error('notifyRequestStatusChanged this.rejectRequest error:', notifyError);
            }
            return successResponse(res, 'Permohonan berhasil ditolak.');
        }
        catch (error) {
            console.error('this.rejectRequest error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    getAnalystOptions = async (req, res) => {
        try {
            const data = await this.assignmentReadService.getAnalystOptions();
            return successResponse(res, 'Berhasil mengambil daftar analis.', data);
        }
        catch (error) {
            console.error('this.getAnalystOptions error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 500);
        }
    };
    savePenyeliaAssignments = async (req, res) => {
        try {
            const { id } = req.params;
            const { assignments } = req.body;
            const data = await this.requestService.savePenyeliaAssignments(id, assignments, req.user.nik);
            return successResponse(res, 'Penugasan analis berhasil disimpan.', data);
        }
        catch (error) {
            console.error('this.savePenyeliaAssignments error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    markDeferredPayment = async (req, res) => {
        try {
            const { id } = req.params;
            const { note } = req.body;
            const data = await this.paymentService.markDeferredPaymentByAdmin(id, req.user.nik, note);
            try {
                await this.notificationService.notifyDeferredPaymentMarked({
                    idRegistrasi: data?.id_registrasi || id,
                    note,
                });
            }
            catch (notifyError) {
                console.error('notifyDeferredPaymentMarked this.markDeferredPayment error:', notifyError);
            }
            return successResponse(res, 'Bayar Nanti berhasil dicatat. Permohonan dilanjutkan ke tahap penerimaan atau pengambilan sampel.', data);
        }
        catch (error) {
            console.error('this.markDeferredPayment error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    saveSamplingSchedule = async (req, res) => {
        try {
            const { id } = req.params;
            const { tanggal_jadwal, jam_jadwal, scheduleDate, scheduleTime, tanggal, jam } = req.body;
            const data = await this.requestWorkflowService.saveSamplingSchedule(id, tanggal_jadwal || scheduleDate || tanggal, jam_jadwal || scheduleTime || jam);
            setImmediate(() => {
                this.notificationService.notifyJadwalSampel({
                    idRegistrasi: data?.id_registrasi || data?.idRegistrasi || id,
                    idJadwal: data?.jadwal?.id_jadwal || data?.jadwal?.idJadwal || null,
                }).catch((notifyError) => {
                    console.error('notifyJadwalSampel this.saveSamplingSchedule error:', notifyError);
                });
            });
            const msg = data.actionType === 'created'
                ? 'Jadwal sampling berhasil disetujui.'
                : 'Jadwal sampling berhasil diperbarui.';
            return successResponse(res, msg, data);
        }
        catch (error) {
            console.error('this.saveSamplingSchedule error:', error);
            return errorResponse(res, error.message || 'Terjadi kesalahan pada server.', 400);
        }
    };
    createOrUpdateSamplingSchedule = async (req, res) => {
        try {
            const { id } = req.params;
            const { tanggalPengambilan, jamPengambilan, idPegawaiPcc } = req.body;
            const result = await this.requestWorkflowService.createOrUpdateSamplingSchedule({
                idRegistrasi: id,
                tanggalPengambilan,
                jamPengambilan,
                idPegawaiPcc
            });
            setImmediate(() => {
                this.notificationService.notifyJadwalSampel({
                    idRegistrasi: result?.id_registrasi || result?.idRegistrasi || id,
                    idJadwal: result?.jadwal?.id_jadwal || result?.jadwal?.idJadwal || null,
                }).catch((notifyError) => {
                    console.error('notifyJadwalSampel this.createOrUpdateSamplingSchedule error:', notifyError);
                });
            });
            const message = result.jenis_pengambilan_sampel === 'Mandiri'
                ? 'Jadwal pengantaran mandiri berhasil disimpan.'
                : 'Jadwal pengambilan oleh petugas berhasil disimpan.';
            return successResponse(res, message, result);
        }
        catch (error) {
            console.error('Create/update sampling schedule error:', error.message);
            console.error('Stack trace:', error.stack);
            const code = error.message.includes('tidak ditemukan') ? 404 :
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
    receiveSamplesAndGenerateCodes = async (req, res) => {
        try {
            const { id } = req.params;
            const requestData = req.body || {};
            const sampels = Array.isArray(requestData) ? requestData : requestData.sampels;
            const receivedByNik = req.user?.nik;
            if (!receivedByNik) {
                return errorResponse(res, 'User NIK tidak ditemukan.', 401);
            }
            const result = await this.requestWorkflowService.receiveSamplesAndGenerateCodes(id, requestData, receivedByNik);
            setImmediate(() => {
                const idRegistrasi = result?.id_registrasi || result?.idRegistrasi || id;
                const samples = result?.sampels || result?.samples || [];
                Promise.allSettled([
                    this.notificationService.notifyRequestStatusChanged({
                        idRegistrasi,
                        statusTerbaru: result?.status,
                        catatanPetugas: null,
                    }),
                    this.notificationService.notifySamplesReceived({
                        idRegistrasi,
                        samples,
                    }),
                    this.notificationService.notifyPenyeliaPenugasanSampelMasuk({
                        idRegistrasi,
                        samples,
                    }),
                ]).then((results) => {
                    results.forEach((notifyResult, index) => {
                        if (notifyResult.status === 'rejected') {
                            const label = ['notifyRequestStatusChanged', 'notifySamplesReceived', 'notifyPenyeliaPenugasanSampelMasuk'][index];
                            console.error(`${label} this.receiveSamplesAndGenerateCodes error:`, notifyResult.reason);
                        }
                    });
                });
            });
            try {
                const receivedSampleNos = new Set((result?.sampels || result?.samples || [])
                    .map((sample) => sample?.no_sampel || sample?.noSampel)
                    .filter(Boolean));
                if (receivedSampleNos.size > 0) {
                    const pendingSubkontrakItems = await this.assignmentSubkontrakService.getSubkontrakItems();
                    const itemsToNotify = pendingSubkontrakItems.filter((item) => {
                        const noSampel = item.no_sampel || item.noSampel;
                        const statusHasil = item.status_hasil || item.statusHasil;
                        return receivedSampleNos.has(noSampel) && statusHasil === 'Belum Diisi';
                    });
                    if (itemsToNotify.length > 0) {
                        await this.notificationService.notifySubkontrakPerluDiisi(itemsToNotify);
                    }
                }
            }
            catch (notifyError) {
                console.error('notifySubkontrakPerluDiisi this.receiveSamplesAndGenerateCodes error:', notifyError);
            }
            return successResponse(res, 'Sampel berhasil diterima dan kode sampel berhasil digenerate.', result);
        }
        catch (error) {
            console.error('this.receiveSamplesAndGenerateCodes error:', error.message);
            return errorResponse(res, error.message || 'Internal server error.', 400);
        }
    };
}
module.exports = new RequestWorkflowController({
    requestWorkflowService: RequestWorkflowService,
    requestService: RequestService,
    assignmentReadService,
    paymentService: PaymentService,
    notificationService,
    assignmentSubkontrakService,
});
module.exports.RequestWorkflowController = RequestWorkflowController;
