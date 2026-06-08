const scheduleChangeService = require('../services/schedule/schedule-change.service');
class ScheduleChangeController {
    constructor(service) {
        this.scheduleChangeService = service;
    }
    getCurrentNik = (req) => {
        return req.user?.nik || req.user?.id || req.user?.id_user || null;
    };
    handleError = (res, error, fallbackMessage) => {
        console.error(fallbackMessage, error);
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message || fallbackMessage,
        });
    };
    confirmScheduleApproval = async (req, res) => {
        try {
            const data = await this.scheduleChangeService.confirmScheduleApproval({ ...(req.body || {}), idRegistrasi: req.params?.id }, this.getCurrentNik(req));
            return res.json({ success: true, message: 'Persetujuan jadwal berhasil disimpan.', data });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal menyimpan persetujuan jadwal.');
        }
    };
    createScheduleChangeRequest = async (req, res) => {
        try {
            const data = await this.scheduleChangeService.createScheduleChangeRequest(req.body || {}, this.getCurrentNik(req));
            return res.status(201).json({ success: true, message: 'Pengajuan perubahan jadwal berhasil dikirim.', data });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal mengirim pengajuan perubahan jadwal.');
        }
    };
    listScheduleChangeRequests = async (req, res) => {
        try {
            const data = await this.scheduleChangeService.listScheduleChangeRequests({
                status: req.query?.status,
                jenisJadwal: req.query?.jenisJadwal || req.query?.jenis_jadwal,
            });
            return res.json({ success: true, data });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memuat pengajuan perubahan jadwal.');
        }
    };
    decideScheduleChangeRequest = async (req, res) => {
        try {
            const data = await this.scheduleChangeService.decideScheduleChangeRequest(req.params?.idPengajuan || req.body?.idPengajuanJadwal || req.body?.id_pengajuan_jadwal, req.body || {}, this.getCurrentNik(req));
            return res.json({ success: true, message: 'Pengajuan perubahan jadwal berhasil diproses.', data });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal memproses pengajuan perubahan jadwal.');
        }
    };
    cancelScheduleChangeRequest = async (req, res) => {
        try {
            const data = await this.scheduleChangeService.cancelScheduleChangeRequest(req.params?.idPengajuan, this.getCurrentNik(req), req.user?.id_role);
            return res.json({ success: true, message: 'Pengajuan perubahan jadwal berhasil dibatalkan.', data });
        }
        catch (error) {
            return this.handleError(res, error, 'Gagal membatalkan pengajuan perubahan jadwal.');
        }
    };
}
module.exports = new ScheduleChangeController(scheduleChangeService);
module.exports.ScheduleChangeController = ScheduleChangeController;
